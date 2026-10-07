<?php
declare(strict_types=1);
require dirname(__DIR__) . '/vendor/autoload.php';
use PhpMongo\Core\{AccessBoundary, ApiException, Config, ConnectionHandler, Session, UiConfig};
use PhpMongo\Database\{Filter, Query};
$checks = 0;
function check(bool $condition, string $message): void {
    global $checks;
    if (!$condition) { throw new RuntimeException($message); }
    $checks++;
}
function rejects(callable $run, int $status, string $message): void {
    try { $run(); } catch (ApiException $error) { check($error->status === $status, $message . ' status'); return; }
    throw new RuntimeException($message . ' was accepted');
}
function port(): int {
    $socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
    if (!$socket) { throw new RuntimeException('Cannot allocate test port'); }
    $name = stream_socket_get_name($socket, false); fclose($socket);
    return (int)substr($name, strrpos($name, ':') + 1);
}
function request(string $base, string $path, string $method = 'GET', ?array $body = null, ?string $token = null): array {
    global $cookie;
    $ch = curl_init($base . $path);
    $headers = ['Content-Type: application/json'];
    if ($token !== null) { $headers[] = 'X-CSRF-Token: ' . $token; }
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HEADER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers]);
    if ($cookie) { curl_setopt($ch, CURLOPT_COOKIE, $cookie); }
    if ($body !== null) { curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_THROW_ON_ERROR)); }
    $raw = curl_exec($ch);
    if ($raw === false) { throw new RuntimeException('HTTP request failed: ' . curl_error($ch)); }
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $size = curl_getinfo($ch, CURLINFO_HEADER_SIZE); curl_close($ch);
    $header = substr($raw, 0, $size); $text = substr($raw, $size);
    if (preg_match('/Set-Cookie: (phpmongo_session=[^;\r\n]*)/i', $header, $match)) { $cookie = $match[1]; }
    return [$status, json_decode($text, true), $text, $header];
}
function dataPath(string $endpoint, array $params): string { return $endpoint . '?' . http_build_query($params); }
function removeTree(string $path): void {
    if (!is_dir($path)) { return; }
    foreach (new FilesystemIterator($path) as $file) {
        if ($file->isDir() && !$file->isLink()) { removeTree($file->getPathname()); } else { unlink($file->getPathname()); }
    }
    rmdir($path);
}
$temp = sys_get_temp_dir() . '/phpmongo-test-' . bin2hex(random_bytes(6));
mkdir($temp, 0700);
$processes = [];
$cookie = '';
$root = dirname(__DIR__);
$mongo = null;
try {
    $setupPath = $temp . '/first-run.php';
    check(Config::setupSettings($setupPath, $root)['security']['force_local_boundary'] === true, 'missing config offers local-only setup');
    rejects(fn() => Config::initialize($setupPath, $root, 'short'), 400, 'short setup password');
    rejects(fn() => Config::initialize($setupPath, $root, 'éééééé'), 400, 'setup counts characters rather than UTF-8 bytes');
    Config::initialize($setupPath, $root, 'new-first-run-password');
    check(Config::setupSettings($setupPath, $root) === null, 'setup closes after initialization');
    $saved = require $setupPath;
    check($saved['security']['master_password'] === '' && password_verify('new-first-run-password', $saved['security']['master_password_hash']), 'setup stores hash only');
    check(strlen($saved['security']['encryption_key']) === 64, 'setup generates 256-bit key');
    rejects(fn() => Config::initialize($setupPath, $root, 'replacement-password'), 409, 'completed setup cannot overwrite credentials');
    check(password_verify('new-first-run-password', (require $setupPath)['security']['master_password_hash']), 'original setup password retained');
    $brokenSetup = $temp . '/broken-setup.php'; file_put_contents($brokenSetup, '<?php broken code');
    rejects(fn() => Config::setupSettings($brokenSetup, $root), 503, 'corrupt config cannot enable setup');
    rejects(fn() => Config::initialize($temp . '/missing/config.php', $root, 'long-enough-password'), 503, 'setup fails on missing directory');
    $configPath = $temp . '/config.php';
    file_put_contents($configPath, '<?php return ' . var_export(['security' => ['master_password' => 'test-master-password', 'master_password_hash' => '', 'encryption_key' => '', 'force_local_boundary' => true]], true) . ';');
    $config = Config::load($configPath, $root);
    check(strlen($config['security']['encryption_key']) === 64, '256-bit generated key');
    check(password_verify('test-master-password', $config['security']['master_password_hash']), 'password converted');
    check(!str_contains(file_get_contents($configPath), 'test-master-password'), 'plaintext removed from config');
    check(Config::load($configPath, $root)['security']['encryption_key'] === $config['security']['encryption_key'], 'key stable across boot');
    $badConfig = $temp . '/bad.php'; file_put_contents($badConfig, '<?php ! invalid');
    rejects(fn() => Config::load($badConfig, $root), 503, 'corrupt config blocks');
    rejects(fn() => Config::load($temp . '/missing.php', $root), 503, 'missing config blocks');
    AccessBoundary::enforce($config, ['REMOTE_ADDR' => '127.0.0.1', 'HTTP_HOST' => 'localhost:8080']);
    AccessBoundary::enforce($config, ['REMOTE_ADDR' => '::1', 'HTTP_HOST' => '[::1]:8080']);
    rejects(fn() => AccessBoundary::enforce($config, ['REMOTE_ADDR' => '192.0.2.1', 'HTTP_HOST' => 'localhost', 'HTTP_X_FORWARDED_FOR' => '127.0.0.1']), 403, 'remote peer denied despite forwarded header');
    rejects(fn() => AccessBoundary::enforce($config, ['REMOTE_ADDR' => '127.0.0.1', 'HTTP_HOST' => 'attacker.example']), 403, 'DNS rebinding host denied');
    $remoteConfig = $config; $remoteConfig['security']['force_local_boundary'] = false;
    rejects(fn() => AccessBoundary::enforce($remoteConfig, ['REMOTE_ADDR' => '192.0.2.1', 'HTTP_HOST' => 'example.com', 'HTTP_X_FORWARDED_PROTO' => 'https']), 403, 'remote plaintext and spoofed proxy HTTPS denied');
    AccessBoundary::enforce($remoteConfig, ['REMOTE_ADDR' => '192.0.2.1', 'HTTP_HOST' => 'example.com', 'HTTPS' => 'on']);
    mkdir($temp . '/readonly', 0700);
    $immutable = $temp . '/readonly/config.php';
    $readonlyConfig = ['security' => ['master_password' => 'immutable-password', 'master_password_hash' => '', 'encryption_key' => $config['security']['encryption_key'], 'force_local_boundary' => true]];
    $original = '<?php return ' . var_export($readonlyConfig, true) . ';';
    file_put_contents($immutable, $original); chmod($immutable, 0400); chmod($temp . '/readonly', 0500);
    $fallback = Config::load($immutable, $root);
    check($fallback['warnings'] !== [] && file_get_contents($immutable) === $original, 'immutable intact config fallback preserves original');
    chmod($temp . '/readonly', 0700); chmod($immutable, 0600);
    $readonlyConfig['security']['encryption_key'] = '';
    file_put_contents($immutable, '<?php return ' . var_export($readonlyConfig, true) . ';'); chmod($immutable, 0400); chmod($temp . '/readonly', 0500);
    rejects(fn() => Config::load($immutable, $root), 503, 'immutable missing key blocks setup');
    chmod($temp . '/readonly', 0700); chmod($immutable, 0600);
    $ui = UiConfig::publicContent($config);
    check($ui['sponsors']['login']['href'] === '#guide' && $ui['sponsors']['sidebar']['title'] !== '', 'community sponsorship defaults');
    check(!str_contains(json_encode($ui), $config['security']['encryption_key']), 'public UI config excludes secrets');
    $unsafeSponsor = $config; $unsafeSponsor['sponsors']['login'] = ['href' => 'javascript:alert(1)', 'title' => 'Sponsor'];
    check(UiConfig::publicContent($unsafeSponsor)['sponsors']['login']['href'] === '#guide', 'unsafe sponsor URL rejected');
    $session = new Session(); $connection = new ConnectionHandler($config, $session);
    $_SESSION = ['mongo_conn' => $connection->encrypt('mongodb://user:secret@localhost/test')];
    check($connection->uri() === 'mongodb://user:secret@localhost/test', 'GCM roundtrip');
    $raw = base64_decode($_SESSION['mongo_conn']); $raw[30] = chr(ord($raw[30]) ^ 1);
    $_SESSION['mongo_conn'] = base64_encode($raw);
    rejects(fn() => $connection->uri(), 401, 'GCM tampering rejected');
    check($_SESSION === [], 'tampering destroys session');
    $_SESSION = ['mongo_conn' => 'invalid']; rejects(fn() => $connection->uri(), 401, 'malformed session rejected');
    $_SESSION = []; rejects(fn() => $connection->uri(), 401, 'missing context rejected');
    foreach (['[]', 'null', '"foo"', '1', '{broken'] as $filter) { rejects(fn() => Filter::parse($filter), 400, 'invalid filter'); }
    foreach (['{"$where":"return true"}', '{"x":{"$regex":".*"}}', '{"$expr":{"$function":{}}}', '{"x":{"$in":[{"$regularExpression":{"pattern":"x","options":""}}]}}'] as $filter) { rejects(fn() => Filter::parse($filter), 403, 'dangerous filter'); }
    $typed = Filter::parse('{"_id":{"$oid":"651c3d82a1b9c8d7e6f5a4b3"},"date":{"$date":"2026-10-07T00:00:00Z"}}');
    check($typed->_id instanceof MongoDB\BSON\ObjectId && $typed->date instanceof MongoDB\BSON\UTCDateTime, 'EJSON typing preserved');
    check(Filter::parse('{"$and":[{"n":{"$gte":1}},{"status":{"$in":["active"]}}]}') instanceof stdClass, 'allowed operators');
    rejects(fn() => Query::target(['db' => 'admin', 'collection' => 'users']), 403, 'system db blocked');
    rejects(fn() => Query::page(['page' => '201']), 400, 'page cap');
    check(Query::page(['page' => '200']) === 200, 'last page allowed');
    check(Query::sort(['sort' => '{"status":-1}']) === ['status' => -1, '_id' => 1], 'sort tie breaker');
    rejects(fn() => Query::identifier(['id' => '2147483648', 'id_type' => 'Int32']), 400, 'Int32 overflow rejected');
    rejects(fn() => Query::identifier(['id' => '9223372036854775808', 'id_type' => 'Int64']), 400, 'Int64 overflow rejected');
    rejects(fn() => Query::identifier(['id' => '1', 'id_type' => 'unknown']), 400, 'unknown id type rejected');
    check(Query::identifier(['id' => '9223372036854775807', 'id_type' => 'Int64']) instanceof MongoDB\BSON\Int64, 'Int64 preserved');
    $_SESSION = ['authenticated' => true, 'last_activity' => time() - 3601];
    check(!$session->authenticated() && $_SESSION === [], 'idle expiry checked before refresh');

    if (!extension_loaded('mongodb') || !function_exists('curl_init')) { throw new RuntimeException('Integration tests require mongodb and curl extensions'); }
    $mongoPort = port(); mkdir($temp . '/db');
    $mongod = getenv('PHPMONGO_TEST_MONGOD') ?: 'mongod';
    $processes[] = proc_open([$mongod, '--auth', '--bind_ip', '127.0.0.1', '--port', (string)$mongoPort, '--dbpath', $temp . '/db', '--logpath', $temp . '/mongo.log', '--quiet'], [0 => ['pipe', 'r'], 1 => ['file', $temp . '/mongo-process.log', 'a'], 2 => ['file', $temp . '/mongo-process.log', 'a']], $pipes);
    $uri = 'mongodb://127.0.0.1:' . $mongoPort;
    $mongo = new MongoDB\Client($uri, ['serverSelectionTimeoutMS' => 300]);
    $ready = false;
    for ($i = 0; $i < 80; $i++) {
        try { $mongo->selectDatabase('admin')->command(['ping' => 1])->toArray(); $ready = true; break; } catch (Throwable) { usleep(100000); }
    }
    check($ready, 'isolated MongoDB started');
    $mongoPassword = bin2hex(random_bytes(16));
    $mongo->selectDatabase('admin')->command(['createUser' => 'test_admin', 'pwd' => $mongoPassword, 'roles' => ['root']])->toArray();
    $uri = 'mongodb://test_admin:' . $mongoPassword . '@127.0.0.1:' . $mongoPort . '/?authSource=admin';
    $mongo = new MongoDB\Client($uri, ['serverSelectionTimeoutMS' => 5000]);
    $mongo->selectDatabase('admin')->command(['createUser' => 'test_reader', 'pwd' => $mongoPassword, 'roles' => [['role' => 'read', 'db' => 'phpmongo_test']]])->toArray();

    $collection = $mongo->selectCollection('phpmongo_test', 'documents');
    $docs = [];
    for ($i = 0; $i < 120; $i++) { $docs[] = ['_id' => $i, 'status' => $i % 2 ? 'active' : 'other', 'n' => $i, 'customer' => ['name' => 'Example'], 'items' => range(1, 30), 'createdAt' => new MongoDB\BSON\UTCDateTime()]; }
    $docs[] = ['_id' => 'huge', 'text' => str_repeat('"', 8 * 1024 * 1024), 'blob' => new MongoDB\BSON\Binary(str_repeat('b', 1024 * 1024)), 'nested' => ['long' => str_repeat('x', 1024 * 1024)], 'items' => array_fill(0, 100, str_repeat('y', 1000))];
    $oid = new MongoDB\BSON\ObjectId('651c3d82a1b9c8d7e6f5a4b3');
    $docs[] = ['_id' => $oid, 'name' => 'typed'];
    $adversarial = ['_id' => 'wide'];
    for ($i = 0; $i < 100; $i++) { $adversarial['field' . $i] = array_fill(0, 40, ['x' => str_repeat(chr(1), 4096)]); }
    $docs[] = $adversarial;
    $docs[] = ['_id' => new MongoDB\BSON\Int64('9223372036854775807'), 'n' => 'int64'];
    $collection->insertMany($docs);
    $initialCount = $collection->countDocuments();
    unlink($configPath); // Exercise browser initialization with no private configuration.
    $webPort = port();
    $command = [PHP_BINARY];
    if ($extensionPath = getenv('PHPMONGO_TEST_EXTENSION')) { $command = [...$command, '-d', 'extension=' . $extensionPath]; }
    $command = [...$command, '-S', '127.0.0.1:' . $webPort, '-t', $root . '/public', $root . '/public/router.php'];
    $processes[] = proc_open($command, [0 => ['pipe', 'r'], 1 => ['file', $temp . '/web.log', 'a'], 2 => ['file', $temp . '/web.log', 'a']], $pipes, $root, array_merge(getenv(), ['PHPMONGO_CONFIG' => $configPath]));
    $base = 'http://127.0.0.1:' . $webPort;
    for ($i = 0; $i < 50; $i++) { $socket = @fsockopen('127.0.0.1', $webPort); if ($socket) { fclose($socket); break; } usleep(100000); }
    [$status, $setup, , $setupHeaders] = request($base, '/api/auth/status');
    check($status === 200 && $setup['setup_required'] && !$setup['authenticated'], 'HTTP first-run status');
    $setupToken = $setup['csrf_token'];
    [$status] = request($base, '/api/setup', 'POST', ['password' => 'test-master-password', 'password_confirmation' => 'test-master-password']);
    check($status === 403 && !file_exists($configPath), 'setup CSRF required');
    [$status] = request($base, '/api/setup', 'POST', ['password' => 'test-master-password', 'password_confirmation' => 'different-password'], $setupToken);
    check($status === 400 && !file_exists($configPath), 'setup rejects confirmation mismatch');
    [$status] = request($base, '/api/setup', 'POST', ['password' => 'short', 'password_confirmation' => 'short'], $setupToken);
    check($status === 400 && !file_exists($configPath), 'setup rejects weak length');
    [$status, $installed] = request($base, '/api/setup', 'POST', ['password' => 'test-master-password', 'password_confirmation' => 'test-master-password'], $setupToken);
    check($status === 200 && $installed['setup_complete'] && !str_contains(file_get_contents($configPath), 'test-master-password'), 'HTTP setup saves no cleartext password');
    [$status] = request($base, '/api/setup', 'POST', ['password' => 'replacement-password', 'password_confirmation' => 'replacement-password'], $setupToken);
    check(in_array($status, [401, 403, 404], true), 'setup endpoint unavailable after initialization');
    [$status, $health, , $cookieHeaders] = request($base, '/api/health'); check($status === 200 && $health['mode'] === 'document-browsing-and-collection-creation', 'health');
    [$status, $publicUi] = request($base, '/api/ui'); check($status === 200 && isset($publicUi['sponsors']), 'anonymous public UI settings');
    [$status] = request($base, '/assets/%2e%2e/%2e%2e/config/phpmongo-config.example.php'); check($status === 404, 'asset path traversal rejected');
    [$status] = request($base, '/api/data/structure'); check($status === 401, 'unauthenticated data blocked');
    [$status] = request($base, '/api/data/collections', 'POST', ['db' => 'phpmongo_test', 'collection' => 'unauthenticated']); check($status === 401, 'collection creation requires administrator authentication');
    [$status, $auth, , $headers] = request($base, '/api/auth/status');
    check($status === 200 && !$auth['authenticated'] && str_contains($setupHeaders, 'HttpOnly') && str_contains($setupHeaders, 'SameSite=Strict'), 'private session cookie');
    $token = $auth['csrf_token'];
    [$status] = request($base, '/api/auth/login', 'POST', ['password' => 'test-master-password']); check($status === 403, 'CSRF enforced on login');
    [$status] = request($base, '/api/auth/login', 'POST', ['password' => 'wrong'], $token); check($status === 401, 'wrong password rejected');
    $oldCookie = $cookie;
    [$status, $login] = request($base, '/api/auth/login', 'POST', ['password' => 'test-master-password'], $token);
    check($status === 200 && $cookie !== $oldCookie, 'login rotates session'); $token = $login['csrf_token'];
    [$status] = request($base, dataPath('/api/data/documents', ['db' => 'phpmongo_test', 'collection' => 'documents'])); check($status === 401, 'missing connection blocks fetch');
    [$status] = request($base, '/api/data/collections', 'POST', ['db' => 'phpmongo_test', 'collection' => 'new_collection'], $token); check($status === 401, 'collection creation requires connection');
    [$status] = request($base, '/api/connection', 'POST', ['uri' => $uri], $token); check($status === 200, 'connect verified');
    [$status, $tree] = request($base, '/api/data/structure'); check($status === 200 && $tree['databases'][0]['database'] === 'phpmongo_test', 'structure lists database');
    [$status] = request($base, '/api/data/collections', 'POST', ['db' => 'phpmongo_test', 'collection' => 'new_collection']); check($status === 403, 'collection creation requires CSRF');
    [$status, $created] = request($base, '/api/data/collections', 'POST', ['db' => 'phpmongo_test', 'collection' => 'new_collection'], $token);
    check($status === 201 && $created['created'], 'collection creation acknowledged');
    check(in_array('new_collection', iterator_to_array($mongo->selectDatabase('phpmongo_test')->listCollectionNames()), true) && $mongo->selectCollection('phpmongo_test', 'new_collection')->countDocuments() === 0, 'empty collection really exists');
    [$status] = request($base, '/api/data/collections', 'POST', ['db' => 'phpmongo_test', 'collection' => 'new_collection'], $token); check($status === 409, 'duplicate collection rejected');
    foreach (['admin', 'local', 'config'] as $system) {
        [$status] = request($base, '/api/data/collections', 'POST', ['db' => $system, 'collection' => 'blocked'], $token); check($status === 403, 'system collection creation blocked');
    }
    foreach (['system.users', '$bad', 'bad$name', '', ' padded '] as $invalid) {
        [$status] = request($base, '/api/data/collections', 'POST', ['db' => 'phpmongo_test', 'collection' => $invalid], $token); check($status === 400, 'invalid collection creation name blocked');
    }
    [$status] = request($base, '/api/data/collections', 'POST', ['db' => 'bad/name', 'collection' => 'safe'], $token); check($status === 400, 'invalid creation database blocked');
    [$status] = request($base, '/api/data/collections', 'POST', ['db' => 'phpmongo_test', 'collection' => 'options', 'options' => ['viewOn' => 'documents']], $token); check($status === 400, 'arbitrary creation options blocked');
    [$status] = request($base, '/api/data/collections', 'POST', ['db' => 'phpmongo_newdb', 'collection' => 'first'], $token); check($status === 201, 'collection creates a new database');
    $readerUri = 'mongodb://test_reader:' . $mongoPassword . '@127.0.0.1:' . $mongoPort . '/?authSource=admin';
    [$status] = request($base, '/api/connection', 'POST', ['uri' => $readerUri], $token); check($status === 200, 'read-only account still connects');
    [$status] = request($base, '/api/data/collections', 'POST', ['db' => 'phpmongo_test', 'collection' => 'reader_denied'], $token); check($status === 403, 'MongoDB read-only account cannot create collections');
    check(!in_array('reader_denied', iterator_to_array($mongo->selectDatabase('phpmongo_test')->listCollectionNames()), true), 'denied creation changes no schema');
    [$status] = request($base, '/api/connection', 'POST', ['uri' => $uri], $token); check($status === 200, 'restore administrative fixture connection');
    $params = ['db' => 'phpmongo_test', 'collection' => 'documents'];
    [$status, $preview, $raw] = request($base, dataPath('/api/data/documents', $params));
    check($status === 200 && $preview['count'] === 50 && strlen($raw) <= 1048576, 'bounded preview');
    check($preview['documents'][0]['identifier']['$numberInt'] === '0', 'deterministic ordering');
    [$status, $next] = request($base, dataPath('/api/data/documents', $params + ['page' => '2'])); check($status === 200 && $next['documents'][0]['identifier']['$numberInt'] === '50', 'next page');
    [$status, $filtered] = request($base, dataPath('/api/data/documents', $params + ['filter' => '{"status":"active"}'])); check($status === 200 && $filtered['count'] === 50, 'filter query');
    foreach (['admin', 'local', 'config'] as $db) {
        [$status] = request($base, dataPath('/api/data/documents', ['db' => $db, 'collection' => 'x'])); check($status === 403, 'direct system db denial');
    }
    [$status] = request($base, dataPath('/api/data/documents', $params + ['filter' => '{"$where":"true"}'])); check($status === 403, 'API operator denial');
    [$status] = request($base, dataPath('/api/data/documents', $params + ['filter' => '[]'])); check($status === 400, 'API root validation');
    [$status] = request($base, dataPath('/api/data/documents', $params + ['page' => '201'])); check($status === 400, 'API page cap');
    [$status, $largePreview, $previewRaw] = request($base, dataPath('/api/data/documents', $params + ['filter' => '{"_id":"huge"}']));
    check($status === 200 && strlen($previewRaw) < 1048576 && $largePreview['documents'][0]['truncated'], 'huge preview reduced on server');
    [$status, $typedPreview] = request($base, dataPath('/api/data/documents', $params + ['filter' => '{"_id":{"$oid":"651c3d82a1b9c8d7e6f5a4b3"}}']));
    check($status === 200 && $typedPreview['count'] === 1 && $typedPreview['documents'][0]['identifier']['$oid'] === (string)$oid, 'typed filter executes');
    [$status, $wide, $wideRaw] = request($base, dataPath('/api/data/document-details', $params + ['id' => 'wide', 'id_type' => 'String']));
    check($status === 200 && strlen($wideRaw) <= 2097152 && $wide['document']['size_limited'], 'adversarial detail projection collapses before transfer');
    [$status, $longDetail] = request($base, dataPath('/api/data/document-details', $params + ['id' => '9223372036854775807', 'id_type' => 'Int64'])); check($status === 200 && $longDetail['document']['identifier']['$numberLong'] === '9223372036854775807', 'Int64 HTTP lookup preserves exact digits');
    [$status, $detail, $raw] = request($base, dataPath('/api/data/document-details', $params + ['id' => 'huge', 'id_type' => 'String']));
    check($status === 200 && strlen($raw) < 2097152 && ($detail['document']['truncated'] ?? false), 'large detail bounded');
    $fields = array_column($detail['document']['fields'], null, 'name');
    check(strlen($fields['text']['value']) === 1024 && count($fields['items']['value']) === 20 && $fields['blob']['value'] === '[Binary omitted]', 'database-side pruning');
    [$status, $expanded] = request($base, dataPath('/api/data/document-details', $params + ['id' => 'huge', 'id_type' => 'String', 'field' => 'nested.long']));
    check($status === 200 && strlen($expanded['document']['fields'][0]['value']) === 1024, 'bounded field expansion');
    [$status, $arrayItem] = request($base, dataPath('/api/data/document-details', $params + ['id' => 'huge', 'id_type' => 'String', 'field' => 'items.21']));
    check($status === 200 && strlen($arrayItem['document']['fields'][0]['value']) === 1000, 'array index expansion beyond initial slice');
    [$status] = request($base, dataPath('/api/data/document-details', $params + ['id' => (string)$oid, 'id_type' => 'ObjectId'])); check($status === 200, 'typed ObjectId lookup');
    [$status] = request($base, dataPath('/api/data/document-details', $params + ['id' => 'no-such-id', 'id_type' => 'String'])); check($status === 404, 'missing document');
    [$status] = request($base, '/api/data/documents', 'POST', ['document' => ['x' => 1]], $token); check($status === 405, 'write method absent');
    check($collection->countDocuments() === $initialCount && strlen($collection->findOne(['_id' => 'huge'])['text']) === 8 * 1024 * 1024, 'database unchanged');
    $sessionFile = $root . '/var/sessions/sess_' . substr($cookie, strlen('phpmongo_session='));
    $state = file_get_contents($sessionFile);
    check(!str_contains($state, $uri), 'URI encrypted on disk');
    $tampered = preg_replace('/mongo_conn\|s:[0-9]+:"[^"]*";/', 'mongo_conn|s:4:"oops";', $state);
    file_put_contents($sessionFile, $tampered);
    [$status] = request($base, '/api/data/structure'); check($status === 401 && !file_exists($sessionFile), 'tampered disk session destroyed');
    [$status, $auth] = request($base, '/api/auth/status');
    [$status, $login] = request($base, '/api/auth/login', 'POST', ['password' => 'test-master-password'], $auth['csrf_token']); $token = $login['csrf_token'];
    [$status] = request($base, '/api/connection', 'POST', ['uri' => $uri], $token); check($status === 200, 'new session after tampering');
    $sessionFile = $root . '/var/sessions/sess_' . substr($cookie, strlen('phpmongo_session='));
    $state = file_get_contents($sessionFile);
    file_put_contents($sessionFile, preg_replace('/last_activity\|i:[0-9]+;/', 'last_activity|i:' . (time() - 3601) . ';', $state));
    [$status] = request($base, '/api/data/structure'); check($status === 401 && !file_exists($sessionFile), 'HTTP idle expiry deletes session');
    [$status, $auth] = request($base, '/api/auth/status'); $token = $auth['csrf_token'];
    [$status, $login] = request($base, '/api/auth/login', 'POST', ['password' => 'test-master-password'], $token); $token = $login['csrf_token'];
    [$status] = request($base, '/api/connection', 'POST', ['uri' => $uri], $token); check($status === 200, 'reconnect');
    $sessionFile = $root . '/var/sessions/sess_' . substr($cookie, strlen('phpmongo_session='));
    [$status] = request($base, '/api/auth/logout', 'POST', [], $token); check($status === 200 && !file_exists($sessionFile), 'logout deletes session');
    echo "PASS: $checks checks (unit and isolated MongoDB/HTTP integration).\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'FAIL: ' . $error->getMessage() . "\nTest artifacts: $temp\n");
    $failure = true;
} finally {
    foreach (array_reverse($processes) as $process) { if (is_resource($process)) { proc_terminate($process); proc_close($process); } }
    if (!isset($failure)) { removeTree($temp); }
}
exit(isset($failure) ? 1 : 0);
