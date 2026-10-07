# phpMongo frontend

The `frontend` branch contains the Next.js application. The PHP backend remains on `main` and runs separately.

## Development

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. API requests are proxied to http://127.0.0.1:8080 by default. Set `PHPMONGO_API_URL` to use a different PHP backend address. The frontend dev command starts Next.js only.

## Production and checks

```sh
npm run build
npm start
npm run typecheck
npm run test:assets
npm run test:import
```

The import parser check requires Node.js 22.18 or later. Node.js, Next.js, React, Tailwind, Font Awesome, and the locally bundled Libre Franklin fonts power the interface. Icons in `public/assets/icons/` are copied into Next.js public assets during build.

The interface includes database and collection navigation, document views and editing, imports, query tools, aggregation, schema analysis, indexes, validation, monitoring, charts, and Light/Dark modes. Database actions require the PHP API and its authenticated MongoDB connection.
