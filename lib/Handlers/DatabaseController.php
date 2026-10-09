<?php
/**
 * Serves bounded document browsing and explicit authenticated collection creation.
 */
declare(strict_types=1);
namespace PawMongo\Handlers;
use PawMongo\Core\{ApiException, ConnectionHandler, Json};
use PawMongo\Database\{Filter, Projection, Query};
use MongoDB\BSON\Document;
use Psr\Http\Message\{ResponseInterface as Response, ServerRequestInterface as Request};
/**
 * Serves bounded document browsing and explicit authenticated collection creation.
 */
final class DatabaseController
{
    /**
     * Use a connection provider that requires an authenticated encrypted session.
     * @param ConnectionHandler $connection Active connection provider.
     */
    public function __construct(private readonly ConnectionHandler $connection) {}
    /**
     * Return a bounded database and collection hierarchy excluding system databases.
     * @param Request $request Authenticated request.
     * @param Response $response Response receiving the hierarchy.
     * @return Response JSON hierarchy response.
     * @throws ApiException If the connection is absent or hierarchy limits are exceeded.
     */
    public function structure(Request $request, Response $response): Response
    {
        $client = $this->connection->activeClient();
        $databases = [];
        $start = microtime(true);
        foreach ($client->listDatabases(['nameOnly' => true, 'maxTimeMS' => 5000]) as $database) {
            if (count($databases) >= 200 || microtime(true) - $start > 8) {
                throw new ApiException('Hierarchy is too large. Select a database directly or narrow the target.', 413);
            }
            $name = $database->getName();
            if (in_array($name, ['admin', 'local', 'config'], true)) {
                continue;
            }
            $collections = [];
            foreach ($client->selectDatabase($name)->listCollectionNames(['maxTimeMS' => 5000]) as $collection) {
                if (count($collections) >= 1000 || microtime(true) - $start > 8) {
                    throw new ApiException('Collection hierarchy exceeds its browsing limit.', 413);
                }
                $collections[] = $collection;
            }
            $databases[] = ['database' => $name, 'collections' => $collections];
        }
        return Json::response($response, ['databases' => $databases]);
    }
    /**
     * Fetch one page using a validated filter and database-side preview reduction.
     * @param Request $request Authenticated request with target, filter, sort, and page parameters.
     * @param Response $response Response receiving bounded preview records.
     * @return Response JSON response within the 1 MiB budget.
     * @throws ApiException If query validation, connection, or response limits fail.
     */
    public function preview(Request $request, Response $response): Response
    {
        // Resolve the active context before constructing a client; never default to localhost.
        $client = $this->connection->activeClient();
        $params = $request->getQueryParams();
        [$db, $collection] = Query::target($params);
        $page = Query::page($params);
        $size = (int)($params['page_size'] ?? 50);
        if (!in_array((string)($params['page_size'] ?? '50'), ['10', '25', '50', '100'], true)) throw new ApiException('Choose a page size of 10, 25, 50, or 100.');
        $filter = Filter::parse(Query::text($params, 'filter', '{}'));
        $sort = Query::sort($params);
        $pipeline = [
            ['$match' => $filter], ['$sort' => $sort], ['$skip' => ($page - 1) * $size], ['$limit' => $size],
            ...Projection::stages(),
        ];
        $documents = $this->execute($client->selectCollection($db, $collection), $pipeline);
        return Json::response($response, [
            'database' => $db, 'collection' => $collection, 'page' => $page, 'page_size' => $size,
            'count' => count($documents), 'documents' => $documents, 'max_page' => 200,
            'next_page' => count($documents) === $size && $page < 200 ? $page + 1 : null,
            'consistency' => 'Pages may shift when another application changes documents.',
        ], 200, 1048576);
    }
    /**
     * Fetch bounded detail for one typed identifier and optional field path.
     * @param Request $request Authenticated request with target and typed identifier.
     * @param Response $response Response receiving bounded detail.
     * @return Response JSON response within the 2 MiB budget.
     * @throws ApiException If parameters are invalid or the document is absent.
     */
    public function details(Request $request, Response $response): Response
    {
        $client = $this->connection->activeClient();
        $params = $request->getQueryParams();
        [$db, $collection] = Query::target($params);
        $id = Query::identifier($params);
        $field = $params['field'] ?? null;
        if ($field !== null) {
            if (!is_string($field)) {
                throw new ApiException('Field must be a string path.');
            }
            Filter::field($field);
            if (count(explode('.', $field)) > 12) {
                throw new ApiException('Field expansion path is too deep.');
            }
        }
        $pipeline = [['$match' => ['_id' => $id]], ['$limit' => 1], ...Projection::stages(true, $field)];
        $documents = $this->execute($client->selectCollection($db, $collection), $pipeline);
        if ($documents === []) {
            throw new ApiException('Document not found.', 404);
        }
        return Json::response($response, [
            'database' => $db, 'collection' => $collection, 'field' => $field,
            'document' => $documents[0], 'array_limit' => 20,
            'limits' => ['object_fields' => 20, 'string_characters' => 1024, 'expansion_depth' => 2],
        ], 200, 2097152);
    }
    /**
     * Create an empty ordinary collection without accepting arbitrary options.
     * @param array<string, mixed> $body Validated JSON request body.
     * @param Response $response Response receiving the acknowledged target.
     * @return Response HTTP 201 JSON response on successful collection creation.
     * @throws ApiException If validation, authorization, or creation fails.
     */
    public function createCollection(array $body, Response $response): Response
    {
        $client = $this->connection->activeClient();
        [$db, $name] = Query::creationTarget($body);
        $database = $client->selectDatabase($db);
        try {
            foreach ($database->listCollectionNames(['filter' => ['name' => $name], 'maxTimeMS' => 5000]) as $existing) {
                if ($existing === $name) throw new ApiException('A collection with this name already exists.', 409);
            }
            $database->createCollection($name, ['maxTimeMS' => 5000, 'writeConcern' => new \MongoDB\Driver\WriteConcern(1, 5000)]);
        } catch (\MongoDB\Driver\Exception\RuntimeException $error) {
            if ($error->getCode() === 13) {
                throw new ApiException('Your MongoDB account does not have permission to create collections in this database.', 403);
            }
            if ($error->getCode() === 48) {
                throw new ApiException('A collection with this name already exists.', 409);
            }
            throw new ApiException('Collection creation failed. Check database permissions and connectivity.', 500);
        }
        return Json::response($response, ['database' => $db, 'collection' => $name, 'created' => true], 201);
    }
    public function changeCollection(array $body, Response $response, bool $delete = false): Response
    {
        $client = $this->connection->activeClient();
        $target = $body;
        unset($target['name']);
        [$db, $name] = Query::creationTarget($target);
        if ($delete && isset($body['name'])) throw new ApiException('Only database and collection names are accepted.');
        $newName = null;
        if (!$delete) {
            [, $newName] = Query::creationTarget(['db' => $db, 'collection' => $body['name'] ?? null]);
            if ($newName === $name) throw new ApiException('Choose a different collection name.');
        }
        try {
            $exists = false;
            foreach ($client->selectDatabase($db)->listCollectionNames(['filter' => ['name' => $name], 'maxTimeMS' => 5000]) as $existing) {
                if ($existing === $name) $exists = true;
            }
            if (!$exists) throw new ApiException('Collection no longer exists.', 404);
            $collection = $client->selectCollection($db, $name);
            $options = ['maxTimeMS' => 5000, 'writeConcern' => new \MongoDB\Driver\WriteConcern(1, 5000)];
            if ($delete) $collection->drop($options);
            else $collection->rename($newName, null, $options + ['dropTarget' => false]);
        } catch (\MongoDB\Driver\Exception\RuntimeException $error) {
            throw new ApiException(match ($error->getCode()) {
                13 => 'Your MongoDB account does not have permission to change this collection.',
                48 => 'A collection with this name already exists.',
                26 => 'Collection no longer exists.',
                default => 'Collection operation failed. Check database permissions and connectivity.',
            }, match ($error->getCode()) { 13 => 403, 48 => 409, 26 => 404, default => 500 });
        }
        return Json::response($response, ['database' => $db, 'collection' => $newName ?? $name, 'deleted' => $delete]);
    }
    public function createDocument(array $body, Response $response): Response
    {
        $client = $this->connection->activeClient();
        $target = $body;
        unset($target['document']);
        [$db, $name] = Query::creationTarget($target);
        $json = $body['document'] ?? null;
        if (!is_string($json) || strlen($json) > 12000) throw new ApiException('Document must be a JSON object of at most 12 KB.');
        try {
            $decoded = json_decode($json, false, 32, JSON_THROW_ON_ERROR);
            if (!$decoded instanceof \stdClass) throw new \InvalidArgumentException();
            $document = Document::fromJSON($json)->toPHP(['root' => 'stdClass', 'document' => 'stdClass', 'array' => 'array']);
        } catch (\Throwable) {
            throw new ApiException('Use a valid JSON object with valid MongoDB value types.');
        }
        try {
            $exists = false;
            foreach ($client->selectDatabase($db)->listCollectionNames(['filter' => ['name' => $name], 'maxTimeMS' => 5000]) as $existing) {
                if ($existing === $name) $exists = true;
            }
            if (!$exists) throw new ApiException('Collection no longer exists.', 404);
            $client->selectCollection($db, $name)->insertOne($document, ['writeConcern' => new \MongoDB\Driver\WriteConcern(1, 5000)]);
        } catch (\MongoDB\Driver\Exception\RuntimeException $error) {
            throw new ApiException(match ($error->getCode()) {
                13 => 'Your MongoDB account does not have permission to create documents.',
                11000 => 'A document with this ID or another unique field already exists.',
                121 => 'This document does not match the collection validation rules.',
                default => 'Document creation failed. Check database permissions and connectivity.',
            }, match ($error->getCode()) { 13 => 403, 11000 => 409, 121 => 400, default => 500 });
        }
        return Json::response($response, ['created' => true], 201);
    }
    public function editableDocument(array $params, Response $response): Response
    {
        [$db, $name] = Query::creationTarget(array_intersect_key($params, array_flip(['db', 'collection'])));
        $collection = $this->connection->activeClient()->selectCollection($db, $name);
        $document = $collection->findOne(['_id' => Query::identifier($params)], ['maxTimeMS' => 5000, 'typeMap' => ['root' => 'stdClass', 'document' => 'stdClass']]);
        if ($document === null) throw new ApiException('Document no longer exists.', 404);
        unset($document->_id);
        $json = Document::fromPHP($document)->toCanonicalExtendedJSON();
        if (strlen($json) > 12000) throw new ApiException('This document is too large for the editor (12 KB limit).', 413);
        return Json::response($response, ['document' => $json]);
    }
    public function mutateDocument(array $body, Response $response, bool $delete = false): Response
    {
        if (array_diff(array_keys($body), ['db', 'collection', 'id', 'id_type', 'document', 'csrf_token'])) throw new ApiException('Unsupported document options.');
        [$db, $name] = Query::creationTarget(array_intersect_key($body, array_flip(['db', 'collection'])));
        $collection = $this->connection->activeClient()->selectCollection($db, $name);
        $id = Query::identifier($body);
        $fields = null;
        if (!$delete) {
            $json = $body['document'] ?? null;
            if (!is_string($json) || strlen($json) > 12000) throw new ApiException('Document fields must be JSON under 12 KB.');
            try {
                if (!json_decode($json, false, 32, JSON_THROW_ON_ERROR) instanceof \stdClass) throw new \InvalidArgumentException();
                $fields = Document::fromJSON($json)->toPHP(['root' => 'array', 'document' => 'stdClass', 'array' => 'array']);
            } catch (\Throwable) { throw new ApiException('Use a valid JSON object.'); }
            if ($fields === []) throw new ApiException('Enter at least one field to update.');
            foreach (array_keys($fields) as $field) {
                if ($field === '_id' || preg_match('/[.$\x00]/', (string)$field)) throw new ApiException('The ID is read-only. Field names cannot contain dots or dollar signs.');
            }
        }
        try {
            if ($delete) $result = $collection->deleteOne(['_id' => $id], ['writeConcern' => new \MongoDB\Driver\WriteConcern(1, 5000)]);
            else $result = $collection->updateOne(['_id' => $id], ['$set' => $fields], ['writeConcern' => new \MongoDB\Driver\WriteConcern(1, 5000)]);
            $count = $delete ? $result->getDeletedCount() : $result->getMatchedCount();
            if ($count === 0) throw new ApiException('Document no longer exists.', 404);
        } catch (\MongoDB\Driver\Exception\RuntimeException $error) {
            throw new ApiException(match ($error->getCode()) { 13 => 'Your MongoDB account does not have permission to change documents.', 11000 => 'A unique field already exists.', 121 => 'Document does not match collection validation rules.', default => 'Document operation failed.' }, match ($error->getCode()) { 13 => 403, 11000 => 409, 121 => 400, default => 500 });
        }
        return Json::response($response, ['saved' => !$delete, 'deleted' => $delete]);
    }
    private function execute(\MongoDB\Collection $collection, array $pipeline): array
    {
        $cursor = $collection->aggregate($pipeline, ['maxTimeMS' => 5000, 'batchSize' => 50, 'allowDiskUse' => false]);
        $result = [];
        foreach ($cursor as $document) {
            // Canonical EJSON preserves long integers for JavaScript clients.
            $json = Document::fromPHP($document)->toCanonicalExtendedJSON();
            $record = json_decode($json, false, 64, JSON_THROW_ON_ERROR);
            $count = $record->field_count ?? null;
            if ($count instanceof \stdClass && isset($count->{'$numberInt'})) {
                $record->field_count = (int)$count->{'$numberInt'};
            }
            $result[] = $record;
        }
        return $result;
    }
}
