<?php
/**
 * Validates database targets, typed identifiers, pagination, and deterministic sorting.
 */
declare(strict_types=1);
namespace PhpMongo\Database;
use PhpMongo\Core\ApiException;
use MongoDB\BSON\Document;
/**
 * Validates database targets, typed identifiers, pagination, and deterministic sorting.
 */
final class Query
{
    /**
     * Validate a database and collection and exclude system databases.
     * @param array<string, mixed> $params Query parameters.
     * @return array{0: string, 1: string} Validated database and collection names.
     * @throws ApiException If targets are invalid or forbidden.
     */
    public static function target(array $params): array
    {
        $db = self::text($params, 'db');
        $collection = self::text($params, 'collection');
        if (in_array($db, ['admin', 'local', 'config'], true)) {
            throw new ApiException('System database browsing is disabled.', 403);
        }
        if (strlen($db) > 63 || preg_match('~[\x00 /\\\\.\x22$]~', $db) || strlen($collection) > 120 || str_contains($collection, "\0") || str_starts_with($collection, '$')) {
            throw new ApiException('Invalid database or collection name.');
        }
        return [$db, $collection];
    }
    /**
     * Read a required bounded-context string parameter.
     * @param array<string, mixed> $params Query parameters.
     * @param string $key Parameter name.
     * @param string|null $default Optional default when the parameter is absent.
     * @return string Nonempty string value.
     * @throws ApiException If the value is absent or is not a string.
     */
    public static function text(array $params, string $key, ?string $default = null): string
    {
        $value = $params[$key] ?? $default;
        if (!is_string($value) || $value === '') {
            throw new ApiException('Missing or invalid parameter: ' . $key);
        }
        return $value;
    }
    /**
     * Validate a page number within the 200-page browsing ceiling.
     * @param array<string, mixed> $params Query parameters.
     * @return int Page between 1 and 200.
     * @throws ApiException If pagination is invalid.
     */
    public static function page(array $params): int
    {
        $page = self::text($params, 'page', '1');
        if (!preg_match('/^[1-9][0-9]{0,2}$/D', $page) || (int)$page > 200) {
            throw new ApiException('Page must be between 1 and 200. Refine your filter for deeper results.');
        }
        return (int)$page;
    }
    /**
     * Validate sort directions and append the unique identifier tie-breaker.
     * @param array<string, mixed> $params Query parameters.
     * @return array<string, int> MongoDB sort specification.
     * @throws ApiException If fields or directions are invalid.
     */
    public static function sort(array $params): array
    {
        $json = self::text($params, 'sort', '{}');
        if (strlen($json) > 2048) {
            throw new ApiException('Sort is too large.');
        }
        try {
            $sort = json_decode($json, false, 8, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            throw new ApiException('Sort must be a JSON object.');
        }
        if (!$sort instanceof \stdClass || count(get_object_vars($sort)) > 4) {
            throw new ApiException('Sort must be an object with at most four fields.');
        }
        $result = [];
        foreach (get_object_vars($sort) as $field => $direction) {
            Filter::field((string)$field);
            if ($direction !== 1 && $direction !== -1) {
                throw new ApiException('Sort directions must be 1 or -1.');
            }
            $result[$field] = $direction;
        }
        $result['_id'] ??= 1;
        return $result;
    }
    /**
     * Reconstruct an identifier without guessing its BSON type.
     * @param array<string, mixed> $params Parameters containing id and id_type.
     * @return mixed ObjectId, Int64, Int32-compatible integer, or string.
     * @throws ApiException If type, format, size, or numeric range is unsupported.
     */
    public static function identifier(array $params): mixed
    {
        $id = self::text($params, 'id');
        $type = self::text($params, 'id_type');
        if (strlen($id) > 1024) {
            throw new ApiException('Identifier exceeds its size limit.');
        }
        $wrapper = match ($type) {
            'ObjectId' => ['$oid' => $id],
            'Int32' => ['$numberInt' => $id],
            'Int64' => ['$numberLong' => $id],
            'String' => $id,
            default => throw new ApiException('Supported id_type values: ObjectId, Int32, Int64, String.'),
        };
        if (in_array($type, ['Int32', 'Int64'], true) && !preg_match('/^-?(?:0|[1-9][0-9]*)$/D', $id)) {
            throw new ApiException('Identifier must be a decimal integer.');
        }
        try {
            $doc = Document::fromJSON(json_encode(['_id' => $wrapper], JSON_THROW_ON_ERROR))->toPHP(['root' => 'array']);
            return $doc['_id'];
        } catch (\Throwable) {
            throw new ApiException('Invalid identifier for the specified BSON type.');
        }
    }
}
