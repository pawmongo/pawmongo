<?php
declare(strict_types=1);
namespace PawMongo\Handlers;
use PawMongo\Core\{ApiException, ConnectionHandler, Json};
use PawMongo\Database\{Filter, Projection, Query};
use MongoDB\BSON\Document;
use Psr\Http\Message\ResponseInterface as Response;

/** Collection tools use the existing authenticated connection and bounded query budgets. */
final class ExplorerController
{
    public function __construct(private readonly ConnectionHandler $connection) {}
    private function object(string $json, int $limit = 12000): object
    {
        if (strlen($json) > $limit) throw new ApiException('JSON exceeds its size limit.', 413);
        try {
            if (!json_decode($json, false, 32, JSON_THROW_ON_ERROR) instanceof \stdClass) throw new \InvalidArgumentException();
            return Document::fromJSON($json)->toPHP(['root' => 'stdClass', 'document' => 'stdClass', 'array' => 'array']);
        } catch (\Throwable) { throw new ApiException('Enter a valid MongoDB JSON object.'); }
    }
    private function plain(mixed $value): mixed
    {
        return json_decode(Document::fromPHP((object)['value' => $value])->toRelaxedExtendedJSON(), true, 64, JSON_THROW_ON_ERROR)['value'];
    }
    public function run(string $tool, array $params, Response $response, bool $write = false): Response
    {
        [$db, $name] = Query::target($params);
        if (str_starts_with($name, 'system.')) throw new ApiException('System collections cannot use these tools.', 403);
        $database = $this->connection->activeClient()->selectDatabase($db);
        $collection = $database->selectCollection($name);
        $options = ['maxTimeMS' => 5000];
        $filter = Filter::parse(Query::text($params, 'filter', '{}'));
        $result = [];
        try {
        switch ($tool) {
            case 'count':
                $result = ['total' => $collection->countDocuments($filter, $options)]; break;
            case 'explain':
                $result = $this->plain($database->command(['explain' => ['find' => $name, 'filter' => $filter, 'sort' => (object)Query::sort($params), 'limit' => 50], 'verbosity' => 'executionStats', 'maxTimeMS' => 5000])->toArray()[0]); break;
            case 'monitoring':
                $group = ['_id' => null];
                foreach (['count', 'size', 'storageSize', 'totalIndexSize'] as $key) $group[$key] = ['$sum' => '$storageStats.' . $key];
                $group['nindexes'] = ['$max' => '$storageStats.nindexes'];
                $stats = $collection->aggregate([['$collStats' => ['storageStats' => (object)[]]], ['$group' => $group]], $options)->toArray()[0];
                foreach (['count', 'size', 'storageSize', 'totalIndexSize', 'nindexes'] as $key) $result[$key] = (int)($stats[$key] ?? 0);
                $result['avgObjSize'] = $result['count'] ? $result['size'] / $result['count'] : 0;
                $result['sampled_at'] = gmdate('c'); break;
            case 'indexes':
                if ($write) {
                    $action = Query::text($params, 'action');
                    if ($action === 'delete') {
                        $index = Query::text($params, 'name');
                        if ($index === '_id_' || $index === '*' || strlen($index) > 128) throw new ApiException('Choose one non-ID index to delete.');
                        $collection->dropIndex($index, $options);
                    } elseif ($action === 'create') {
                        $keys = (array)$this->object(Query::text($params, 'keys'));
                        if (!$keys || count($keys) > 8) throw new ApiException('Choose 1–8 index fields.');
                        foreach ($keys as $field => $direction) {
                            Filter::field((string)$field);
                            if (!in_array($direction, [1, -1, 'text', 'hashed', '2dsphere'], true)) throw new ApiException('Invalid index direction or type.');
                        }
                        if (!is_bool($params['unique'] ?? false)) throw new ApiException('Unique must be a boolean.');
                        $collection->createIndex($keys, [...$options, 'unique' => $params['unique'] ?? false]);
                    } else throw new ApiException('Unknown index action.');
                }
                $indexes = [];
                foreach ($collection->listIndexes($options) as $index) {
                    if (count($indexes) >= 100) throw new ApiException('Too many indexes.', 413);
                    $indexes[] = ['name' => $index->getName(), 'keys' => $index->getKey(), 'unique' => $index->isUnique(), 'sparse' => $index->isSparse()];
                }
                $result = ['indexes' => $indexes]; break;
            case 'validation':
                if ($write) {
                    $level = Query::text($params, 'level', 'strict'); $action = Query::text($params, 'action', 'error');
                    if (!in_array($level, ['off', 'moderate', 'strict'], true) || !in_array($action, ['warn', 'error'], true)) throw new ApiException('Invalid validation settings.');
                    $validator = $this->object(Query::text($params, 'validator', '{}'));
                    $this->rejectCode($validator);
                    $database->command(['collMod' => $name, 'validator' => $validator, 'validationLevel' => $level, 'validationAction' => $action, 'maxTimeMS' => 5000])->toArray();
                }
                $info = iterator_to_array($database->listCollections(['filter' => ['name' => $name], ...$options]));
                if (!$info) throw new ApiException('Collection not found.', 404);
                $settings = $info[0]->getOptions();
                $result = ['validator' => $this->plain($settings['validator'] ?? (object)[]), 'level' => $settings['validationLevel'] ?? 'strict', 'action' => $settings['validationAction'] ?? 'error']; break;
            case 'schema':
                $pipeline = [['$match' => $filter], ['$limit' => 1000], ['$project' => ['fields' => ['$objectToArray' => '$$ROOT']]], ['$unwind' => '$fields'], ['$group' => ['_id' => ['name' => '$fields.k', 'type' => ['$type' => '$fields.v']], 'count' => ['$sum' => 1]]], ['$sort' => ['_id.name' => 1]], ['$limit' => 500]];
                $rows = [];
                foreach ($collection->aggregate($pipeline, [...$options, 'allowDiskUse' => false]) as $row) $rows[] = $this->plain($row);
                $result = ['fields' => $rows, 'sample_size' => min(1000, $collection->countDocuments($filter, $options)), 'sample_limit' => 1000]; break;
            case 'visualize':
                $field = Query::text($params, 'field'); Filter::field($field);
                $rows = [];
                $pipeline = [['$match' => $filter], ['$limit' => 10000], ['$group' => ['_id' => '$' . $field, 'count' => ['$sum' => 1]]], ['$sort' => ['count' => -1]], ['$limit' => 20], ['$project' => ['_id' => ['$substrCP' => [['$convert' => ['input' => '$_id', 'to' => 'string', 'onError' => '(object/array)', 'onNull' => '(missing/null)']], 0, 80]], 'count' => 1]]];
                foreach ($collection->aggregate($pipeline, [...$options, 'allowDiskUse' => false]) as $row) $rows[] = $this->plain($row);
                $result = ['rows' => $rows, 'sample_limit' => 10000]; break;
            case 'aggregate':
                $raw = Query::text($params, 'pipeline', '[]');
                if (strlen($raw) > 12000) throw new ApiException('Pipeline exceeds 12 KB.', 413);
                try { $pipeline = json_decode($raw, false, 32, JSON_THROW_ON_ERROR); } catch (\Throwable) { throw new ApiException('Pipeline must be a JSON array.'); }
                if (!is_array($pipeline) || count($pipeline) > 20) throw new ApiException('Use a pipeline of up to 20 stages.');
                // Only collection-local, non-writing stages; server-side JavaScript is excluded recursively.
                $allowed = ['$match', '$project', '$set', '$addFields', '$unset', '$group', '$sort', '$limit', '$skip', '$unwind', '$count', '$replaceRoot', '$replaceWith', '$sortByCount', '$bucket', '$bucketAuto'];
                foreach ($pipeline as $stage) {
                    if (!$stage instanceof \stdClass || count(get_object_vars($stage)) !== 1 || !in_array(array_key_first(get_object_vars($stage)), $allowed, true)) throw new ApiException('Use collection-local aggregation stages. Writing and cross-collection stages are disabled.');
                    $this->rejectCode($stage);
                }
                try { $pipeline = Document::fromJSON('{"pipeline":' . $raw . '}')->toPHP(['root' => 'array', 'document' => 'stdClass', 'array' => 'array'])['pipeline']; } catch (\Throwable) { throw new ApiException('Pipeline contains invalid Extended JSON.'); }
                $documents = [];
                foreach ($collection->aggregate([...$pipeline, ['$limit' => 50], ...Projection::stages(true)], [...$options, 'allowDiskUse' => false, 'batchSize' => 50]) as $row) $documents[] = json_decode(Document::fromPHP($row)->toCanonicalExtendedJSON(), true);
                $result = ['documents' => $documents, 'limit' => 50]; break;
            case 'import':
                if (!$write) throw new ApiException('Use POST to import.', 405);
                $raw = Query::text($params, 'documents');
                if (strlen($raw) > 32 * 1024 * 1024) throw new ApiException('Import batch exceeds 32 MB.', 413);
                try { $values = json_decode($raw, false, 32, JSON_THROW_ON_ERROR); } catch (\Throwable) { throw new ApiException('Import must be a JSON array of documents.'); }
                if (!is_array($values) || count($values) < 1 || count($values) > 100) throw new ApiException('Import 1–100 documents at a time.');
                $documents = [];
                foreach ($values as $value) {
                    if (!$value instanceof \stdClass) throw new ApiException('Each imported document must be an object.');
                    $document = $this->object(json_encode($value, JSON_THROW_ON_ERROR), 32 * 1024 * 1024);
                    $bsonSize = strlen((string)Document::fromPHP($document)) + (property_exists($document, '_id') ? 0 : 17);
                    if ($bsonSize > 16 * 1024 * 1024) throw new ApiException('One document exceeds MongoDB’s 16 MB BSON size limit.', 413);
                    $documents[] = $document;
                }
                if (!is_bool($params['create_collection'] ?? false)) throw new ApiException('Create collection must be a boolean.');
                if (($params['create_collection'] ?? false) === true) {
                    Query::creationTarget(['db' => $db, 'collection' => $name]);
                    foreach ($database->listCollectionNames(['filter' => ['name' => $name], ...$options]) as $existing) {
                        if ($existing === $name) throw new ApiException('A collection with this name already exists. Choose a new name.', 409);
                    }
                    try { $database->createCollection($name, [...$options, 'writeConcern' => new \MongoDB\Driver\WriteConcern(1, 5000)]); }
                    catch (\MongoDB\Driver\Exception\RuntimeException $error) {
                        if ($error->getCode() === 48) throw new ApiException('A collection with this name already exists. Choose a new name.', 409);
                        throw $error;
                    }
                }
                try { $inserted = $collection->insertMany($documents, ['ordered' => true, 'writeConcern' => new \MongoDB\Driver\WriteConcern(1, 5000)]); }
                catch (\MongoDB\Driver\Exception\BulkWriteException $error) {
                    throw new ApiException('Import stopped after ' . $error->getWriteResult()->getInsertedCount() . ' inserted documents. Check duplicate IDs, validation rules, and permissions.', 409);
                }
                $result = ['inserted' => $inserted->getInsertedCount()]; break;
            case 'bulk':
                if (!$write || ($params['confirmed'] ?? false) !== true) throw new ApiException('Confirm the bulk operation.', 400);
                $action = Query::text($params, 'action');
                $count = $collection->countDocuments($filter, $options);
                if ($count > 1000) throw new ApiException('Bulk operations support up to 1,000 matches. Refine your filter.', 413);
                $ids = [];
                $idSize = ['$bsonSize' => ['id' => '$_id']];
                $idPipeline = [['$match' => $filter], ['$limit' => 1001], ['$project' => ['_id' => 0, 'id' => ['$cond' => [['$lte' => [$idSize, 2048]], '$_id', null]], 'too_large' => ['$gt' => [$idSize, 2048]]]]];
                foreach ($collection->aggregate($idPipeline, $options) as $row) {
                    if ($row['too_large']) throw new ApiException('A matched document has an oversized ID. Refine the filter.', 413);
                    $ids[] = $row['id'];
                }
                if (count($ids) > 1000) throw new ApiException('The result changed. Refine your filter.', 409);
                $writeOptions = ['writeConcern' => new \MongoDB\Driver\WriteConcern(1, 5000)];
                if ($action === 'delete') $result = ['deleted' => $collection->deleteMany(['_id' => ['$in' => $ids]], $writeOptions)->getDeletedCount()];
                elseif ($action === 'update') {
                    $fields = (array)$this->object(Query::text($params, 'document'));
                    if (!$fields) throw new ApiException('Enter fields to update.');
                    foreach (array_keys($fields) as $field) if ($field === '_id' || preg_match('/[.$\x00]/', (string)$field)) throw new ApiException('Use ordinary field names; the ID cannot be changed.');
                    $result = ['modified' => $collection->updateMany(['_id' => ['$in' => $ids]], ['$set' => $fields], $writeOptions)->getModifiedCount()];
                } else throw new ApiException('Unknown bulk action.');
                break;
            default: throw new ApiException('Unknown collection tool.', 404);
        }
        } catch (\MongoDB\Driver\Exception\RuntimeException $error) {
            throw new ApiException(match ($error->getCode()) {
                13 => 'Your MongoDB account does not have permission to use this tool.',
                11000 => 'A unique field already exists. Check duplicate values.',
                121 => 'Documents do not match collection validation rules.',
                50 => 'The operation exceeded its five-second time limit. Refine the query.',
                26 => 'Collection not found.',
                default => 'Collection tool failed. Check the JSON, server compatibility, and database permissions.',
            }, match ($error->getCode()) { 13 => 403, 11000 => 409, 121 => 400, 50 => 408, 26 => 404, default => 400 });
        }
        return Json::response($response, $result);
    }
    private function rejectCode(mixed $value): void
    {
        if (!is_object($value) && !is_array($value)) return;
        foreach ($value as $key => $child) {
            if (in_array($key, ['$where', '$function', '$accumulator'], true)) throw new ApiException('Server-side JavaScript is disabled.');
            $this->rejectCode($child);
        }
    }
}
