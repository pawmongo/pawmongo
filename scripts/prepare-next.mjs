import { cp, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = `${root}frontend/public/assets/icons`;
await mkdir(destination, { recursive: true });
for (const name of await readdir(`${root}public/assets/icons`)) {
  if (name.endsWith('.svg')) await cp(`${root}public/assets/icons/${name}`, `${destination}/${name}`);
}
