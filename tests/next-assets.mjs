import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer as createSocket } from 'node:net';
import { spawn } from 'node:child_process';

// Reserve a port with no listening HTTP service to reproduce a stopped PHP backend.
const unavailable = createSocket();
await new Promise(resolve => unavailable.listen(0, '127.0.0.1', resolve));
const backendPort = unavailable.address().port;
await new Promise(resolve => unavailable.close(resolve));
process.env.PHPMONGO_API_URL = `http://127.0.0.1:${backendPort}`;
const root = fileURLToPath(new URL('../', import.meta.url));
const socket = createSocket();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const frontendPort = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const server = spawn(process.execPath, [`${root}node_modules/next/dist/bin/next`, 'start', `${root}frontend`, '--hostname', '127.0.0.1', '--port', String(frontendPort)], { stdio: 'ignore', env: process.env });
try {
  const base = `http://127.0.0.1:${frontendPort}`;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${base}/assets/icons/database.svg`)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  for (const name of ['database', 'collection', 'lock', 'connect', 'community', 'document', 'phpmongo-logo']) {
    const response = await fetch(`${base}/assets/icons/${name}.svg`);
    assert.equal(response.status, 200, `${name} should load without PHP`);
    assert.match(response.headers.get('content-type'), /image\/svg\+xml/);
    assert.equal(await response.text(), await readFile(`${root}public/assets/icons/${name}.svg`, 'utf8'));
  }
  assert.equal((await fetch(`${base}/assets/icons/database.svg`, { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(`${base}/assets/icons/missing.svg`)).status, 404);
  assert.equal((await fetch(`${base}/assets/icons/%2e%2e%2f%2e%2e%2findex.php`)).status, 404);
  console.log('PASS: all SVGs served directly by Next.js with PHP unavailable; HEAD, missing assets, and traversal checked');
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => server.once('exit', resolve));
}
