<?php
/**
 * Builds application-owned MongoDB projections that bound data before transfer to PHP.
 */
declare(strict_types=1);
namespace PawMongo\Database;
/**
 * Builds application-owned MongoDB projections that bound data before transfer to PHP.
 */
final class Projection
{
    private static function bounded(string $value, int $depth, int $stringLimit): array
    {
        $branches = [
            ['case' => ['$eq' => [['$type' => $value], 'string']], 'then' => ['$substrCP' => [$value, 0, $stringLimit]]],
            ['case' => ['$eq' => [['$type' => $value], 'binData']], 'then' => ['$literal' => '[Binary omitted]']],
        ];
        $object = $depth === 0
            ? ['$literal' => '[Object Object]']
            : ['$arrayToObject' => ['$map' => [
                'input' => ['$slice' => [['$filter' => ['input' => ['$objectToArray' => $value], 'as' => 'pair' . $depth, 'cond' => ['$lte' => [['$strLenBytes' => '$$pair' . $depth . '.k'], 128]]]], 20]],
                'as' => 'pair' . $depth,
                'in' => ['k' => '$$pair' . $depth . '.k', 'v' => self::bounded('$$pair' . $depth . '.v', $depth - 1, $stringLimit)],
            ]]];
        $array = $depth === 0
            ? ['$concat' => ['[Array(', ['$toString' => ['$size' => $value]], ')]']]
            : ['$map' => ['input' => ['$slice' => [$value, 20]], 'as' => 'element' . $depth, 'in' => self::bounded('$$element' . $depth, $depth - 1, $stringLimit)]];
        $branches[] = ['case' => ['$eq' => [['$type' => $value], 'object']], 'then' => $object];
        $branches[] = ['case' => ['$eq' => [['$type' => $value], 'array']], 'then' => $array];
        $branches[] = ['case' => ['$in' => [['$type' => $value], ['javascript', 'javascriptWithScope', 'regex', 'dbPointer']]], 'then' => ['$literal' => '[Unsupported BSON value]']];
        return ['$switch' => ['branches' => $branches, 'default' => $value]];
    }
    /**
     * Generate bounded preview or detail projection stages.
     * The final BSON-size guard runs inside MongoDB before cursor transfer.
     * Optional field expansion follows object keys and numeric array indices.
     * @param bool $detail Whether to use bounded nested detail expansion.
     * @param string|null $field Validated optional field path within one document.
     * @return list<array<string, mixed>> Application-generated read-only pipeline stages.
     */
    public static function stages(bool $detail = false, ?string $field = null): array
    {
        $limit = $detail ? 1024 : 64;
        $depth = $detail ? 2 : 0;
        $input = '$$ROOT';
        if ($field !== null) {
            foreach (explode('.', $field) as $segment) {
                $branches = [
                    ['case' => ['$eq' => [['$type' => '$$node'], 'object']], 'then' => ['$getField' => ['field' => ['$literal' => $segment], 'input' => '$$node']]],
                ];
                if (ctype_digit($segment) && strlen($segment) <= 6) {
                    $branches[] = ['case' => ['$eq' => [['$type' => '$$node'], 'array']], 'then' => ['$arrayElemAt' => ['$$node', (int)$segment]]];
                }
                $input = ['$let' => ['vars' => ['node' => $input], 'in' => ['$switch' => ['branches' => $branches, 'default' => null]]]];
            }
        }
        // Wrap a requested field so scalar, array and object selections use the same contract.
        $source = $field === null ? '$$ROOT' : ['value' => ['$ifNull' => [$input, null]]];
        $entries = ['$map' => [
            'input' => ['$slice' => [['$filter' => ['input' => ['$objectToArray' => $source], 'as' => 'entry', 'cond' => ['$lte' => [['$strLenBytes' => '$$entry.k'], 128]]]], 20]],
            'as' => 'entry',
            'in' => [
                'name' => '$$entry.k',
                'type' => ['$type' => '$$entry.v'],
                'value' => self::bounded('$$entry.v', $depth, $limit),
                // Conservative: containers may contain omitted descendants.
                'truncated' => ['$switch' => ['branches' => [
                    ['case' => ['$eq' => [['$type' => '$$entry.v'], 'string']], 'then' => ['$gt' => [['$strLenCP' => '$$entry.v'], $limit]]],
                    ['case' => ['$in' => [['$type' => '$$entry.v'], ['array', 'object', 'binData', 'javascript', 'javascriptWithScope', 'regex', 'dbPointer']]], 'then' => true],
                ], 'default' => false]],
            ],
        ]];
        $idSafe = ['$lte' => [['$bsonSize' => ['value' => '$_id']], 512]];
        $size = $detail ? 131072 : 2048;
        return [
            ['$project' => [
                '_id' => 0,
                'identifier' => ['$cond' => [$idSafe, '$_id', null]],
                'identifier_omitted' => ['$not' => [$idSafe]],
                'fields' => $entries,
                'field_count' => ['$size' => ['$objectToArray' => $source]],
                'truncated' => ['$literal' => true],
            ]],
            // Bound BSON BEFORE cursor batches enter PHP, leaving room for EJSON/JSON expansion.
            ['$replaceWith' => ['$cond' => [
                ['$lte' => [['$bsonSize' => '$$ROOT'], $size]],
                '$$ROOT',
                ['identifier' => '$identifier', 'identifier_omitted' => '$identifier_omitted', 'fields' => [], 'field_count' => '$field_count', 'truncated' => true, 'size_limited' => true],
            ]]],
        ];
    }
}
