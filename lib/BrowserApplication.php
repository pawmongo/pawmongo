<?php
declare(strict_types=1);
namespace PawMongo;

use PawMongo\Core\{AccessBoundary, ApiException, Json};
use PawMongo\Database\BrowserStore;
use PawMongo\Handlers\BrowserController;
use Psr\Http\Message\{ServerRequestInterface as Request, ResponseInterface as Response};
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Factory\AppFactory;
use Slim\Exception\HttpException;

/** PHP owns the API and serves the exported, browser-rendered Next.js application. */
final class BrowserApplication
{
    public static function create(string $root): \Slim\App
    {
        $app = AppFactory::create();
        $controller = new BrowserController(new BrowserStore($root));
        $app->get('/api/health', fn(Request $r, Response $s) => Json::response($s, ['success' => true, 'backend' => 'php', 'rendering' => 'csr']));
        $app->map(['GET', 'POST', 'DELETE'], '/api/connection', [$controller, 'connection']);
        $app->map(['GET', 'POST', 'DELETE'], '/api/databases', [$controller, 'databases']);
        $collection = '/api/databases/{database}/collections/{collection}';
        $app->map(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], $collection . '/documents', [$controller, 'documents']);
        $app->map(['GET', 'POST', 'DELETE'], $collection . '/indexes', [$controller, 'indexes']);
        $app->get($collection . '/columns', [$controller, 'columns']);
        $app->map(['GET', 'POST'], $collection . '/tools', [$controller, 'tools']);
        $app->get('/api/server/overview', [$controller, 'overview']);
        $app->get('/api/server/monitoring', [$controller, 'overview']);
        $app->get('/api/export-zip', function (Request $request, Response $response) use ($root): Response {
            $file = $root . '/download/pawmongo.zip';
            if (!is_file($file)) throw new ApiException('Build the download archive with npm run build first.', 404);
            return $response->withBody(new \Slim\Psr7\Stream(fopen($file, 'rb')))
                ->withHeader('Content-Type', 'application/zip')->withHeader('Content-Disposition', 'attachment; filename="pawmongo.zip"');
        });
        $app->get('/[{path:.*}]', fn(Request $r, Response $s) => self::theme($root, $r, $s));
        $app->add(function (Request $request, RequestHandlerInterface $handler): Response {
            AccessBoundary::enforce(['security' => ['force_local_boundary' => true]], $request->getServerParams());
            $path = $request->getUri()->getPath();
            if (str_starts_with($path, '/api/')) {
                $origin = $request->getHeaderLine('Origin');
                $server = $request->getServerParams();
                $localOrigin = (AccessBoundary::secure($server) ? 'https' : 'http') . '://' . ($server['HTTP_HOST'] ?? '');
                $allowed = [$localOrigin];
                // Explicit loopback dev origin; arbitrary forwarded headers never authorize access.
                if ($dev = getenv('PAWMONGO_FRONTEND_ORIGIN')) {
                    $parts = parse_url($dev);
                    if (($parts['scheme'] ?? '') === 'http' && in_array($parts['host'] ?? '', ['127.0.0.1', 'localhost', '::1'], true)) {
                        $port = $parts['port'] ?? 80;
                        $allowed[] = 'http://127.0.0.1:' . $port;
                        $allowed[] = 'http://localhost:' . $port;
                    }
                }
                if ($origin !== '' && !in_array($origin, $allowed, true)) throw new ApiException('Cross-origin requests are disabled.', 403);
                if ($request->getHeaderLine('Sec-Fetch-Site') === 'cross-site') throw new ApiException('Cross-origin requests are disabled.', 403);
                if (!in_array($path, ['/api/connection', '/api/health', '/api/export-zip'], true) && ($request->getCookieParams()['pawmongo_disconnected'] ?? '') === '1') {
                    throw new ApiException('Disconnected. Reconnect to use the database.', 409);
                }
            }
            return $handler->handle($request)->withHeader('Cache-Control', 'no-store')
                ->withHeader('X-Content-Type-Options', 'nosniff')->withHeader('X-Frame-Options', 'DENY')->withHeader('Referrer-Policy', 'no-referrer');
        });
        $app->addRoutingMiddleware();
        $errors = $app->addErrorMiddleware(false, false, false);
        $errors->setDefaultErrorHandler(function (Request $request, \Throwable $error) use ($app): Response {
            $code = $error->getCode();
            if ($error instanceof \MongoDB\Driver\Exception\BulkWriteException) $code = $error->getWriteResult()->getWriteErrors()[0]->getCode() ?? $code;
            $status = $error instanceof ApiException ? $error->status : ($error instanceof HttpException ? $code : match ($code) {
                13 => 403, 11000 => 409, 121 => 422, 26 => 404, 2, 9, 14, 72, 168 => 400, default => 500,
            });
            $message = $error instanceof ApiException ? $error->getMessage() : match ($status) {
                403 => 'The MongoDB account does not permit this operation.', 409 => 'Duplicate document or unique index value.',
                422 => 'Document does not satisfy the collection validation rules.', 404 => 'Endpoint or collection not found.',
                405 => 'Method is not available.', 400 => 'Invalid MongoDB query or operation options.',
                default => 'Database operation failed. Check permissions and query settings.',
            };
            return Json::response($app->getResponseFactory()->createResponse(), ['success' => false, 'error' => $message], $status)
                ->withHeader('Cache-Control', 'no-store')->withHeader('X-Content-Type-Options', 'nosniff');
        });
        return $app;
    }
    private static function theme(string $root, Request $request, Response $response): Response
    {
        $path = rawurldecode($request->getUri()->getPath());
        if (str_starts_with($path, '/api/')) throw new ApiException('Endpoint not found.', 404);
        if (str_contains($path, "\0") || str_contains($path, '\\') || preg_match('~(?:^|/)\.\.(?:/|$)~', $path)) throw new ApiException('Asset not found.', 404);
        $output = realpath($root . '/themes/out');
        if (!$output) throw new ApiException('Build the CSR theme with npm run build first.', 503);
        $file = realpath($output . $path);
        $types = ['js' => 'text/javascript', 'css' => 'text/css', 'svg' => 'image/svg+xml', 'png' => 'image/png', 'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg', 'webp' => 'image/webp', 'ico' => 'image/x-icon', 'woff' => 'font/woff', 'woff2' => 'font/woff2', 'txt' => 'text/plain', 'json' => 'application/json'];
        if ($file && str_starts_with($file, $output . DIRECTORY_SEPARATOR) && is_file($file) && isset($types[pathinfo($file, PATHINFO_EXTENSION)])) {
            return $response->withBody(new \Slim\Psr7\Stream(fopen($file, 'rb')))->withHeader('Content-Type', $types[pathinfo($file, PATHINFO_EXTENSION)]);
        }
        if ($path !== '/' && !preg_match('~^/databases/[^/]+(?:/collections/[^/]+(?:/(?:monitoring|visualize))?)?/?$~', $path)) throw new ApiException('Page not found.', 404);
        $html = file_get_contents($output . '/index.html');
        preg_match_all('~<script\b[^>]*>(.*?)</script>~s', $html, $scripts);
        $hashes = array_map(fn($script) => "'sha256-" . base64_encode(hash('sha256', $script, true)) . "'", array_filter($scripts[1]));
        $response->getBody()->write($html);
        return $response->withHeader('Content-Type', 'text/html; charset=utf-8')
            ->withHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' " . implode(' ', $hashes) . "; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://picsum.photos https://fastly.picsum.photos; font-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    }
}
