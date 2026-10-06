# Backend setup and API

The Slim backend and React interface are implemented. See [frontend development](frontend.md) to build the assets. The release ZIP includes built assets and production dependencies; see [installation](../INSTALL.md).

## Requirements

- PHP 8.2+ with JSON, sessions, OpenSSL, and MongoDB extension 2.5+.
- Composer for development; the release ZIP will contain `vendor/`.
- MongoDB 5.0+ for the computed projection operators. Integration verification currently covers MongoDB 7.0 and PHP 8.3 on Linux; Windows/macOS local packages need release validation.
- PHP must be able to create the private `var/` storage directory outside the document root.

## Start locally

```sh
composer install
cp config/phpmongo-config.example.php config/phpmongo-config.php
```

Edit the copied file and set `security.master_password`. Then run:

```sh
php -S 127.0.0.1:8080 -t public public/router.php
```

Run `npm ci` and `npm run build` before opening `http://127.0.0.1:8080` to use the React dashboard. Without built assets, the entry page describes the backend.

First execution hashes the password and generates the encryption secret through locked atomic config replacement. The generated config is private (mode 0600 on Unix). Both the file and its parent directory need suitable ownership and write permissions for replacement. Configure the web server to serve **only `public/`**, never the repository root.

If automatic conversion fails, an intact cleartext config with an existing valid encryption key can still authenticate and returns a persistent warning displayed in the UI. Missing encryption keys or corrupt config block setup. For immutable configs, supply a password hash and securely generated key yourself before starting:

```sh
php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'
```

Keep that key private. Never reuse the example's empty values or derive a key from host metadata. Master-password recovery is local: update the private configuration, replacing the hash with a new initial password, then invalidate existing session files while the server is stopped.

Apache can use `public/.htaccess` with URL rewriting enabled. Nginx must use `public/` as its root and forward application and asset requests through `index.php` when relying on its peer/host access boundary. A configuration that serves assets directly must enforce the same access boundary at the web-server layer. Reverse proxies must deny external access themselves for local deployments: PHP's loopback peer check sees the proxy, not the original client. Forwarded headers are deliberately not trusted. Explicit remote deployments require `force_local_boundary=false` and an HTTPS-aware PHP server configuration.

## Request sequence

All API responses are JSON with `Cache-Control: no-store`. Retain the HttpOnly session cookie.

1. `GET /api/auth/status` returns authentication state and an anonymous `csrf_token`.
2. `POST /api/auth/login` with `{"password":"…"}` and `X-CSRF-Token` authenticates and rotates both the session ID and token. Retain the new token.
3. `POST /api/connection` with `{"uri":"mongodb://…"}` and the new token verifies the database connection and stores only its encrypted URI in the session.
4. Use the read-only data endpoints below.
5. `POST /api/auth/logout` destroys the session; `DELETE /api/connection` clears only the database connection. Both require the token.

Mutation HTTP methods exist only for application login/session/connection state, never for MongoDB document or schema changes. All unsafe methods require CSRF validation. A best-effort logout beacon can submit an URL-encoded `csrf_token`; hiding a tab must not automatically log out another active tab.

| Method | Endpoint | Parameters |
| --- | --- | --- |
| GET | `/api/health` | None; setup must already be valid |
| GET | `/api/ui` | Public sponsorship content only |
| GET | `/api/auth/status` | None |
| POST | `/api/auth/login` | JSON `password` |
| POST | `/api/auth/logout` | CSRF token |
| POST | `/api/connection` | JSON `uri` |
| DELETE | `/api/connection` | None |
| GET | `/api/data/structure` | None |
| GET | `/api/data/documents` | `db`, `collection`, optional `filter`, `sort`, `page` |
| GET | `/api/data/document-details` | `db`, `collection`, `id`, `id_type`, optional `field` |

URL-encode JSON query parameters. Filters require an object root and preserve Extended JSON types. For example:

```json
{"_id":{"$oid":"651c3d82a1b9c8d7e6f5a4b3"}}
```

Supported identifier types are exactly `ObjectId`, `Int32`, `Int64`, and `String`. Numeric formats and ranges are checked. Other BSON identifier types are outside this first foundation.

`sort` is a JSON object with up to four field directions (`1` or `-1`); `_id` is appended when absent. Pages are 1–200 with 50 results per page. A non-null `next_page` means a next-page request may be attempted, not that an additional document is guaranteed. Concurrent changes can shift pages.

## Bounded document format

Preview and detail records use field descriptors rather than ambiguous raw placeholder strings:

```json
{
  "identifier": {"$oid":"651c3d82a1b9c8d7e6f5a4b3"},
  "identifier_omitted": false,
  "fields": [
    {"name":"customer","type":"object","value":"[Object Object]","truncated":true}
  ],
  "field_count": 4,
  "truncated": true
}
```

The grid can render these descriptors as flat columns while retaining BSON type and truncation metadata. Identifiers and field values use canonical Extended JSON: numeric values retain wrappers such as `$numberInt` and `$numberLong`, preserving exact large integers for JavaScript clients. `truncated` is conservative: bounded responses are not asserted to be unrestricted originals.

- Preview: first 20 eligible top-level fields, 64 characters per string, summaries for objects/arrays, binary omitted.
- Detail: first 20 eligible fields per object, first 20 array elements, two container-expansion levels, 1,024 characters per string, binary omitted.
- Fields with names exceeding 128 bytes are omitted. `field_count` reports the original count.
- BSON identifiers exceeding 512 bytes are omitted explicitly instead of passing oversized identifiers to PHP.
- Database-side size guards collapse oversized projected records to identifier/count metadata with `size_limited=true`. Refine the filter or request a smaller `field` path.
- Optional detail `field` selects a bounded dot-path view of the same document; it never disables clipping.
- Query runtime is limited to five seconds, with separate driver connection/socket timeouts.
- Complete serialized preview responses cannot exceed 1 MiB; detail responses cannot exceed 2 MiB. An additional final encoder check returns HTTP 413 if required.

Stored binary, JavaScript, and regex values are represented as omitted-value labels. There is no unrestricted full-document or binary-download route.

Errors use `{"error":"…"}`. Invalid inputs return 400; authentication/session failures 401; disallowed operators and system databases 403; missing documents 404; unavailable methods 405; exceeded limits 413; connection verification failures 422; login throttling 429; setup failures 503. Unexpected database errors are sanitized and return 500, without echoing driver messages or connection credentials.

## Verification

```sh
composer validate --strict
composer audit
composer test
```

Tests need the PHP curl extension and `mongod` on PATH in addition to the app prerequisites. They start their own loopback MongoDB and PHP processes with temporary database storage; they do not use or change an existing MongoDB instance. Test data includes large and adversarial documents, typed identifiers, invalid operators, session tampering, idle expiry, and absent write routes.

If testing with an isolated extension rather than an enabled php.ini module:

```sh
PHPMONGO_TEST_EXTENSION=/absolute/path/mongodb.so \
  php -d extension=/absolute/path/mongodb.so tests/run.php
```

`PHPMONGO_CONFIG` is a server-process environment override for an alternative private config path; it cannot be supplied through HTTP. Tests use it to avoid creating real administrator credentials.

## Generated PHP API reference

Public classes and methods carry phpDocumentor DocBlocks describing parameters, return types, exceptions, and security boundaries. Generate the reference with:

```sh
composer docs
```

Open `docs/api/index.html`. The `phpdoc.dist.xml` configuration scans only `src/`, excluding private configuration, runtime sessions, tests, and dependencies. Generated HTML is ignored by version control and can be recreated; the source DocBlocks and generator configuration are retained.

phpDocumentor is installed through its official Composer shim as a development dependency. Production dependency installation uses `composer install --no-dev`, excluding the documentation generator from the release ZIP. The shim's downloaded PHAR is signature-verified during installation.
