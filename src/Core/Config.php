<?php
/**
 * Loads private configuration and atomically bootstraps password hashes and encryption keys.
 */
declare(strict_types=1);
namespace PhpMongo\Core;
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
            throw new ApiException('Setup required: copy config/phpmongo-config.example.php to config/phpmongo-config.php and set a master password.', 503);
        }
        // Lock a separate inode: the config inode changes during atomic replacement.
        $lock = @fopen(dirname($path) . '/phpmongo-config.lock', 'c');
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
            return $config;
        } finally {
            if ($lock !== false) {
                flock($lock, LOCK_UN);
                fclose($lock);
            }
        }
    }
    private static function read(string $path): array
    {
        try {
            $config = (static fn(string $file) => require $file)($path);
        } catch (\Throwable) {
            throw new ApiException('Configuration cannot be read. Repair config/phpmongo-config.php manually.', 503);
        }
        if (!is_array($config)) {
            throw new ApiException('Configuration must return an array.', 503);
        }
        return $config;
    }
    private static function replace(string $path, array $config): bool
    {
        if (!is_writable($path) || !is_writable(dirname($path))) {
            return false;
        }
        $tmp = @tempnam(dirname($path), '.phpmongo-');
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
