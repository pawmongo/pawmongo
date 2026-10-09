<?php
/**
 * Loads private configuration and atomically bootstraps password hashes and encryption keys.
 */
declare(strict_types=1);
namespace PawMongo\Core;
/**
 * Loads private configuration and atomically bootstraps password hashes and encryption keys.
 */
final class Config
{
    /**
     * Load and validate private configuration under a separate lock inode.
     * The optional access check runs before password or key bootstrap. A failed
     * atomic replacement preserves the intact original; missing keys block setup.
     * @param string $path Absolute path to the private PHP configuration file.
     * @param string $root Project root containing private runtime storage.
     * @param callable(array<string, mixed>): void|null $boundary Optional entry-point access check.
     * @return array<string, mixed> Configuration including warnings and storage path.
     * @throws ApiException If configuration or secure bootstrap cannot be completed.
     */
    public static function load(string $path, string $root, ?callable $boundary = null): array
    {
        if (!is_file($path)) {
            throw new ApiException('Setup required: copy lib/config/pawmongo-config.example.php to config/pawmongo-config.php and set a master password.', 503);
        }
        // Lock a separate inode: the config inode changes during atomic replacement.
        $lock = @fopen(dirname($path) . '/pawmongo-config.lock', 'c');
        if ($lock !== false && !flock($lock, LOCK_EX)) {
            fclose($lock);
            throw new ApiException('Configuration is busy. Retry setup.', 503);
        }
        try {
            $config = self::read($path);
            if ($boundary !== null) {
                $boundary($config); // Enforce access before generating secrets or rewriting configuration.
            }
            $security = $config['security'] ?? null;
            if (!is_array($security)) {
                throw new ApiException('Invalid security configuration. Repair the configuration file.', 503);
            }
            $password = $security['master_password'] ?? '';
            $hash = $security['master_password_hash'] ?? '';
            $key = $security['encryption_key'] ?? '';
            if (!is_string($password) || !is_string($hash) || !is_string($key) ||
                ($password === '' && ($hash === '' || (password_get_info($hash)['algoName'] ?? 'unknown') === 'unknown'))) {
                throw new ApiException('Set a valid master password or password hash in the configuration file.', 503);
            }
            if ($key !== '' && !preg_match('/^[a-fA-F0-9]{64}$/D', $key)) {
                throw new ApiException('The encryption key must contain exactly 64 hexadecimal characters.', 503);
            }
            $config['security']['master_password'] = $password;
            $config['security']['master_password_hash'] = $hash;
            $config['security']['encryption_key'] = $key;
            if ($password !== '' && strlen($password) > 72 && !defined('PASSWORD_ARGON2ID')) {
                throw new ApiException('This PHP build limits initial master passwords to 72 bytes. Supply a supported password hash instead.', 503);
            }
            $updated = $config;
            if ($key === '') {
                $updated['security']['encryption_key'] = bin2hex(random_bytes(32));
            }
            if ($password !== '') {
                $updated['security']['master_password_hash'] = password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
                $updated['security']['master_password'] = '';
            }
            $warnings = [];
            if ($updated !== $config) {
                $saved = $lock !== false && self::replace($path, $updated);
                if ($saved) {
                    $config = $updated;
                } elseif ($key === '') {
                    throw new ApiException('Setup blocked: cannot save the encryption key. Adjust configuration directory ownership/permissions, or insert a securely generated 64-character hex key manually.', 503);
                } else {
                    $warnings[] = 'Security Warning: Configuration conversion failed. Your master password remains in cleartext. Adjust configuration file and directory ownership/permissions.';
                }
            }
            $local = $config['security']['force_local_boundary'] ?? true;
            if (!is_bool($local)) {
                throw new ApiException('force_local_boundary must be a boolean.', 503);
            }
            $config['security']['force_local_boundary'] = $local;
            $config['warnings'] = $warnings;
            $config['storage'] = $root . '/var';
            $config['config_path'] = $path;
            return $config;
        } finally {
            if ($lock !== false) {
                flock($lock, LOCK_UN);
                fclose($lock);
            }
        }
    }
    /**
     * Return setup settings only when no master credentials have been configured.
     * Missing files use the shipped local-only template; corrupt files fail closed.
     * @param string $path Private configuration path.
     * @param string $root Application root containing the example template.
     * @return array<string, mixed>|null Pending settings, or null after configuration.
     * @throws ApiException If the configuration is malformed.
     */
    public static function setupSettings(string $path, string $root): ?array
    {
        clearstatcache(true, $path);
        if (function_exists('opcache_invalidate') && is_file($path)) {
            @opcache_invalidate($path, true);
        }
        $config = self::read(is_file($path) ? $path : dirname(__DIR__) . '/config/pawmongo-config.example.php');
        $security = $config['security'] ?? null;
        if (!is_array($security) || !is_string($security['master_password'] ?? '') || !is_string($security['master_password_hash'] ?? '')) {
            throw new ApiException('Invalid security configuration. Repair the configuration file.', 503);
        }
        if (($security['master_password'] ?? '') !== '' || ($security['master_password_hash'] ?? '') !== '') {
            return null;
        }
        $key = $security['encryption_key'] ?? '';
        if (!is_string($key) || ($key !== '' && !preg_match('/^[a-fA-F0-9]{64}$/D', $key))) {
            throw new ApiException('Invalid encryption key. Repair the configuration file.', 503);
        }
        return $config;
    }
    /**
     * Create first-run credentials under the same lock used by normal bootstrap.
     * Writes only a password hash and random encryption key, using atomic replacement.
     * @param string $path Private configuration path.
     * @param string $root Application root.
     * @param string $password Chosen master password, at least 12 characters.
     * @throws ApiException If setup was completed, input is invalid, or saving fails.
     */
    public static function initialize(string $path, string $root, string $password): void
    {
        if (preg_match_all('/./us', $password) < 12 || strlen($password) > 4096 || (!defined('PASSWORD_ARGON2ID') && strlen($password) > 72)) {
            throw new ApiException('Choose a master password of at least 12 characters (maximum 72 bytes on PHP builds without Argon2).');
        }
        $lock = @fopen(dirname($path) . '/pawmongo-config.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            if ($lock !== false) fclose($lock);
            throw new ApiException('Setup cannot write the configuration directory. Adjust its ownership and permissions.', 503);
        }
        try {
            $config = self::setupSettings($path, $root);
            if ($config === null) {
                throw new ApiException('Setup has already been completed. Sign in with your master password.', 409);
            }
            $config['security']['master_password'] = '';
            $config['security']['master_password_hash'] = password_hash($password, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT);
            if (($config['security']['encryption_key'] ?? '') === '') {
                $config['security']['encryption_key'] = bin2hex(random_bytes(32));
            }
            if (!self::replace($path, $config)) {
                throw new ApiException('Setup cannot save the private configuration. Adjust file and directory ownership and permissions, then retry.', 503);
            }
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
    private static function read(string $path): array
    {
        try {
            $config = (static fn(string $file) => require $file)($path);
        } catch (\Throwable) {
            throw new ApiException('Configuration cannot be read. Repair config/pawmongo-config.php manually.', 503);
        }
        if (!is_array($config)) {
            throw new ApiException('Configuration must return an array.', 503);
        }
        return $config;
    }
    public static function saveConnection(string $path, string $encryptedUri): void
    {
        $lock = @fopen(dirname($path) . '/pawmongo-config.lock', 'c');
        if ($lock === false) throw new ApiException('Cannot save MongoDB connection. Check configuration directory permissions.', 503);
        try {
            if (!flock($lock, LOCK_EX)) throw new ApiException('Configuration is busy. Try again.', 503);
            $config = self::read($path);
            $config['mongodb']['encrypted_uri'] = $encryptedUri;
            if (!self::replace($path, $config)) throw new ApiException('Cannot save MongoDB connection. Check configuration file and directory permissions.', 503);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
    private static function replace(string $path, array $config): bool
    {
        if ((is_file($path) && !is_writable($path)) || !is_writable(dirname($path))) {
            return false;
        }
        $tmp = @tempnam(dirname($path), '.pawmongo-');
        if ($tmp === false) {
            return false;
        }
        try {
            @chmod($tmp, 0600);
            $stream = @fopen($tmp, 'wb');
            if ($stream === false) {
                return false;
            }
            $content = "<?php\nreturn " . var_export($config, true) . ";\n";
            try {
                $offset = 0;
                while ($offset < strlen($content)) {
                    $n = @fwrite($stream, substr($content, $offset));
                    if (!$n) {
                        return false;
                    }
                    $offset += $n;
                }
                if (!fflush($stream) || (function_exists('fsync') && !fsync($stream))) {
                    return false;
                }
            } finally {
                fclose($stream);
            }
            if (!@rename($tmp, $path)) {
                return false;
            }
            clearstatcache(true, $path);
            if (function_exists('opcache_invalidate')) {
                @opcache_invalidate($path, true);
            }
            return true;
        } finally {
            if (is_file($tmp)) {
                @unlink($tmp);
            }
        }
    }
}
