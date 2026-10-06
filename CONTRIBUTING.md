# Contributing to phpMongo

Thank you for helping improve phpMongo. Documentation fixes, reproducible bug reports, accessibility improvements, and focused code changes are welcome. Please follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

Read the [README](README.md), [v1 scope](docs/v1-scope.md), and relevant [architecture decisions](docs/adr/). Version one is a private, read-only MongoDB explorer. Changes must preserve master-password authentication, encrypted session credentials, local access defaults, and bounded database responses.

For a substantial feature or architecture change, discuss the proposal in a repository issue before investing in an implementation. Small fixes and documentation improvements can go straight to a pull request.

## Report a bug

Open an [issue](https://github.com/phpmongolab/phpmongo/issues) with:

- A concise description and the expected versus actual behavior.
- Steps to reproduce, ideally with a small synthetic document or filter.
- Your operating system, PHP version, MongoDB extension version, MongoDB server version, and browser.
- Sanitized error messages or screenshots.

Never include connection credentials, session cookies, encryption keys, private configuration, or real customer documents. For suspected security vulnerabilities, use GitHub's private vulnerability reporting if enabled; otherwise contact a maintainer through an available private channel before publishing exploit details.

## Set up development

Requirements: PHP 8.2+, MongoDB extension 2.5+, Composer, a Node.js version supported by the locked Vite toolchain, npm, and a reachable MongoDB 5.0+ server. Integration tests also need `mongod`, PHP's curl extension, and Playwright Chromium.

```sh
composer install
npm ci
npm run build
cp config/phpmongo-config.example.php config/phpmongo-config.php
```

Set your own master password in the copied configuration, then start the backend:

```sh
php -S 127.0.0.1:8080 -t public public/router.php
```

For frontend development, run `npm run dev` in another terminal. See [frontend development](docs/frontend.md) for the API proxy configuration. Only expose `public/` through your PHP web server.

## Make a focused change

- Follow the surrounding PHP and TypeScript conventions; use strict types and clear names.
- Document public PHP classes and methods with phpDocumentor DocBlocks.
- Add meaningful checks for changed behavior, especially authentication, input validation, and resource limits.
- Keep icons as SVG files in `public/assets/icons/`; retain third-party provenance and licenses.
- Update user-facing documentation when setup or behavior changes.
- Keep generated dependencies, release archives, private configuration, and runtime data out of commits.

## Validate your work

Run checks appropriate to the change:

```sh
composer validate --strict
composer test
npm run build
npx playwright install chromium
npm run test:browser
composer docs
```

Backend and browser integration tests create their own temporary MongoDB instances; they do not modify an existing instance. Browser evidence is saved in `test-results/`. Generate screenshots with synthetic fixtures and copy selected images to `docs/images/` when updating the README.

Release maintainers can build and verify the distributable with:

```sh
python3 scripts/package-release.py
python3 scripts/verify-release.py
```

## Submit a pull request

Explain the problem, what changes for users, and how you verified the result. Link the relevant issue if one exists. Include screenshots for visible changes and identify any untested platforms or remaining limitations. Keep each pull request focused so it can be reviewed on its own.

Contributions to the project are made under the [MIT License](LICENSE). Third-party material must retain its applicable license and attribution.
