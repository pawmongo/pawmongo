<?php
/**
 * Manages private disk-backed sessions, idle expiry, and request tokens.
 */
declare(strict_types=1);
namespace PawMongo\Core;
/**
 * Manages private disk-backed sessions, idle expiry, and request tokens.
 */
final class Session
{
    /**
     * Start an HttpOnly, SameSite session in the private application directory.
     * @param string $storage Private runtime storage root.
     * @param bool $secure Whether the cookie requires HTTPS.
     * @throws ApiException If private session storage cannot be initialized.
     */
    public function start(string $storage, bool $secure): void
    {
        $directory = $storage . '/sessions';
        if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new ApiException('Cannot create private session storage. Adjust var/ directory permissions.', 503);
        }
        session_name('pawmongo_session');
        session_save_path($directory);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.gc_maxlifetime', '3600');
        ini_set('session.gc_probability', '1');
        ini_set('session.gc_divisor', '100');
        session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
        if (!session_start()) {
            throw new ApiException('Cannot start a private session.', 503);
        }
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }
    /**
     * Check idle expiry before optionally refreshing authenticated activity.
     * @param bool $touch Whether successful verification refreshes the idle timestamp.
     * @return bool Whether the session remains authenticated.
     */
    public function authenticated(bool $touch = true): bool
    {
        if (($_SESSION['authenticated'] ?? false) !== true) {
            return false;
        }
        $last = $_SESSION['last_activity'] ?? 0;
        if (!is_int($last) || time() - $last >= 3600 || $last > time()) {
            $this->destroy();
            return false;
        }
        if ($touch) {
            $_SESSION['last_activity'] = time();
        }
        return true;
    }
    /**
     * Rotate the session identifier and CSRF token after password verification.
     */
    public function login(): void
    {
        session_regenerate_id(true);
        $_SESSION = ['authenticated' => true, 'last_activity' => time(), 'csrf' => bin2hex(random_bytes(32))];
    }
    /**
     * Delete server-side session state and expire its browser cookie.
     */
    public function destroy(): void
    {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            $params = session_get_cookie_params();
            session_destroy();
            setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $params['path'], 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Strict']);
        }
    }
    /**
     * Compare the submitted token with the current session token.
     * @param string $token Token supplied in the request header or logout body.
     * @throws ApiException If token validation fails.
     */
    public function requireCsrf(string $token): void
    {
        if ($token === '' || !isset($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $token)) {
            throw new ApiException('Invalid request token. Refresh the authentication status.', 403);
        }
    }
}
