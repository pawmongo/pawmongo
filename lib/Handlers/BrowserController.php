<?php
declare(strict_types=1);
namespace PawMongo\Handlers;

use PawMongo\Core\{ApiException, Json, MongoJson};
use PawMongo\Database\BrowserStore as Store;
use Psr\Http\Message\{ServerRequestInterface as Request, ResponseInterface as Response};

/** Implements the theme's existing API contracts using the MongoDB PHP library. */
final class BrowserController
{
    public function __construct(private readonly Store $store) {}
    private function body(Request $request): \stdClass
    {
        $stream = $request->getBody();
        if (($stream->getSize() ?? 0) > 32 * 1024 * 1024) throw new ApiException('Request exceeds 32 MiB.', 413);
        $text = '';
        while (!$stream->eof() && strlen($text) <= 32 * 1024 * 1024) {
            $chunk = $stream->read(min(65536, 32 * 1024 * 1024 + 1 - strlen($text)));
            if ($chunk === '') break;
            $text .= $chunk;
        }
        if (strlen($text) > 32 * 1024 * 1024) throw new ApiException('Request exceeds 32 MiB.', 413);
        try { $body = json_decode($text, false, 512, JSON_THROW_ON_ERROR); }
        catch (\Throwable) { throw new ApiException('Request must contain a JSON object.'); }
        if (!$body instanceof \stdClass) throw new ApiException('Request must contain a JSON object.');
        return $body;
    }
    private function json(Response $response, array $data): Response
    {
        return Json::response($response, ['success' => true] + $data, 200, 64 * 1024 * 1024);
    }
    public function connection(Request $request, Response $response): Response
    {
        $method = $request->getMethod();
        if ($method !== 'DELETE') $this->store->client()->selectDatabase('admin')->command(['ping' => 1])->toArray();
        $connected = $method === 'POST' || ($method === 'GET' && ($request->getCookieParams()['pawmongo_disconnected'] ?? '') !== '1');
        if ($method !== 'GET') {
            $response = $response->withAddedHeader('Set-Cookie', 'pawmongo_disconnected=' . ($connected ? '0' : '1') . '; Path=/; HttpOnly; SameSite=Strict');
        }
        return $this->json($response, ['connected' => $connected]);
    }
    public function databases(Request $request, Response $response): Response
    {
        if ($request->getMethod() === 'GET') return $this->json($response, ['databases' => $this->store->databases()]);
        if ($request->getMethod() === 'DELETE') {
            $q = $request->getQueryParams();
            $db = $this->store->client()->selectDatabase(Store::databaseName($q['dbName'] ?? null));
            if (!empty($q['collName'])) $db->dropCollection(Store::collectionName($q['collName']));
            else $db->drop();
            return $this->json($response, []);
        }
        $b = $this->body($request);
        if (!in_array($b->action ?? null, ['createDatabase', 'createCollection'], true)) throw new ApiException('Unknown database action.');
        $name = Store::databaseName($b->dbName ?? null);
        $coll = Store::collectionName($b->collName ?? ($b->action === 'createDatabase' ? 'default' : ''));
        $options = [];
        $input = $b->options ?? new \stdClass();
        if (!$input instanceof \stdClass) throw new ApiException('Invalid collection options.');
        if (!empty($input->capped)) $options += ['capped' => true, 'size' => Store::integer($input->size ?? null, 1048576, 2147483647)];
        if (isset($input->collation)) $options['collation'] = Store::object($input->collation);
        if (isset($input->validator)) $options['validator'] = (object)Store::object($input->validator);
        $this->store->client()->selectDatabase($name)->createCollection($coll, $options);
        $matches = array_values(array_filter($this->store->databases(), fn($db) => $db['name'] === $name));
        return $this->json($response, ['database' => $matches[0]]);
    }
    public function documents(Request $request, Response $response, array $args): Response
    {
        $c = $this->store->collection($args['database'], $args['collection']);
        $q = $request->getQueryParams();
        switch ($request->getMethod()) {
            case 'GET':
                $filter = Store::object($q['query'] ?? null);
                $limit = Store::integer($q['limit'] ?? null, 50);
                if (!$limit) throw new ApiException('Limit must be greater than zero.');
                $options = ['sort' => Store::object($q['sort'] ?? null), 'projection' => Store::object($q['project'] ?? null),
                    'skip' => Store::integer($q['skip'] ?? null, 0, 10000000), 'limit' => $limit,
                    'maxTimeMS' => Store::integer($q['maxTimeMS'] ?? null, 10000, 60000) ?: 10000];
                if (($options['projection']['_id'] ?? null) === 0) throw new ApiException('Keep _id in projections to identify documents.');
                if (isset($q['collation'])) $options['collation'] = Store::object($q['collation']);
                return $this->json($response, ['documents' => array_map([Store::class, 'wire'], $c->find($filter, $options)->toArray()),
                    'totalCount' => $c->countDocuments($filter, ['maxTimeMS' => 10000])]);
            case 'POST':
                $b = $this->body($request);
                if (isset($b->documents) && is_array($b->documents)) {
                    if (!$b->documents || count($b->documents) > 1000) throw new ApiException('Insert between 1 and 1000 documents per batch.');
                    $docs = array_map([Store::class, 'document'], $b->documents);
                    try { $result = $c->insertMany($docs); }
                    catch (\MongoDB\Driver\Exception\BulkWriteException $error) {
                        $code = $error->getWriteResult()->getWriteErrors()[0]->getCode() ?? $error->getCode();
                        $status = $code === 11000 ? 409 : ($code === 121 ? 422 : ($code === 13 ? 403 : 500));
                        $message = $code === 11000 ? 'A record has a duplicate ID or unique index value.' : ($code === 121 ? 'A record does not satisfy the collection validation rules.' : 'Batch import failed. Check the file and database permissions.');
                        return Json::response($response, ['success' => false, 'error' => $message, 'insertedCount' => $error->getWriteResult()->getInsertedCount()], $status);
                    }
                    foreach ($result->getInsertedIds() as $i => $id) $docs[$i]['_id'] = $id;
                    return $this->json($response, ['documents' => array_map([Store::class, 'wire'], $docs), 'count' => count($docs)]);
                }
                $doc = Store::document($b->document ?? null);
                $result = $c->insertOne($doc);
                $doc['_id'] = $result->getInsertedId();
                return $this->json($response, ['document' => Store::wire($doc)]);
            case 'PUT':
                $b = $this->body($request);
                $filter = Store::selector($b->id ?? null);
                $doc = Store::document($b->document ?? null);
                $doc['_id'] = $filter['_id'];
                if (!$c->replaceOne($filter, $doc)->getMatchedCount()) throw new ApiException('Document not found.', 404);
                return $this->json($response, ['document' => Store::wire($doc)]);
            case 'PATCH':
                $b = $this->body($request);
                $update = Store::document($b->update ?? null);
                $allowed = ['$set', '$unset', '$inc', '$mul', '$min', '$max', '$rename', '$push', '$pull', '$addToSet', '$pop', '$currentDate'];
                if (!$update || array_diff(array_keys($update), $allowed)) throw new ApiException('Use MongoDB update operators.');
                $r = $c->updateMany(Store::object($b->query ?? null), $update);
                return $this->json($response, ['matchedCount' => $r->getMatchedCount(), 'modifiedCount' => $r->getModifiedCount()]);
            case 'DELETE':
                if (!empty($q['id'])) {
                    if (!$c->deleteOne(Store::selector($q['id']))->getDeletedCount()) throw new ApiException('Document not found.', 404);
                    return $this->json($response, []);
                }
                $b = $this->body($request);
                if (isset($b->ids) && is_array($b->ids)) {
                    if (!$b->ids) return $this->json($response, ['deletedCount' => 0]);
                    $filter = ['$or' => array_map([Store::class, 'selector'], $b->ids)];
                } elseif (isset($b->query) && is_string($b->query)) $filter = Store::object($b->query);
                else throw new ApiException('Provide ids or an explicit query.');
                return $this->json($response, ['deletedCount' => $c->deleteMany($filter)->getDeletedCount()]);
        }
        throw new ApiException('Method is not available.', 405);
    }
    public function indexes(Request $request, Response $response, array $args): Response
    {
        $db = $args['database']; $coll = $args['collection'];
        if ($request->getMethod() === 'GET') return $this->json($response, ['indexes' => $this->store->indexes($db, $coll)]);
        $c = $this->store->collection($db, $coll);
        if ($request->getMethod() === 'DELETE') {
            $name = $request->getQueryParams()['name'] ?? '';
            if (!is_string($name) || $name === '' || $name === '_id_') throw new ApiException('Choose a non-default index.');
            $c->dropIndex($name);
            return $this->json($response, []);
        }
        $b = $this->body($request);
        if (!isset($b->keys) || !$b->keys instanceof \stdClass || !(array)$b->keys) throw new ApiException('Provide valid index keys.');
        foreach ($b->keys as $v) if (!in_array($v, [1, -1, 'text', '2dsphere', 'hashed'], true)) throw new ApiException('Provide valid index keys.');
        $options = ['unique' => (bool)($b->unique ?? false), 'sparse' => (bool)($b->sparse ?? false), 'background' => (bool)($b->background ?? false)];
        if (!empty($b->name)) $options['name'] = $b->name;
        if (isset($b->ttlSeconds)) $options['expireAfterSeconds'] = Store::integer($b->ttlSeconds, 0, 2147483647);
        if (!empty($b->partialFilter)) $options['partialFilterExpression'] = Store::object($b->partialFilter);
        $name = $c->createIndex((array)$b->keys, $options);
        $items = array_values(array_filter($this->store->indexes($db, $coll), fn($i) => $i['name'] === $name));
        return $this->json($response, ['index' => $items[0]]);
    }
    public function columns(Request $request, Response $response, array $args): Response
    {
        $docs = $this->store->collection($args['database'], $args['collection'])->find([], ['limit' => 1000, 'maxTimeMS' => 10000])->toArray();
        $fields = [];
        $traverse = function ($obj, string $prefix = '', int $depth = 0) use (&$traverse, &$fields): void {
            if (!is_object($obj) || $depth > 4) return;
            foreach ($obj as $key => $value) {
                $field = $prefix === '' ? $key : "$prefix.$key";
                $type = is_array($value) ? 'Array' : ($value === null ? 'Null' : (is_object($value) ? 'Object' : (is_int($value) ? 'Int32' : (is_float($value) ? 'Double' : (is_bool($value) ? 'Boolean' : (is_string($value) && str_starts_with($value, 'oid:') ? 'ObjectId' : 'String'))))));
                if (!isset($fields[$field])) $fields[$field] = ['field' => $field, 'type' => $type, 'count' => 0];
                $fields[$field]['count']++;
                if (is_object($value)) $traverse($value, $field, $depth + 1);
            }
        };
        foreach ($docs as $doc) $traverse(Store::wire($doc));
        foreach ($fields as &$field) $field['presencePct'] = count($docs) ? round($field['count'] / count($docs) * 100) : 100;
        unset($field);
        $columns = array_values($fields);
        usort($columns, fn($a, $b) => $a['field'] === $b['field'] ? 0 : ($a['field'] === '_id' ? -1 : ($b['field'] === '_id' ? 1 : strcmp($a['field'], $b['field']))));
        return $this->json($response, ['database' => $args['database'], 'collection' => $args['collection'], 'columns' => $columns, 'totalColumns' => count($columns), 'totalDocuments' => count($docs)]);
    }
    private function pipeline(mixed $stages, int $depth = 0): array
    {
        if (!is_array($stages) || count($stages) > 50 || $depth > 20) throw new ApiException('Provide at most 50 pipeline stages.');
        $allowed = ['$match', '$project', '$group', '$sort', '$limit', '$skip', '$unwind', '$lookup', '$addFields', '$count', '$facet', '$set', '$unset', '$replaceRoot', '$replaceWith', '$sortByCount', '$bucket', '$bucketAuto'];
        foreach ($stages as $stage) {
            if (!$stage instanceof \stdClass || count((array)$stage) !== 1 || !in_array(array_key_first((array)$stage), $allowed, true)) throw new ApiException('Only read-only aggregation stages are allowed.');
            if (isset($stage->{'$facet'})) foreach ($stage->{'$facet'} as $nested) $this->pipeline($nested, $depth + 1);
            if (isset($stage->{'$lookup'}->pipeline)) $this->pipeline($stage->{'$lookup'}->pipeline, $depth + 1);
            if (isset($stage->{'$lookup'}->from)) Store::collectionName($stage->{'$lookup'}->from);
        }
        return array_map(fn($stage) => Store::object($stage), $stages);
    }
    public function tools(Request $request, Response $response, array $args): Response
    {
        $db = $this->store->client()->selectDatabase(Store::databaseName($args['database']));
        $coll = Store::collectionName($args['collection']);
        $c = $db->selectCollection($coll);
        if ($request->getMethod() === 'GET') {
            $entries = iterator_to_array($db->listCollections(['filter' => ['name' => $coll]]));
            if (!$entries) throw new ApiException('Collection not found.', 404);
            $options = $entries[0]->getOptions();
            return $this->json($response, ['validation' => ['validator' => $options['validator'] ?? new \stdClass(),
                'validationLevel' => $options['validationLevel'] ?? 'strict', 'validationAction' => $options['validationAction'] ?? 'error']]);
        }
        $b = $this->body($request);
        if (($b->action ?? '') === 'aggregate') {
            $pipeline = $this->pipeline(is_string($b->pipeline ?? null) ? MongoJson::parse($b->pipeline) : ($b->pipeline ?? null));
            $pipeline[] = ['$limit' => 1000];
            return $this->json($response, ['documents' => array_map([Store::class, 'wire'], $c->aggregate($pipeline, ['maxTimeMS' => 10000])->toArray())]);
        }
        if (($b->action ?? '') === 'explain') {
            $explain = $db->command(['explain' => ['find' => $coll, 'filter' => (object)Store::object($b->query ?? null), 'limit' => 1000, 'maxTimeMS' => 10000], 'verbosity' => 'executionStats'])->toArray()[0];
            return $this->json($response, ['explain' => $explain]);
        }
        if (($b->action ?? '') === 'validation') {
            if (!in_array($b->validationLevel ?? null, ['strict', 'moderate', 'off'], true) || !in_array($b->validationAction ?? null, ['error', 'warn'], true)) throw new ApiException('Invalid validation settings.');
            $db->command(['collMod' => $coll, 'validator' => (object)Store::object($b->validator ?? null),
                'validationLevel' => $b->validationLevel, 'validationAction' => $b->validationAction])->toArray();
            return $this->json($response, []);
        }
        throw new ApiException('Unknown collection tool.');
    }
    public function overview(Request $request, Response $response): Response
    {
        $key = str_ends_with($request->getUri()->getPath(), '/monitoring') ? 'monitoring' : 'overview';
        return $this->json($response, [$key => $this->store->overview()]);
    }
}
