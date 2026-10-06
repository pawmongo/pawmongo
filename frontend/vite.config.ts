import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: false,
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    proxy: { '/assets/icons': { target: process.env.PHPMONGO_API_URL ?? 'http://127.0.0.1:8080', changeOrigin: true }, '/api': { target: process.env.PHPMONGO_API_URL ?? 'http://127.0.0.1:8080', changeOrigin: true } },
  },
  build: { assetsInlineLimit: 0, outDir: '../var/frontend-build', emptyOutDir: true, assetsDir: 'assets' },
});
