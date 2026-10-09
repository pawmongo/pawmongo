<?php
declare(strict_types=1);
namespace PawMongo\Database;

use MongoDB\{Client, Collection};
use MongoDB\BSON\{Document, ObjectId};
use PawMongo\Core\{ApiException, ConnectionHandler, MongoJson, Session};

/** MongoDB operations for the CSR theme; credentials stay in PHP. */
final class BrowserStore
{
    private ?Client $client = null;
    public function __construct(private readonly string $root) {}
    public function client(): Client
    {
        if ($this->client) return $this->client;
        $uri = getenv('MONGODB_URI');
        if ($uri) {
            $this->client = new Client($uri, ['serverSelectionTimeoutMS' => 5000, 'connectTimeoutMS' => 5000, 'socketTimeoutMS' => 15000],
                ['disableClientPersistence' => true, 'typeMap' => ['root' => 'array', 'document' => 'stdClass', 'array' => 'array']]);
        } else {
            $path = getenv('PAWMONGO_CONFIG') ?: getenv('PAWMONGO_CONFIG_PATH') ?: $this->root . '/config/pawmongo-config.php';
            try {
                if (!is_file($path)) throw new ApiException('Missing saved connection.', 503);
                $config = (static fn($file) => require $file)($path);
                $this->client = (new ConnectionHandler($config, new Session()))->savedClient();
            } catch (\Throwable) {
                throw new ApiException('Configure a server-side MONGODB_URI or a verified saved connection.', 503);
            }
        }
        return $this->client;
    }
    public static function databaseName(mixed $name): string
    {
        if (!is_string($name) || $name === '' || strlen($name) > 63 || preg_match('~[\s/\\\\.\x00"$*<>:|?]~', $name)) throw new ApiException('Invalid database name.');
        if (in_array($name, ['admin', 'local', 'config'], true)) throw new ApiException('System databases are protected.', 403);
        return $name;
    }
    public static function collectionName(mixed $name): string
    {
        if (!is_string($name) || $name === '' || strlen($name) > 200 || preg_match('/[\x00$]/', $name)) throw new ApiException('Invalid collection name.');
        if (str_starts_with($name, 'system.')) throw new ApiException('System collections are protected.', 403);
        return $name;
    }
    public function collection(string $db, string $coll): Collection
    {
        return $this->client()->selectCollection(self::databaseName($db), self::collectionName($coll));
    }
    public static function object(mixed $value = null): array
    {
        $parsed = is_string($value) ? MongoJson::parse(trim($value) ?: '{}') : ($value ?? new \stdClass());
        if (!$parsed instanceof \stdClass) throw new ApiException('Expected a JSON object.');
        try {
            return Document::fromJSON(json_encode($parsed, JSON_THROW_ON_ERROR))->toPHP(['root' => 'array', 'document' => 'stdClass', 'array' => 'array']);
        } catch (\Throwable) { throw new ApiException('Invalid MongoDB JSON value.'); }
    }
    public static function document(mixed $value): array
    {
        if (!$value instanceof \stdClass) throw new ApiException('Document must be a JSON object.');
        try {
            $bson = Document::fromJSON(json_encode($value, JSON_THROW_ON_ERROR));
            if (strlen((string)$bson) > 16 * 1024 * 1024) throw new ApiException('Document exceeds the 16 MiB BSON limit.', 413);
            return $bson->toPHP(['root' => 'array', 'document' => 'stdClass', 'array' => 'array']);
        } catch (ApiException $error) { throw $error; }
        catch (\Throwable) { throw new ApiException('Invalid BSON document.'); }
    }
    public static function integer(mixed $value, int $default, int $max = 1000): int
    {
        if ($value === null || $value === '') return $default;
        if (!is_scalar($value) || filter_var($value, FILTER_VALIDATE_INT) === false || (int)$value < 0 || (int)$value > $max) throw new ApiException("Enter an integer between 0 and $max.");
        return (int)$value;
    }
    public static function selector(mixed $id): array
    {
        if (!is_string($id) || $id === '') throw new ApiException('Document id is required.');
        try {
            $value = str_starts_with($id, 'oid:') ? new ObjectId(substr($id, 4))
                : (str_starts_with($id, 'str:') ? substr($id, 4)
                : (str_starts_with($id, 'ejson:') ? self::object('{"id":' . substr($id, 6) . '}')['id'] : $id));
            return ['_id' => $value];
        } catch (ApiException $error) { throw $error; }
        catch (\Throwable) { throw new ApiException('Invalid document id.'); }
    }
    public static function wire(array|object $doc): \stdClass
    {
        $values = (array)$doc;
        $wire = json_decode(Document::fromPHP($values)->toRelaxedExtendedJSON(), false, 512, JSON_THROW_ON_ERROR);
        if (array_key_exists('_id', $values)) {
            $id = $values['_id'];
            $canonical = json_decode(Document::fromPHP(['id' => $id])->toCanonicalExtendedJSON());
            $wire->_id = is_string($id) ? 'str:' . $id : ($id instanceof ObjectId ? 'oid:' . (string)$id : 'ejson:' . json_encode($canonical->id, JSON_THROW_ON_ERROR));
        }
        return $wire;
    }
    public function databases(): array
    {
        $result = [];
        foreach ($this->client()->listDatabases(['nameOnly' => true, 'authorizedDatabases' => true]) as $info) {
            $name = $info->getName();
            if (in_array($name, ['admin', 'local', 'config'], true)) continue;
            $db = $this->client()->selectDatabase($name);
            $collections = [];
            foreach ($db->listCollections(['nameOnly' => true]) as $coll) {
                if (str_starts_with($coll->getName(), 'system.')) continue;
                $stats = $db->command(['collStats' => $coll->getName()])->toArray()[0];
                $collections[] = ['name' => $coll->getName(), 'count' => $stats['count'] ?? 0, 'sizeBytes' => $stats['storageSize'] ?? 0,
                    'avgObjSize' => $stats['avgObjSize'] ?? 0, 'indexes' => $stats['nindexes'] ?? 0, 'indexSizeBytes' => $stats['totalIndexSize'] ?? 0];
            }
            $result[] = ['name' => $name, 'collections' => $collections];
        }
        return $result;
    }
    public function indexes(string $db, string $coll): array
    {
        $c = $this->collection($db, $coll);
        $stats = $c->aggregate([['$collStats' => ['storageStats' => new \stdClass()]]])->toArray()[0];
        try { $usage = $c->aggregate([['$indexStats' => new \stdClass()]])->toArray(); }
        catch (\Throwable $error) { if ($error->getCode() !== 13) throw $error; $usage = null; }
        $sizes = (array)(((array)($stats['storageStats'] ?? []))['indexSizes'] ?? []);
        $result = [];
        foreach ($c->listIndexes() as $info) {
            $i = $info;
            $ops = null;
            if ($usage !== null) {
                $ops = 0;
                foreach ($usage as $u) if ($u['name'] === $i['name']) $ops = (int)((array)$u['accesses'])['ops'];
            }
            $item = ['name' => $i['name'], 'keys' => (object)$i['key'], 'unique' => ($i['unique'] ?? false) || $i['name'] === '_id_',
                'fields' => array_values(array_unique([...array_keys($i['key']), ...array_keys((array)($i['weights'] ?? []))])),
                'sparse' => $i['sparse'] ?? false, 'background' => $i['background'] ?? false,
                'size' => round(($sizes[$i['name']] ?? 0) / 1024) . ' KB', 'usage' => $ops];
            if (isset($i['expireAfterSeconds'])) $item['ttlSeconds'] = $i['expireAfterSeconds'];
            if (isset($i['partialFilterExpression'])) $item['partialFilter'] = json_encode($i['partialFilterExpression'], JSON_THROW_ON_ERROR);
            $result[] = $item;
        }
        return $result;
    }
    private function command(string $name, bool $optional = false): ?array
    {
        try { return $this->client()->selectDatabase('admin')->command([$name => 1])->toArray()[0]; }
        catch (\Throwable $error) { if ($optional && $error->getCode() === 13) return null; throw $error; }
    }
    public function overview(): array
    {
        $status = $this->command('serverStatus', true);
        $build = $this->command('buildInfo');
        $hello = $this->command('hello');
        $dbs = $this->databases();
        $storage = null;
        if ($dbs) {
            try { $storage = $this->client()->selectDatabase($dbs[0]['name'])->command(['dbStats' => 1])->toArray()[0]; }
            catch (\Throwable) {}
        }
        $mem = (array)($status['mem'] ?? []);
        return ['version' => $build['version'], 'edition' => in_array('enterprise', $build['modules'] ?? [], true) ? 'Enterprise' : 'Community',
            'uptimeSeconds' => $status['uptime'] ?? null, 'host' => $status['host'] ?? null, 'primary' => $hello['isWritablePrimary'],
            'connections' => $status['connections'] ?? null, 'memory' => $mem ? ['residentMB' => $mem['resident'], 'virtualMB' => $mem['virtual']] : null,
            'network' => $status['network'] ?? null, 'opcounters' => $status['opcounters'] ?? null, 'cache' => ((array)($status['wiredTiger'] ?? []))['cache'] ?? null,
            'storage' => ($storage['fsTotalSize'] ?? 0) ? ['totalBytes' => $storage['fsTotalSize'], 'freeBytes' => $storage['fsTotalSize'] - $storage['fsUsedSize']] : null,
            'metricsAvailable' => $status !== null, 'sampledAt' => (int)round(microtime(true) * 1000)];
    }
}
