<?php
/**
 * Validates query operator contexts and decodes BSON-aware Extended JSON filters.
 */
declare(strict_types=1);
namespace PhpMongo\Database;
use PhpMongo\Core\ApiException;
use MongoDB\BSON\Document;
/**
 * Validates query operator contexts and decodes BSON-aware Extended JSON filters.
 */
final class Filter
{
    private const COMPARISONS = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$exists', '$type', '$not'];
    /**
     * Decode an object-root Extended JSON filter after context-aware validation.
     * BSON type wrappers are distinguished from query operators. Executable
     * JavaScript and regular expressions cannot enter the read query.
     * @param string $json User-supplied filter, limited to 16 KiB.
     * @return \stdClass BSON-aware query document.
     * @throws ApiException If syntax, root type, nesting, or operators are invalid.
     */
    public static function parse(string $json): \stdClass
    {
        if (strlen($json) > 16384) {
            throw new ApiException('Filter exceeds 16 KiB.');
        }
        try {
            $root = json_decode($json, false, 32, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            throw new ApiException('Filter must be valid Extended JSON.');
        }
        if (!$root instanceof \stdClass) {
            throw new ApiException('Filter must have a JSON object root.');
        }
        self::query($root, 0);
        try {
            $decoded = Document::fromJSON($json)->toPHP(['root' => 'stdClass', 'document' => 'stdClass', 'array' => 'array']);
        } catch (\Throwable) {
            throw new ApiException('Filter contains an invalid Extended JSON value.');
        }
        if (!$decoded instanceof \stdClass) {
            throw new ApiException('Filter must be a query document.');
        }
        return $decoded;
    }
    private static function query(\stdClass $query, int $depth): void
    {
        self::depth($depth);
        foreach (get_object_vars($query) as $key => $value) {
            if (str_starts_with($key, '$')) {
                if (!in_array($key, ['$and', '$or', '$nor'], true)) {
                    throw new ApiException('Unsupported query operator.', 403);
                }
                if (!is_array($value) || $value === []) {
                    throw new ApiException('Logical operators require a nonempty array of query objects.');
                }
                foreach ($value as $child) {
                    if (!$child instanceof \stdClass) {
                        throw new ApiException('Logical clauses must be objects.');
                    }
                    self::query($child, $depth + 1);
                }
            } else {
                self::field($key);
                self::condition($value, $depth + 1);
            }
        }
    }
    private static function condition(mixed $value, int $depth): void
    {
        self::depth($depth);
        if (!$value instanceof \stdClass) {
            self::literal($value, $depth + 1);
            return;
        }
        $keys = array_keys(get_object_vars($value));
        $operators = array_filter($keys, static fn($key) => str_starts_with((string)$key, '$'));
        if ($operators === [] || self::isTyped($value)) {
            self::literal($value, $depth + 1);
            return;
        }
        foreach (get_object_vars($value) as $op => $operand) {
            if (!in_array($op, self::COMPARISONS, true)) {
                throw new ApiException('Unsupported query operator.', 403);
            }
            if ($op === '$not') {
                if (!$operand instanceof \stdClass || get_object_vars($operand) === []) {
                    throw new ApiException('$not requires an operator object.');
                }
                foreach (array_keys(get_object_vars($operand)) as $nested) {
                    if (!str_starts_with($nested, '$')) {
                        throw new ApiException('$not requires an operator object.');
                    }
                }
                self::condition($operand, $depth + 1);
            } else {
                if (in_array($op, ['$in', '$nin'], true) && !is_array($operand)) {
                    throw new ApiException('Membership operators require an array.');
                }
                if ($op === '$exists' && !is_bool($operand)) {
                    throw new ApiException('$exists requires a boolean.');
                }
                self::literal($operand, $depth + 1);
            }
        }
    }
    private static function literal(mixed $value, int $depth): void
    {
        self::depth($depth);
        if ($value instanceof \stdClass) {
            if (self::isTyped($value)) {
                return; // BSON parser verifies the wrapper's shape and payload.
            }
            foreach (get_object_vars($value) as $key => $child) {
                if (str_starts_with($key, '$')) {
                    throw new ApiException('Unsupported operator or Extended JSON type.', 403);
                }
                self::literal($child, $depth + 1);
            }
        } elseif (is_array($value)) {
            foreach ($value as $child) {
                self::literal($child, $depth + 1);
            }
        }
    }
    private static function isTyped(\stdClass $value): bool
    {
        $keys = array_keys(get_object_vars($value));
        if (count($keys) !== 1) {
            return false;
        }
        $key = $keys[0];
        return in_array($key, ['$oid', '$date', '$numberInt', '$numberLong', '$numberDouble', '$numberDecimal'], true);
    }
    /**
     * Validate a bounded dot-path without executable operator segments.
     * @param string $field Field path for filtering, sorting, or expansion.
     * @throws ApiException If the field path is invalid.
     */
    public static function field(string $field): void
    {
        if ($field === '' || strlen($field) > 128 || str_contains($field, "\0")) {
            throw new ApiException('Invalid field path.');
        }
        foreach (explode('.', $field) as $segment) {
            if ($segment === '' || str_starts_with($segment, '$')) {
                throw new ApiException('Invalid field path.');
            }
        }
    }
    private static function depth(int $depth): void
    {
        if ($depth > 24) {
            throw new ApiException('Filter nesting exceeds its limit.');
        }
    }
}
