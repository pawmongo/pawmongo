<?php
/**
 * Verifies MongoDB connections and authenticates encrypted session credentials.
 */
declare(strict_types=1);
namespace PawMongo\Core;
use MongoDB\Client;
/**
 * Verifies MongoDB connections and authenticates encrypted session credentials.
 */
final class ConnectionHandler
{
    private string $key;
    /**
     * Initialize the cipher with a validated, dedicated configuration secret.
     * @param array<string, mixed> $config Bootstrapped configuration.
     * @param Session $session Session to invalidate on integrity failure.
     * @throws ApiException If the encryption key is invalid.
     */
    public function __construct(private readonly array $config, private readonly Session $session)
    {
        $key = hex2bin($config['security']['encryption_key']);
        if ($key === false || strlen($key) !== 32) {
            throw new ApiException('Invalid encryption configuration.', 503);
        }
        $this->key = $key;
    }
    /**
     * Verify a MongoDB URI before caching its encrypted session representation.
     * Clears the previous connection before attempting a new one. Driver errors
     * are sanitized and persistent driver clients are disabled.
     * @param string $uri MongoDB connection URI, never returned to the browser.
     * @throws ApiException If URI validation or connection verification fails.
     */
    public function establish(string $uri): void
    {
        unset($_SESSION['mongo_conn']);
        if (strlen($uri) > 8192 || !preg_match('~^mongodb(?:\+srv)?://~', $uri)) {
            throw new ApiException('Supply a valid mongodb:// or mongodb+srv:// URI.');
        }
        if (preg_match('/[?&](?:tlsInsecure|tlsAllowInvalidCertificates|tlsAllowInvalidHostnames|tlsDisableOCSPEndpointCheck|tlsDisableCertificateRevocationCheck)=/i', $uri)) {
            throw new ApiException('Connection options that bypass TLS verification are disabled.');
        }
        try {
            $client = $this->client($uri);
            $client->selectDatabase('admin')->command(['ping' => 1], ['maxTimeMS' => 5000])->toArray();
        } catch (\Throwable) {
            throw new ApiException('Connection verification failed. Check credentials, network access, and TLS settings.', 422);
        }
        $encrypted = $this->encrypt($uri);
        Config::saveConnection($this->config['config_path'], $encrypted);
        $_SESSION['mongo_conn'] = $encrypted;
    }
    /** Restore private saved credentials only after master-password authentication. */
    public function restore(): bool
    {
        if (!$this->session->authenticated()) return false;
        $saved = $this->config['mongodb']['encrypted_uri'] ?? '';
        if ($saved === '') return false;
        $_SESSION['mongo_conn'] = $saved;
        $this->uri(); // Authenticate the saved envelope before activating it.
        return true;
    }
    /**
     * Create an AES-256-GCM envelope with a fresh IV and authenticated context.
     * @param string $uri Plaintext connection URI.
     * @return string Base64-encoded IV, 16-byte tag, and ciphertext.
     * @throws ApiException If encryption fails.
     */
    public function encrypt(string $uri): string
    {
        $iv = random_bytes(12);
        $tag = '';
        $ciphertext = openssl_encrypt($uri, 'aes-256-gcm', $this->key, OPENSSL_RAW_DATA, $iv, $tag, 'pawmongo-uri-v1', 16);
        if ($ciphertext === false || strlen($tag) !== 16) {
            throw new ApiException('Cannot secure the connection session.', 503);
        }
        return base64_encode($iv . $tag . $ciphertext);
    }
    /**
     * Authenticate and decrypt the active connection, invalidating corrupted sessions.
     * @return string Verified connection URI for server-side use only.
     * @throws ApiException If the connection is missing or its integrity fails.
     */
    public function uri(): string
    {
        if (!isset($_SESSION['mongo_conn'])) {
            throw new ApiException('No active database connection.', 401);
        }
        $encoded = $_SESSION['mongo_conn'];
        $raw = is_string($encoded) ? base64_decode($encoded, true) : false;
        $uri = false;
        if ($raw !== false && strlen($raw) > 28 && strlen($raw) <= 8220) {
            $uri = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $this->key, OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16), 'pawmongo-uri-v1');
        }
        if ($uri === false || !preg_match('~^mongodb(?:\+srv)?://~', $uri)) {
            $this->session->destroy();
            throw new ApiException('Connection session integrity failed. Log in again.', 401);
        }
        return $uri;
    }
    /**
     * Create a nonpersistent MongoDB client from the active authenticated envelope.
     * @return Client Client with connection and socket timeouts.
     * @throws ApiException If there is no valid connection context.
     */
    public function activeClient(): Client
    {
        return $this->client($this->uri());
    }
    /** Local CSR backend reuses the saved, authenticated envelope without exposing its URI. */
    public function savedClient(): Client
    {
        $encoded = $this->config['mongodb']['encrypted_uri'] ?? '';
        $raw = is_string($encoded) ? base64_decode($encoded, true) : false;
        $uri = false;
        if ($raw !== false && strlen($raw) > 28 && strlen($raw) <= 8220) {
            $uri = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $this->key, OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16), 'pawmongo-uri-v1');
        }
        if (!is_string($uri) || !preg_match('~^mongodb(?:\+srv)?://~', $uri)) {
            throw new ApiException('No verified saved database connection.', 503);
        }
        return $this->client($uri);
    }
    private function client(string $uri): Client
    {
        return new Client($uri, [
            'serverSelectionTimeoutMS' => 5000,
            'connectTimeoutMS' => 5000,
            'socketTimeoutMS' => 8000,
        ], ['disableClientPersistence' => true, 'typeMap' => ['root' => 'array', 'document' => 'stdClass', 'array' => 'array']]);
    }
}
