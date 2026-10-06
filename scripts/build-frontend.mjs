import { build } from 'vite';
import { mkdir, cp, rename, rm, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await build({ configFile: `${root}frontend/vite.config.ts` });
await mkdir(`${root}templates`, { recursive: true });
await mkdir(`${root}public/assets/icons`, { recursive: true });
for (const name of await readdir(`${root}public/assets`)) {
  if (name !== 'icons') await rm(`${root}public/assets/${name}`, { recursive: true, force: true });
}
await cp(`${root}var/frontend-build/assets`, `${root}public/assets`, { recursive: true });
await rename(`${root}var/frontend-build/index.html`, `${root}templates/app.html`);
console.log('Built frontend: templates/app.html and public/assets/. PHP entry points preserved.');
