import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createServer as createSocket } from 'node:net';
import { createServer } from 'vite';

// Reserve a port with no listening HTTP service to reproduce a stopped PHP backend.
const unavailable = createSocket();
await new Promise(resolve => unavailable.listen(0, '127.0.0.1', resolve));
const backendPort = unavailable.address().port;
await new Promise(resolve => unavailable.close(resolve));
process.env.PHPMONGO_API_URL = `http://127.0.0.1:${backendPort}`;
const root = fileURLToPath(new URL('../', import.meta.url));
const cache = await mkdtemp(`${tmpdir()}/phpmongo-vite-assets-`);
const server = await createServer({ cacheDir: cache, configFile: `${root}frontend/vite.config.ts`, server: { port: 0 } });
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const name of ['database', 'collection', 'lock', 'connect', 'community', 'document', 'phpmongo-logo']) {
    const response = await fetch(`${base}/assets/icons/${name}.svg`);
    assert.equal(response.status, 200, `${name} should load without PHP`);
    assert.match(response.headers.get('content-type'), /image\/svg\+xml/);
    assert.equal(await response.text(), await readFile(`${root}public/assets/icons/${name}.svg`, 'utf8'));
  }
  assert.equal((await fetch(`${base}/assets/icons/database.svg`, { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(`${base}/assets/icons/missing.svg`)).status, 404);
  assert.equal((await fetch(`${base}/assets/icons/%2e%2e%2f%2e%2e%2findex.php`)).status, 404);
  console.log('PASS: all SVGs served directly by Vite with PHP unavailable; HEAD, missing assets, and traversal checked');
} finally {
  await server.close();
  await rm(cache, { recursive: true, force: true });
}
