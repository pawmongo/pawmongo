# Frontend development and verification

The React, TypeScript, Vite, and Tailwind interface is connected to the Slim backend. It includes master-password login, connection verification, database/collection discovery, direct collection opening, validated Extended JSON filters, column sorting, pagination, and bounded document/field inspection.

## Build and run

Install PHP dependencies and configure the master password as described in [backend setup](backend.md), then:

```sh
npm ci
npm run build
php -S 127.0.0.1:8080 -t public public/router.php
```

Open `http://127.0.0.1:8080`. The build writes the compiled HTML into `templates/app.html` and browser assets into `public/assets/`; it preserves the PHP entry points. Node and npm are development requirements only. A release ZIP will contain the built assets.

For live frontend development, keep the PHP server running and use a second terminal:

```sh
npm run dev
```

Open the Vite URL. API requests are proxied to PHP on port 8080. Set `PHPMONGO_API_URL` in the Vite process environment to use another local PHP port. The Vite server binds only to loopback by default.

## Interface behavior

- Password and connection fields are masked. Credentials are never written into localStorage or sessionStorage; form values are cleared after success.
- Login and database-connection steps remain separate. Master-password authentication is required before any connection URI is submitted.
- Sidebar discovery shows actual databases and collections. Direct opening supports accounts that cannot list the whole hierarchy.
- Filters use object-root Extended JSON. Ctrl/Command + Enter submits the filter. Column headers apply sorting; the backend supplies the `_id` tie-breaker.
- Result counts describe the current page, not the entire collection. Previous/next controls honor the 200-page ceiling.
- Detail dialogs retain BSON type information and conservative truncation metadata. A path such as `items.21` requests bounded expansion beyond the first array slice.
- Sign out removes authentication and connection state; disconnect retains master-password authentication. Server-side expiry clears the explorer and returns to login.
- Requests for obsolete queries are aborted so earlier collection responses do not overwrite a newer selection.
- The developer guide is available in an accessible native dialog. Desktop and narrow-screen navigation use the same live data.
- Best-effort pagehide logout applies when leaving or closing the panel, including a full-page reload. Opening an internal guide does not leave the page. Explicit logout and the server's idle check remain the reliable lifecycle controls.

## Sponsorship and icons

The login panel reserves 350×250 pixels and the sidebar 200×60 pixels on layouts with sufficient available width. Narrow screens fit the login panel within the viewport. Both zones default to styled community content linked to the built-in developer guide. README includes a populated repository community placement.

Optional server configuration can override UI sponsorship text and its destination:

```php
'sponsors' => [
    'login' => [
        'label' => 'SUPPORTED BY YOUR SPONSOR',
        'title' => 'Your sponsor title',
        'description' => 'A short sponsor description.',
        'href' => '#guide', // Or an HTTPS URL without embedded credentials.
    ],
    'sidebar' => [
        'title' => 'Your sponsor title',
        'description' => 'A short description.',
        'href' => '#guide',
    ],
],
```

The anonymous `/api/ui` endpoint exposes only bounded public sponsorship fields, never passwords, keys, or connection details. Invalid destinations retain the working guide fallback. No advertising scripts or third-party runtime requests are used.

Six colourful SVG icons traced from the supplied Drive collection live in `public/assets/icons/`. They contain vector paths, without embedded PNG data. The build preserves this canonical asset directory. [Source manifest](../public/assets/icons/sources.json) records the original PNG filenames, Drive links, and conversion provenance. Fonts are also bundled locally; the interface makes no Drive or font-provider requests at runtime.

## Checks

```sh
npm run build
npm run test:browser
```

The browser test uses Playwright, the installed PHP MongoDB extension, and `mongod`. It launches isolated MongoDB/PHP processes, seeds test-only documents, and verifies the real UI/API flow. It also checks the Vite development proxy, sponsor dimensions, credential storage, desktop/mobile navigation, forbidden filters, typed detail expansion, expiry, and unchanged database contents.

Install a matching browser when no compatible workspace browser is available:

```sh
npx playwright install chromium
```

`PHPMONGO_TEST_BROWSER` can point to an existing Chromium executable. Screenshots are generated under `test-results/`: `login.png`, `explorer.png`, `detail.png`, and `mobile.png`. These are test evidence with isolated sample data, not data from an administrator's database.
