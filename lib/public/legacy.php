<?php
declare(strict_types=1);
// Only this directory may be exposed by the web server.
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
$styleNonce = base64_encode(random_bytes(18));
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'nonce-$styleNonce'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
$root = dirname(__DIR__, 2);
try {
    $missing = [];
    foreach (['mongodb', 'openssl', 'session', 'json'] as $extension) {
        if (!extension_loaded($extension)) {
            $missing[] = $extension;
        }
    }
    $driverSupported = extension_loaded('mongodb') && version_compare((string)phpversion('mongodb'), '2.5.0', '>=');
    if (PHP_VERSION_ID < 80200 || $missing !== [] || !$driverSupported || !is_file($root . '/lib/vendor/autoload.php')) {
        http_response_code(503);
        header('Content-Type: text/html; charset=utf-8');
        $missingText = htmlspecialchars(implode(', ', $missing), ENT_QUOTES, 'UTF-8');
        require $root . '/lib/templates/preflight.php';
        exit;
    }
    require $root . '/lib/vendor/autoload.php';
    $configPath = getenv('PAWMONGO_CONFIG') ?: $root . '/config/pawmongo-config.php';
    $pending = \PawMongo\Core\Config::setupSettings($configPath, $root);
    if ($pending !== null) {
        \PawMongo\Core\AccessBoundary::enforce($pending, $_SERVER);
        $config = $pending;
        $config['storage'] = $root . '/var';
    } else {
        $config = \PawMongo\Core\Config::load($configPath, $root, static fn(array $settings) => \PawMongo\Core\AccessBoundary::enforce($settings, $_SERVER));
    }
    $secure = \PawMongo\Core\AccessBoundary::secure($_SERVER);
    $config['style_nonce'] = $styleNonce;
    $assetPath = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
    if (str_starts_with($assetPath, '/assets/')) {
        $directory = realpath(__DIR__ . '/assets');
        $file = realpath(__DIR__ . $assetPath);
        $types = ['js' => 'text/javascript', 'css' => 'text/css', 'png' => 'image/png', 'svg' => 'image/svg+xml', 'woff' => 'font/woff', 'woff2' => 'font/woff2'];
        $extension = pathinfo($file ?: '', PATHINFO_EXTENSION);
        if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true) || !$directory || !$file || !str_starts_with($file, $directory . DIRECTORY_SEPARATOR) || !is_file($file) || !isset($types[$extension])) {
            throw new \PawMongo\Core\ApiException('Asset not found.', 404);
        }
        header('Content-Type: ' . $types[$extension]);
        header('Cache-Control: private, max-age=3600');
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
            readfile($file);
        }
        exit;
    }
    $session = new \PawMongo\Core\Session();
    if ($assetPath !== '/api/ui') {
        $session->start($config['storage'], $secure);
    }
    if ($pending !== null) {
        \PawMongo\Installer::create($configPath, $root, $config, $session)->run();
    } else {
        \PawMongo\Application::create($config, $session)->run();
    }
} catch (\Throwable $error) {
    $known = $error instanceof \PawMongo\Core\ApiException;
    http_response_code($known ? $error->status : 503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $known ? $error->getMessage() : 'Backend setup failed. Check runtime prerequisites and private directory permissions.']);
}
