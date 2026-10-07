<?php
/** First-run Slim routes for creating the private administrator credentials. */
declare(strict_types=1);
namespace PhpMongo;
use PhpMongo\Core\{ApiException, Config, Json, Session, UiConfig};
use Psr\Http\Message\{ResponseInterface as Response, ServerRequestInterface as Request};
use Slim\App;
use Slim\Factory\AppFactory;
use Slim\Exception\HttpException;
/** Serves the one-screen installer only while master credentials are absent. */
final class Installer
{
    /**
     * Build setup routes after the deployment's access boundary has been enforced.
     * @param string $path Private configuration path.
     * @param string $root Application root.
     * @param array<string, mixed> $settings Uninitialized deployment settings.
     * @param Session $session Started session for CSRF-protected installation.
     * @return App Slim application serving first-run setup.
     */
    public static function create(string $path, string $root, array $settings, Session $session): App
    {
        $app = AppFactory::create();
        $page = function (Request $request, Response $response) use ($root) {
            $file = $root . '/templates/app.html';
            if (!is_file($file)) throw new ApiException('Build the frontend assets before opening setup.', 503);
            $response->getBody()->write((string)file_get_contents($file));
            return $response->withHeader('Content-Type', 'text/html; charset=utf-8');
        };
        foreach (\PhpMongo\Core\PageRoutes::PATHS as $pagePath) $app->get($pagePath, $page);
        $app->get('/api/ui', fn(Request $request, Response $response) => Json::response($response, UiConfig::publicContent($settings)));
        $app->get('/api/auth/status', fn(Request $request, Response $response) => Json::response($response, [
            'authenticated' => false, 'connected' => false, 'setup_required' => true,
            'csrf_token' => $_SESSION['csrf'] ?? null, 'warnings' => [],
        ]));
        $app->post('/api/setup', function (Request $request, Response $response) use ($path, $root, $session) {
            $session->requireCsrf($request->getHeaderLine('X-CSRF-Token'));
            $raw = $request->getBody()->read(16385);
            if (strlen($raw) > 16384) throw new ApiException('Request body exceeds 16 KiB.', 413);
            try { $body = json_decode($raw, false, 16, JSON_THROW_ON_ERROR); }
            catch (\JsonException) { throw new ApiException('Supply a valid setup request.'); }
            if (!$body instanceof \stdClass || !is_string($body->password ?? null) || !is_string($body->password_confirmation ?? null)) {
                throw new ApiException('Enter and confirm your master password.');
            }
            if (!hash_equals($body->password, $body->password_confirmation)) {
                throw new ApiException('The passwords do not match.');
            }
            Config::initialize($path, $root, $body->password);
            $session->destroy();
            return Json::response($response, ['setup_complete' => true]);
        });
        $app->addRoutingMiddleware();
        $errors = $app->addErrorMiddleware(false, false, false);
        $errors->setDefaultErrorHandler(function (Request $request, \Throwable $error) use ($app) {
            $status = $error instanceof ApiException ? $error->status : ($error instanceof HttpException ? $error->getCode() : 503);
            return Json::response($app->getResponseFactory()->createResponse(), ['error' => $error instanceof ApiException ? $error->getMessage() : 'Setup is unavailable. Check the private configuration and directory permissions.'], $status);
        });
        return $app;
    }
}
