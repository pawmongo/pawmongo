<?php
/**
 * Enforces the local peer and host boundary or explicit remote HTTPS policy.
 */
declare(strict_types=1);
namespace PhpMongo\Core;
/**
 * Enforces the local peer and host boundary or explicit remote HTTPS policy.
 */
final class AccessBoundary
{
    /**
     * Determine HTTPS state from trusted web-server parameters.
     * Forwarded headers are deliberately ignored.
     * @param array<string, mixed> $server Native server parameters.
     * @return bool Whether the web server identifies a secure request.
     */
    public static function secure(array $server): bool
    {
        return in_array(strtolower((string)($server['HTTPS'] ?? '')), ['on', '1'], true);
    }
    /**
     * Reject external local-mode requests or insecure remote-mode requests.
     * @param array<string, mixed> $config Application configuration.
     * @param array<string, mixed> $server Native server parameters.
     * @throws ApiException If the access boundary is violated.
     */
    public static function enforce(array $config, array $server): void
    {
        $local = $config['security']['force_local_boundary'] ?? true;
        if (!is_bool($local)) {
            throw new ApiException('force_local_boundary must be a boolean.', 503);
        }
        if ($local) {
            $host = strtolower((string)($server['HTTP_HOST'] ?? ''));
            $validHost = preg_match('/^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/D', $host) === 1;
            if (!in_array($server['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) || !$validHost) {
                throw new ApiException('External access is disabled. Use localhost or a loopback address.', 403);
            }
        } elseif (!self::secure($server)) {
            throw new ApiException('Remote deployments require HTTPS.', 403);
        }
    }
}
