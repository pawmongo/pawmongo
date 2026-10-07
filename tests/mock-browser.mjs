import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'frontend', '--hostname', '127.0.0.1', '--port', String(port)], { stdio: 'ignore', env: { ...process.env, PHPMONGO_MOCK_DATA: '1', PHPMONGO_API_URL: 'http://127.0.0.1:1' } });
let browser;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); }
  let executablePath = chromium.executablePath();
  if (!existsSync(executablePath)) { const cache = '/home/ubuntu/.cache/ms-playwright'; executablePath = readdirSync(cache).filter(name => name.startsWith('chromium-')).map(name => `${cache}/${name}/chrome-linux64/chrome`).find(existsSync); }
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(base);
  await page.getByRole('status').filter({ hasText: 'Demo workspace' }).waitFor();
  const auth = await (await context.request.get(`${base}/api/auth/status`)).json();
  assert.equal(auth.mock, true); assert.equal(auth.authenticated, true);
  const request = async (path, body, method = 'POST') => {
    const response = await context.request.fetch(`${base}/api/data/${path}`, { method, headers: { 'X-CSRF-Token': auth.csrf_token }, ...(body ? { data: body } : {}) });
    const result = await response.json(); assert.ok(response.ok(), JSON.stringify(result)); return result;
  };
  const target = { db: 'eCommerce', collection: 'orders' };
  assert.equal((await request('tools/count?db=eCommerce&collection=orders&filter=%7B%22status%22%3A%22active%22%7D', null, 'GET')).total, 60);
  const docs = await request('documents?db=eCommerce&collection=orders&page_size=25', null, 'GET');
  assert.equal(docs.documents.length, 25); assert.equal(docs.next_page, 2);
  await request('documents', { ...target, id: '000000000000000000000001', document: JSON.stringify({ status: 'edited' }) }, 'PATCH');
  await page.reload(); await page.getByRole('status').filter({ hasText: 'Demo workspace' }).waitFor();
  assert.equal((await request('tools/count?db=eCommerce&collection=orders&filter=%7B%22status%22%3A%22edited%22%7D', null, 'GET')).total, 1);
  const aggregate = await request('tools/aggregate', { ...target, pipeline: '[{"$group":{"_id":"$status","count":{"$sum":1}}}]' });
  assert.equal(aggregate.documents.length, 3);
  const custom = { db: 'workspace', collection: 'imported' };
  await request('tools/import', { ...custom, create_collection: true, documents: '[{"_id":"one","title":"Imported"},{"_id":"two","title":"Second"}]' });
  assert.equal((await request('tools/count?db=workspace&collection=imported', null, 'GET')).total, 2);
  await request('tools/indexes', { ...custom, action: 'create', keys: '{"title":1}', unique: true });
  await request('tools/validation', { ...custom, validator: '{"$jsonSchema":{"required":["title"]}}', level: 'strict', action: 'error' });
  const invalid = await context.request.post(`${base}/api/data/documents`, { headers: { 'X-CSRF-Token': auth.csrf_token }, data: { ...custom, document: '{}' } });
  assert.equal(invalid.status(), 400);
  await request('tools/bulk', { ...custom, filter: '{}', confirmed: true, action: 'update', document: '{"pinned":true}' });
  await request('collections', { ...custom, name: 'renamed' }, 'PATCH');
  await request('collections', { ...custom, collection: 'renamed' }, 'DELETE');
  const isolated = await browser.newContext();
  const isolatedAuth = await (await isolated.request.get(`${base}/api/auth/status`)).json();
  assert.notEqual(isolatedAuth.csrf_token, auth.csrf_token);
  assert.equal((await (await isolated.request.get(`${base}/api/data/tools/count?db=eCommerce&collection=orders&filter=%7B%22status%22%3A%22edited%22%7D`)).json()).total, 0);
  const reset = await context.request.post(`${base}/api/demo/reset`, { headers: { 'X-CSRF-Token': auth.csrf_token }, data: {} }); assert.equal(reset.status(), 200);
  assert.equal((await request('tools/count?db=eCommerce&collection=orders&filter=%7B%22status%22%3A%22edited%22%7D', null, 'GET')).total, 0);
  console.log('PASS: demo browser loads without backend; filtering, pagination, edits after refresh, aggregation, import, indexes, validation, bulk, collection rename/delete, isolation, reset');
} finally { await browser?.close(); server.kill('SIGTERM'); await new Promise(resolve => server.once('exit', resolve)); }
