# Install phpMongo v1.0.0

The release ZIP includes production PHP dependencies and the compiled React interface. Node.js, npm, Composer, Redis, and a frontend build are not required to run the extracted release.

## Prerequisites

- PHP 8.2+ with sessions, JSON, OpenSSL, and the native MongoDB extension **2.5+**.
- A reachable MongoDB server **5.0+**. Outbound access is required for remote databases.
- A PHP process able to write the private `config/` directory during initial setup and create private runtime storage in `var/`.

The ZIP deliberately contains no `.dll` or `.so` extension binaries. Install a driver build matching your PHP version, architecture, thread-safety mode, and operating system. Run `php --ini` to locate the active configuration; enable `extension=mongodb`, restart your PHP server, and verify with `php --ri mongodb`. Apache/FPM and the CLI can use different PHP installations and ini files.

For XAMPP/WampServer use the matching Windows build; for MAMP use its selected PHP executable and extension directory. Follow the [official driver installation guide](https://www.php.net/manual/en/mongodb.installation.php). Missing runtime requirements show the application's pre-flight guide.

## Extract and configure

1. Extract the ZIP to a private directory outside your web server's document root.
2. Copy `config/phpmongo-config.example.php` to `config/phpmongo-config.php`.
3. Edit the copied file and set `security.master_password` to your chosen password. Keep the configuration private; it is never a public web file.
4. Start the local server from the extracted `phpmongo-1.0.0/` directory:

```sh
php -S 127.0.0.1:8080 -t public public/router.php
```

Open **http://127.0.0.1:8080**. For MAMP or other packages, substitute the appropriate PHP executable. Windows users can copy the template in Explorer; Unix users can use `cp config/phpmongo-config.example.php config/phpmongo-config.php`.

First execution hashes the master password and generates a random encryption key by atomic config replacement. Both the config file and directory must allow the PHP process to perform replacement. On Unix, prefer owner-only permissions and matching ownership; do not make the directory world-writable. Missing keys or corrupt configuration block startup. Follow any setup error before continuing.

Unlock the application with the master password, then enter your MongoDB connection URI. Credentials stay in an encrypted server-side session. Browsing is read-only, including when the supplied MongoDB account has write permissions. Logout removes the session; the idle timeout is one hour. Closing or reloading the tab sends a best-effort logout notification.

## Apache and Nginx

Configure the document root to **only `public/`**, with URL rewriting enabled. Apache's supplied `.htaccess` routes requests through the access boundary. For Nginx, forward application and asset requests through `public/index.php`, or enforce equivalent peer and host restrictions in the server configuration. Never expose `config/`, `src/`, `vendor/`, or `var/`.

Loopback access is the default. Remote access requires an explicit configuration change and native HTTPS; forwarded headers are not trusted. See [backend setup](docs/backend.md) before changing this boundary.

## Verification and known limits

The release is verified on Linux with PHP 8.3 and MongoDB 7.0. Windows/macOS package installation has not been tested here. Filters, previews, and details are deliberately bounded; see [the API guide](docs/backend.md). Cross-platform extension installation remains the operator's responsibility.

The adjacent `.zip.sha256` file verifies the downloaded archive. `release-manifest.json` lists SHA-256 hashes of every packaged file except itself; initial config and runtime storage are created locally and are never shipped.

Developer sources, tests, and phpDocumentor tooling remain in the source workspace. See [frontend development](docs/frontend.md) and [backend documentation](docs/backend.md) for rebuilding and generating the PHP API reference.
