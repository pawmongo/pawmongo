# phpMongo frontend

The `frontend` branch contains the Next.js application. The PHP backend remains on `main` and runs separately.

## Development

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Without `PHPMONGO_API_URL`, the app opens an authenticated demo workspace with sample orders, products, notes, and companies. PHP and MongoDB are not required.

Demo changes persist across refreshes within each browser session, but are temporary in server memory. Sessions expire after one hour of inactivity and restarting Next.js clears them. **Reset demo** restores the sample data. CRUD, imports, filters, pagination, indexes, validation, and common aggregation stages work against the samples; unsupported operators return an error. Monitoring and Explain show simulated results.

Set `PHPMONGO_API_URL` to use a real PHP backend. `PHPMONGO_MOCK_DATA=1` forces demo mode; `PHPMONGO_MOCK_DATA=0` disables it (the default real backend address is http://127.0.0.1:8080). The frontend dev command starts Next.js only.

## Production and checks

```sh
npm run build
npm start
npm run typecheck
npm run test:mock
npm run test:assets
npm run test:import
```

The import parser check requires Node.js 22.18 or later. Node.js, Next.js, React, Tailwind, Font Awesome, and the locally bundled Libre Franklin fonts power the interface. Icons in `public/assets/icons/` are copied into Next.js public assets during build.

The interface includes database and collection navigation, document views and editing, imports, query tools, aggregation, schema analysis, indexes, validation, monitoring, charts, and Light/Dark modes. Real database actions require the PHP API and its authenticated MongoDB connection.
