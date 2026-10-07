<?php
declare(strict_types=1);
// Only this directory may be exposed by the web server.
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
$root = dirname(__DIR__);
try {
    $missing = [];
    foreach (['mongodb', 'openssl', 'session', 'json'] as $extension) {
        if (!extension_loaded($extension)) {
            $missing[] = $extension;
        }
    }
    $driverSupported = extension_loaded('mongodb') && version_compare((string)phpversion('mongodb'), '2.5.0', '>=');
    if (PHP_VERSION_ID < 80200 || $missing !== [] || !$driverSupported || !is_file($root . '/vendor/autoload.php')) {
        http_response_code(503);
        header('Content-Type: text/html; charset=utf-8');
        $missingText = htmlspecialchars(implode(', ', $missing), ENT_QUOTES, 'UTF-8');
        require $root . '/templates/preflight.php';
        exit;
    }
    require $root . '/vendor/autoload.php';
    $configPath = getenv('PHPMONGO_CONFIG') ?: $root . '/config/phpmongo-config.php';
    $pending = \PhpMongo\Core\Config::setupSettings($configPath, $root);
    if ($pending !== null) {
        \PhpMongo\Core\AccessBoundary::enforce($pending, $_SERVER);
        $config = $pending;
        $config['storage'] = $root . '/var';
    } else {
        $config = \PhpMongo\Core\Config::load($configPath, $root, static fn(array $settings) => \PhpMongo\Core\AccessBoundary::enforce($settings, $_SERVER));
    }
    $secure = \PhpMongo\Core\AccessBoundary::secure($_SERVER);
    $assetPath = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
    if (str_starts_with($assetPath, '/assets/')) {
        $directory = realpath(__DIR__ . '/assets');
        $file = realpath(__DIR__ . $assetPath);
        $types = ['js' => 'text/javascript', 'css' => 'text/css', 'png' => 'image/png', 'svg' => 'image/svg+xml', 'woff' => 'font/woff', 'woff2' => 'font/woff2'];
        $extension = pathinfo($file ?: '', PATHINFO_EXTENSION);
        if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true) || !$directory || !$file || !str_starts_with($file, $directory . DIRECTORY_SEPARATOR) || !is_file($file) || !isset($types[$extension])) {
            throw new \PhpMongo\Core\ApiException('Asset not found.', 404);
        }
        header('Content-Type: ' . $types[$extension]);
        header('Cache-Control: private, max-age=3600');
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
            readfile($file);
        }
        exit;
    }
    $session = new \PhpMongo\Core\Session();
    if ($assetPath !== '/api/ui') {
        $session->start($config['storage'], $secure);
    }
    if ($pending !== null) {
        \PhpMongo\Installer::create($configPath, $root, $config, $session)->run();
    } else {
        \PhpMongo\Application::create($config, $session)->run();
    }
} catch (\Throwable $error) {
    $known = $error instanceof \PhpMongo\Core\ApiException;
    http_response_code($known ? $error->status : 503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $known ? $error->getMessage() : 'Backend setup failed. Check runtime prerequisites and private directory permissions.']);
}
