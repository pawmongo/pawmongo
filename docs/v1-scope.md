> Scope update: administrators may now create empty collections through the authenticated, CSRF-protected creation endpoint. Document browsing remains read-only; document mutations, collection drops, and arbitrary commands remain unavailable. Theme selection offers Sage, Ocean, Sand, and Midnight. Earlier strict read-only requirements below describe the original design and are superseded only for collection creation.

# Agreed v1.0.0 scope

This document consolidates the decisions from the design interview. Requirements below define v1 behavior. The Slim backend and React UI are implemented and tested locally; release packaging is implemented; cross-platform validation remains pending.

## Product and deployment

- Private installation for one administrator, targeting local PHP development packages first.
- PHP 8.2+, Slim Framework 4, `ext-mongodb`, and `mongodb/mongodb`; React and Tailwind frontend.
- MIT license.
- ZIP distribution includes PHP dependencies and built frontend assets, but no platform-specific extension binaries. Operators install `ext-mongodb`; pre-flight checks provide guidance.
- Web document root is `public/`, with configuration and sessions outside it.
- Loopback peer access only by default (`127.0.0.1` and `::1`). Explicit `force_local_boundary=false` permits remote deployments with HTTPS and master-password authentication. Proxy trust must be configured explicitly.

## Master password and configuration

- Copy `config/phpmongo-config.example.php` to `config/phpmongo-config.php`, then enter the initial master password.
- Require master-password authentication before accepting any MongoDB credentials.
- Hash the initial password and replace the configuration using a cooperating file-lock protocol, a temporary file, and atomic rename. Do not overwrite the original in place or retain a plaintext backup.
- If conversion fails but the original configuration remains intact, permit cleartext-password login with a persistent warning describing ownership and permission repair. Do not universally prescribe mode 0644.
- Corrupt or unreadable configuration blocks panel access with repair instructions. Loading defaults must never bypass authentication.
- Generate a dedicated secret using `random_bytes(32)`, store its 64-character hex representation atomically, and decode it to 32 bytes for encryption.
- When no valid secret exists and generation cannot be persisted, block setup. No predictable fallback based on server addresses, user IDs, file paths, or the master password.

## Connection sessions

- Keep MongoDB credentials only in server-side disk-backed sessions; no database credential cookies or long-lived credential store.
- Encrypt the URI before session storage with AES-256-GCM, a fresh IV, and a 16-byte tag. Reject malformed payloads and destroy sessions on authentication failure.
- Verify the connection before establishing its active context. Missing or invalid context returns HTTP 401 before creating a database client for data endpoints.
- One-hour idle expiry: check the previous activity timestamp before refreshing it on an authenticated API request. Expired sessions are destroyed and return HTTP 401.
- Explicit logout destroys the session. Tab-close notification is best effort and cannot guarantee immediate deletion.
- Eventual physical cleanup through PHP session garbage collection is acceptable. Any application cleanup is limited to phpMongo's own session directory.

## Read-only enforcement and filters

- Accept database accounts with write permissions, but expose no mutation endpoints, arbitrary commands, shell scripts, or user-submitted pipelines.
- Block `admin`, `local`, and `config` at the backend browsing boundary, including direct requests. An internal verification ping against `admin` grants no browsing access.
- Filters require a valid Extended JSON object root; primitives and arrays are rejected. Decode with BSON-aware APIs to preserve ObjectId and date types.
- Query operator allowlist: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$and`, `$or`, `$not`, `$nor`, `$exists`, `$type`.
- Unsupported query operators return HTTP 403. Exclude `$where`, `$expr`, `$function`, `$accumulator`, and regex. Validate operator context recursively, distinguishing Extended JSON wrappers and literal document data from query operators.
- Malformed filters return HTTP 400; never silently substitute an empty filter.

## Preview and detail contracts

- Application-generated read-only aggregation uses match, sort, skip, limit, and computed projection. No write stages such as `$out` or `$merge`.
- Preview generation is schema-independent: top-level scalars, nested-object summaries, and array counts. Reduction happens inside MongoDB before values reach PHP.
- Preview response budget: **1 MiB**, including response metadata and serialized data.
- Detail response budget: **2 MiB**, including response metadata and serialized data.
- Reduce oversized strings, binary values, arrays, and nested objects on the database tier. A response-size check after fetching full oversized values is insufficient.
- Include explicit truncation metadata and bounded field expansion. No unrestricted full-document endpoint.
- Detail arrays initially expose up to 20 elements. This is an additional clipping rule, not a substitute for byte budgets.
- Detail endpoint: `GET /api/data/document-details` with `db`, `collection`, `id`, and `id_type`.
- Initial identifier types: ObjectId, Int32, Int64, and string. Validate ranges and formats strictly; reject unsupported explicit types rather than silently changing their meaning. Document the supported subset.

## Pagination and query budgets

- 50 documents per page; pages 1 through 200, with skip `(page - 1) * 50`. The final allowed skip is 9,950, covering 10,000 result positions.
- Default sort `_id: 1`; custom field sorts include `_id` as a tie-breaker when absent. Validate sort fields and directions.
- Skip pagination is not a consistent snapshot and can shift under concurrent changes. Optional keyset pagination is deferred to v2.
- Initial query runtime target: `maxTimeMS=5000`. Configure connection and transport timeouts separately; query time is not a complete HTTP request deadline.
- Return actionable limit messages without leaking connection credentials.

## Sponsorship

- Ship the login panel, sidebar, and repository README sponsorship zones in v1.
- Preserve the reserved login and sidebar frames; unconfigured zones show styled community CTAs rather than blank boxes or broken links.
- Link to working sponsorship or developer-documentation destinations. Actual project URLs and artwork are release content to establish during implementation.

## Implementation status

The Slim backend foundation implements authentication, encrypted disk-backed sessions, validated filters, and bounded read-only routes. Its bounded field-descriptor response format and installation instructions are documented in [backend setup and API](backend.md). The React interface and all three sponsorship zones are implemented. Interface verification is documented in [frontend development](frontend.md). ZIP packaging is implemented and verified on Linux. Windows/macOS release validation remains pending.
