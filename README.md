# PawMongo — Document Explorer

MongoDB document browser with the existing Compass-style interface. Next.js is
used only to build and develop the client-rendered theme. PHP handles all API
requests through the MongoDB PHP library.

## Getting started

Run commands from the repository root:

```bash
npm run install:theme
npm run install:php
npm run dev
```

Requires Node.js for development/builds, Composer for installing PHP dependencies,
and PHP 8.2+ with MongoDB extension 2.5+, OpenSSL, JSON, and sessions.
The ZIP already includes PHP dependencies.

Development starts Next.js at `http://127.0.0.1:3000` and PHP at
`http://127.0.0.1:8080`. Next.js forwards `/api/*` to PHP and serves the client
shell for database and collection URLs. Set `PORT` and `PHP_PORT` to change
these ports. Stopping either server stops both.

## Rendering and backend

`themes/` contains the unchanged interface components and styles. The application
is mounted with `ssr: false`; browser history handles navigation between database,
collection, monitoring, and visualization views. Next.js has no API route handlers,
server-side database client, or runtime rendering of the application.

`lib/BrowserApplication.php`, `lib/Handlers/BrowserController.php`, and
`lib/Database/BrowserStore.php` implement the existing theme API in PHP.
Third-party libraries, including the MongoDB driver, live in `lib/vendor/`.
The previously restored master-password API is retained for compatibility under
`PAWMONGO_LEGACY_API=1`; it is not used by the current theme.

Set `MONGODB_URI` in the PHP server environment, or reuse the encrypted connection
in `config/pawmongo-config.php`. `PAWMONGO_CONFIG` or `PAWMONGO_CONFIG_PATH` can
select another private configuration file. Credentials are never sent to the
browser. There is no new authentication screen: this remains a local administrator
installation, restricted to loopback hosts and same-origin browser requests.
Disconnect persists in an HTTP-only cookie; Reconnect verifies the database.
The existing Log Out control disconnects the local connection.

The database account controls available operations. System databases and
collections are protected. Metrics are unavailable when monitoring permissions
are absent. Queries use server pagination; field discovery samples at most 1,000
documents. Bulk imports use batches of 500. Exports retain BSON IDs in Extended JSON.

## Build and download

```bash
npm run build
npm start
```

Build exports the client-only theme to `themes/out/` and creates
`download/pawmongo.zip` and `download/pawmongo.zip.sha256`. The ZIP includes PHP
source/dependencies, theme source, and static HTML/JS/CSS. Local credentials,
environment secrets, sessions, logs, build caches, and Node dependencies are excluded.

Extract the ZIP and run `npm start` in its `pawmongo/` folder. Production uses PHP
to serve both the static theme and API on port 3000; there is no Next.js production
server. Set `PORT` to change the port. Without Node.js, start PHP directly:

```bash
php -S 127.0.0.1:3000 -t lib/public lib/public/router.php
```

For Apache, expose only `lib/public/` and enable its rewrite rules. Configuration
and private runtime storage remain in root `config/` and `var/`. On a fresh
installation, supply `MONGODB_URI` in the server environment or a verified saved
configuration. Production database and collection deep links serve the same CSR shell.

## Commands and checks

- `npm run dev`: Next.js development server and PHP API together.
- `npm start`: PHP serving the built CSR theme and API.
- `npm run build`: static theme export and download ZIP.
- `npm run package`: repackage an existing static build.
- `npm run dev:theme` / `npm run dev:php`: individual development servers.
- `npm test`: TypeScript, legacy PHP integration, and current PHP API integration checks.
- `npm run test:api`: isolated MongoDB and HTTP tests of the current theme API.
- `npm run test:live`: checks against a running instance; creates and removes a
  temporary collection in `modvell_test`. Set `TEST_DATABASE` and `TEST_API_URL`
  for another authorized database and instance.
