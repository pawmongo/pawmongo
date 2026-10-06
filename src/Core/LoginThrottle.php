<?php
/**
 * Limits master-password attempts independently of browser session cookies.
 */
declare(strict_types=1);
namespace PhpMongo\Core;
/**
 * Limits master-password attempts independently of browser session cookies.
 */
final class LoginThrottle
{
    /**
     * Select the private storage root for shared login-attempt counters.
     * @param string $storage Private runtime storage path.
     */
    public function __construct(private readonly string $storage) {}
    /**
     * Check a password while holding a peer-specific attempt-counter lock.
     * @param string $peer Native remote address, independent of forwarded headers.
     * @param callable(): bool $check Password verification callback.
     * @throws ApiException If authentication fails, throttling applies, or storage is unavailable.
     */
    public function verify(string $peer, callable $check): void
    {
        $directory = $this->storage . '/login';
        if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new ApiException('Cannot create login protection storage.', 503);
        }
        $fp = @fopen($directory . '/' . hash('sha256', $peer) . '.json', 'c+');
        if ($fp === false || !flock($fp, LOCK_EX)) {
            throw new ApiException('Cannot initialize login protection.', 503);
        }
        try {
            $state = json_decode(stream_get_contents($fp), true) ?: ['start' => time(), 'failures' => 0];
            if (time() - ($state['start'] ?? 0) >= 300) {
                $state = ['start' => time(), 'failures' => 0];
            }
            if (($state['failures'] ?? 0) >= 10) {
                throw new ApiException('Too many login attempts. Try again in five minutes.', 429);
            }
            $ok = $check();
            $state['failures'] = $ok ? 0 : ($state['failures'] ?? 0) + 1;
            rewind($fp);
            ftruncate($fp, 0);
            fwrite($fp, json_encode($state, JSON_THROW_ON_ERROR));
            fflush($fp);
            if (!$ok) {
                throw new ApiException('Invalid master password.', 401);
            }
        } finally {
            flock($fp, LOCK_UN);
            fclose($fp);
        }
    }
}
