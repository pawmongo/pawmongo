<?php
/**
 * Assembles the Slim application and its authentication and read-only routes.
 */
declare(strict_types=1);
namespace PhpMongo;
use PhpMongo\Core\{ApiException, ConnectionHandler, Json, LoginThrottle, Session, UiConfig};
use PhpMongo\Handlers\DatabaseController;
use Psr\Http\Message\{ResponseInterface as Response, ServerRequestInterface as Request};
use Psr\Http\Server\RequestHandlerInterface;
use Slim\App;
use Slim\Factory\AppFactory;
use Slim\Exception\HttpException;
/**
 * Assembles the Slim application and its authentication and read-only routes.
 */
final class Application
{
    /**
     * Build the Slim router and its security middleware.
     * @param array<string, mixed> $config Bootstrapped private configuration.
     * @param Session $session The started server-side session.
     * @return App Configured application ready to handle requests.
     */
    public static function create(array $config, Session $session): App
    {
        $app = AppFactory::create();
        $connection = new ConnectionHandler($config, $session);
        $database = new DatabaseController($connection);
        $app->get('/api/health', fn(Request $request, Response $response) => Json::response($response, ['status' => 'ok', 'mode' => 'read-only', 'version' => '1.0.0-dev']));
        $app->get('/api/ui', fn(Request $request, Response $response) => Json::response($response, UiConfig::publicContent($config)));
        $app->get('/api/auth/status', function (Request $request, Response $response) use ($session, $config) {
            $authenticated = $session->authenticated();
            return Json::response($response, [
                'authenticated' => $authenticated,
                'csrf_token' => $_SESSION['csrf'] ?? null,
                'connected' => $authenticated && isset($_SESSION['mongo_conn']),
                'warnings' => $authenticated ? $config['warnings'] : [],
            ]);
        });
        $app->post('/api/auth/login', function (Request $request, Response $response) use ($config, $session) {
            $body = self::body($request);
            $password = $body['password'] ?? null;
            if (!is_string($password) || strlen($password) > 4096) {
                throw new ApiException('A master password is required.');
            }
            $security = $config['security'];
            (new LoginThrottle($config['storage']))->verify((string)($request->getServerParams()['REMOTE_ADDR'] ?? ''), static function () use ($password, $security) {
                return $security['master_password'] !== ''
                    ? hash_equals($security['master_password'], $password)
                    : password_verify($password, $security['master_password_hash']);
            });
            $session->login();
            return Json::response($response, ['authenticated' => true, 'csrf_token' => $_SESSION['csrf'], 'warnings' => $config['warnings']]);
        });
        $app->post('/api/auth/logout', function (Request $request, Response $response) use ($session) {
            $session->destroy();
            return Json::response($response, ['authenticated' => false]);
        });
        $app->post('/api/connection', function (Request $request, Response $response) use ($connection) {
            $uri = self::body($request)['uri'] ?? null;
            if (!is_string($uri)) {
                throw new ApiException('Connection URI is required.');
            }
            $connection->establish($uri);
            return Json::response($response, ['connected' => true]);
        });
        $app->delete('/api/connection', function (Request $request, Response $response) {
            unset($_SESSION['mongo_conn']);
            return Json::response($response, ['connected' => false]);
        });
        $app->get('/api/data/structure', [$database, 'structure']);
        $app->get('/api/data/documents', [$database, 'preview']);
        $app->get('/api/data/document-details', [$database, 'details']);
        $app->get('/', function (Request $request, Response $response) {
            $template = dirname(__DIR__) . '/templates/app.html';
            $response->getBody()->write(file_get_contents(is_file($template) ? $template : dirname(__DIR__) . '/templates/backend.html'));
            return $response->withHeader('Content-Type', 'text/html; charset=utf-8');
        });
        $app->add(function (Request $request, RequestHandlerInterface $handler) use ($session) {
            $path = $request->getUri()->getPath();
            $public = ['/', '/api/health', '/api/ui', '/api/auth/status', '/api/auth/login'];
            if (!in_array($path, $public, true) && !$session->authenticated()) {
                throw new ApiException('Master-password authentication is required.', 401);
            }
            if (in_array($request->getMethod(), ['POST', 'DELETE', 'PUT', 'PATCH'], true)) {
                $token = $request->getHeaderLine('X-CSRF-Token');
                if ($token === '') {
                    $token = self::body($request)['csrf_token'] ?? '';
                }
                $session->requireCsrf(is_string($token) ? $token : '');
            }
            return $handler->handle($request);
        });
        $app->addRoutingMiddleware();
        $errors = $app->addErrorMiddleware(false, false, false);
        $errors->setDefaultErrorHandler(function (Request $request, \Throwable $error) use ($app) {
            $status = $error instanceof ApiException ? $error->status : ($error instanceof HttpException ? $error->getCode() : 500);
            $message = $error instanceof ApiException ? $error->getMessage() : match ($status) {
                404 => 'Endpoint not found.', 405 => 'Method is not available. Database writes are disabled.',
                default => 'Database operation failed. Check database permissions, server compatibility, and query limits.',
            };
            return Json::response($app->getResponseFactory()->createResponse(), ['error' => $message], $status);
        });
        return $app;
    }
    private static function body(Request $request): array
    {
        if ((int)$request->getHeaderLine('Content-Length') > 16384) {
            throw new ApiException('Request body exceeds 16 KiB.', 413);
        }
        $stream = $request->getBody();
        $stream->rewind();
        $raw = $stream->read(16385);
        $stream->rewind();
        if (strlen($raw) > 16384) {
            throw new ApiException('Request body exceeds 16 KiB.', 413);
        }
        if (str_starts_with($request->getHeaderLine('Content-Type'), 'application/x-www-form-urlencoded')) {
            parse_str($raw, $body);
            return $body;
        }
        try {
            $body = json_decode($raw, false, 8, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            throw new ApiException('Request body must be a JSON object.');
        }
        if (!$body instanceof \stdClass) {
            throw new ApiException('Request body must be a JSON object.');
        }
        return get_object_vars($body);
    }
}
