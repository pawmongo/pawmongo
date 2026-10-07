import { defineConfig, type Plugin } from 'vite';
import { readFile } from 'node:fs/promises';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// Serve only the public SVG icons, without depending on PHP or exposing PHP files.
function publicIcons(): Plugin {
  const directory = fileURLToPath(new URL('../public/assets/icons/', import.meta.url));
  return {
    name: 'phpmongo-public-icons',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = (request.url ?? '').split('?')[0];
        if (!path.startsWith('/assets/icons/')) return next();
        const match = /^\/assets\/icons\/([a-z0-9-]+\.svg)$/.exec(path);
        if (!match || !['GET', 'HEAD'].includes(request.method ?? 'GET')) {
          response.statusCode = 404;
          response.end('Icon not found.');
          return;
        }
        readFile(directory + match[1]).then(content => {
          response.setHeader('Content-Type', 'image/svg+xml');
          response.setHeader('X-Content-Type-Options', 'nosniff');
          response.setHeader('Cache-Control', 'no-store');
          response.end(request.method === 'HEAD' ? undefined : content);
        }).catch(() => {
          response.statusCode = 404;
          response.end('Icon not found.');
        });
      });
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: false,
  cacheDir: process.env.PHPMONGO_VITE_CACHE_DIR,
  plugins: [publicIcons(), react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    proxy: { '/api': { target: process.env.PHPMONGO_API_URL ?? 'http://127.0.0.1:8080', changeOrigin: true } },
  },
  build: { assetsInlineLimit: 0, outDir: '../var/frontend-build', emptyOutDir: true, assetsDir: 'assets' },
});
