import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const temporary = await mkdtemp(`${tmpdir()}/phpmongo-browser-`);
const processes = [];
const evidence = resolve(root, 'test-results');
await mkdir(evidence, { recursive: true });
let browser;
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() { const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function ready(url) { for (let i = 0; i < 80; i++) { try { const response = await fetch(url); if (response.ok) return; } catch {} await delay(100); } throw new Error('Test server did not start'); }
function start(command, args, options = {}) { const process = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options }); processes.push(process); return process; }
const mongoPort = await freePort();
const webPort = await freePort();
const password = randomBytes(18).toString('hex');
const configPath = `${temporary}/config.php`;
const uri = `mongodb://127.0.0.1:${mongoPort}`;
try {
  await mkdir(`${temporary}/db`);
  const mongo = start('mongod', ['--bind_ip', '127.0.0.1', '--port', String(mongoPort), '--dbpath', `${temporary}/db`, '--logpath', `${temporary}/mongo.log`, '--quiet']);
  const mongoLogs = []; mongo.stderr.on('data', chunk => mongoLogs.push(String(chunk)));
  await delay(700);
  const fixture = String.raw`<?php
require $argv[1] . '/vendor/autoload.php';
$client = new MongoDB\Client($argv[2], ['serverSelectionTimeoutMS' => 5000]);
$documents = [];
for ($i = 0; $i < 120; $i++) {
  $documents[] = ['_id' => new MongoDB\BSON\ObjectId(str_pad(dechex($i + 1), 24, '0', STR_PAD_LEFT)), 'orderNumber' => 'ORD-' . (10001 + $i), 'status' => $i % 2 ? 'active' : 'pending', 'amount' => $i + 120, 'customer' => ['name' => 'Customer ' . $i, 'address' => ['city' => 'London']], 'items' => array_map(fn($n) => ['sku' => 'SKU-' . $n, 'quantity' => $n], range(1, 30)), 'createdAt' => new MongoDB\BSON\UTCDateTime(1791244800000)];
}
$client->selectCollection('eCommerce', 'orders')->insertMany($documents);
$client->selectCollection('eCommerce', 'products')->insertOne(['_id' => 'product-one', 'name' => 'Notebook']);
$client->selectCollection('workspace', 'notes')->insertOne(['_id' => 'note-one', 'title' => 'Welcome']);
$config = ['security' => ['master_password' => '', 'master_password_hash' => '', 'encryption_key' => '', 'force_local_boundary' => true]];
file_put_contents($argv[4], '<?php return ' . var_export($config, true) . ';');
`;
  await writeFile(`${temporary}/fixture.php`, fixture);
  const seeded = spawnSync('php', [`${temporary}/fixture.php`, root, uri, password, configPath], { encoding: 'utf8' });
  assert.equal(seeded.status, 0, seeded.stderr);
  const php = start('php', ['-S', `127.0.0.1:${webPort}`, '-t', `${root}/public`, `${root}/public/router.php`], { env: { ...process.env, PHPMONGO_CONFIG: configPath } });
  const logs = []; php.stderr.on('data', chunk => logs.push(String(chunk)));
  const base = `http://127.0.0.1:${webPort}`;
  await ready(`${base}/api/auth/status`);
  let executablePath = process.env.PHPMONGO_TEST_BROWSER;
  if (!executablePath) {
    // Prefer Playwright's matching browser; use the workspace cache when available.
    try { await readFile(chromium.executablePath()); }
    catch { const dirs = await readdir('/home/ubuntu/.cache/ms-playwright'); const installed = dirs.find(name => /^chromium-/.test(name)); if (installed) executablePath = `/home/ubuntu/.cache/ms-playwright/${installed}/chrome-linux64/chrome`; }
  }
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const failures = []; const requests = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.url().includes('/assets/') && response.status() >= 400) failures.push(`Asset failed: ${new URL(response.url()).pathname}`); });
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('status of 4')) failures.push(message.text()); });
  page.on('request', request => requests.push({ url: request.url(), method: request.method() }));
  await page.goto(base);
  await page.getByRole('heading', { name: 'Welcome to phpMongo' }).waitFor();
  await page.getByRole('button', { name: 'Set up phpMongo' }).waitFor(); checks++;
  await page.screenshot({ path: `${evidence}/setup.png`, fullPage: true });
  await page.getByLabel('Master password', { exact: true }).fill(password);
  await page.getByLabel('Confirm master password').fill('mismatched-password');
  await page.getByRole('button', { name: 'Set up phpMongo' }).click();
  await page.getByRole('alert').filter({ hasText: 'passwords do not match' }).waitFor(); checks++;
  await page.getByLabel('Confirm master password').fill(password);
  await page.getByRole('button', { name: 'Set up phpMongo' }).click();
  await page.getByRole('button', { name: 'Unlock workspace' }).waitFor();
  check(await page.getByRole('status').filter({ hasText: 'Setup complete' }).isVisible(), 'setup transitions to login');
  check(!(await readFile(configPath, 'utf8')).includes(password), 'setup configuration contains no plaintext password');
  check(await page.locator('.sponsor-card').evaluate(el => el.getBoundingClientRect().width === 350 && el.getBoundingClientRect().height === 250), 'login sponsorship preserves 350x250 zone');
  check(await page.locator('.color-icon').first().evaluate(el => el.complete && el.naturalWidth > 0), 'user-provided colour icon loads');
  await page.screenshot({ path: `${evidence}/login.png`, fullPage: true });
  await page.getByLabel('Master password').fill('incorrect-password');
  await page.getByRole('button', { name: 'Unlock workspace' }).click();
  await page.getByRole('alert').filter({ hasText: 'Invalid master password' }).waitFor(); checks++;
  await page.getByLabel('Master password').fill(password);
  await page.getByRole('button', { name: 'Unlock workspace' }).click();
  await page.getByRole('heading', { name: 'Connect your database' }).waitFor(); checks++;
  await page.getByLabel('Connection string').fill(uri);
  await page.getByRole('button', { name: 'Connect & explore' }).click();
  await page.getByRole('heading', { name: 'Your database workspace' }).waitFor();
  await page.getByRole('button', { name: 'orders', exact: true }).waitFor(); checks++;
  check(await page.locator('.sponsor-small').evaluate(el => el.getBoundingClientRect().width === 200 && el.getBoundingClientRect().height === 60), 'sidebar sponsorship preserves 200x60 zone');
  check(await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0), 'credentials not persisted in browser storage');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  let creation = page.getByRole('dialog', { name: 'Create collection' });
  await creation.getByLabel('Database name').fill('eCommerce');
  await creation.getByLabel('Collection name').fill('new_from_ui');
  await creation.getByRole('button', { name: 'Create collection', exact: true }).click();
  await page.getByRole('heading', { name: 'new_from_ui' }).waitFor(); checks++;
  await page.getByRole('status').filter({ hasText: 'Collection “new_from_ui” created' }).waitFor(); checks++;
  await page.getByRole('button', { name: 'new_from_ui', exact: true }).waitFor(); checks++;
  const createdCollection = spawnSync('php', ['-r', 'require $argv[1]."/vendor/autoload.php"; $c=new MongoDB\\Client($argv[2]); echo json_encode([iterator_to_array($c->selectDatabase("eCommerce")->listCollectionNames()),$c->selectCollection("eCommerce","new_from_ui")->countDocuments()]);', root, uri], { encoding: 'utf8' });
  const createdState = JSON.parse(createdCollection.stdout);
  check(createdState[0].includes('new_from_ui') && createdState[1] === 0, 'UI creation persisted an empty MongoDB collection');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  creation = page.getByRole('dialog', { name: 'Create collection' });
  await creation.getByLabel('Collection name').fill('new_from_ui');
  await creation.getByRole('button', { name: 'Create collection', exact: true }).click();
  await creation.getByRole('alert').filter({ hasText: 'already exists' }).waitFor(); checks++;
  await creation.getByRole('button', { name: 'Cancel', exact: true }).click();
  const picker = page.getByRole('combobox', { name: 'Color theme' });
  check(await picker.locator('option').count() >= 4, 'at least four theme options');
  for (const theme of ['ocean', 'sand', 'midnight', 'sage']) {
    await picker.selectOption(theme);
    await page.waitForFunction(value => document.documentElement.dataset.theme === value, theme);
    check(await page.evaluate(() => localStorage.getItem('phpmongo-theme')) === theme, 'theme choice persists without credentials');
    await delay(200); // Let the existing button colour transitions finish.
    await page.screenshot({ path: `${evidence}/theme-${theme}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Unlock workspace' }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Unlock workspace' }).waitFor();
  check(await page.getByRole('combobox', { name: 'Color theme' }).inputValue() === 'sage', 'selected theme survives reload');
  await page.getByLabel('Master password').fill(password);
  await page.getByRole('button', { name: 'Unlock workspace' }).click();
  await page.getByRole('heading', { name: 'Connect your database' }).waitFor();
  await page.getByLabel('Connection string').fill(uri);
  await page.getByRole('button', { name: 'Connect & explore' }).click();
  await page.getByRole('button', { name: 'orders', exact: true }).waitFor();
  await page.getByRole('button', { name: 'orders', exact: true }).click();
  await page.getByText('50 documents', { exact: true }).waitFor();
  await page.getByText('ORD-10001', { exact: true }).waitFor(); checks++;
  await page.screenshot({ path: `${evidence}/explorer.png`, fullPage: true });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('ORD-10051', { exact: true }).waitFor(); checks++;
  await page.getByLabel('Document filter').fill('{"status":"active"}');
  await page.getByRole('button', { name: 'Find documents', exact: true }).click();
  await page.getByText('ORD-10002', { exact: true }).waitFor();
  check(await page.getByText('ORD-10001', { exact: true }).count() === 0, 'filter applies against MongoDB');
  await page.getByLabel('Document filter').fill('{"$where":"true"}');
  await page.getByRole('button', { name: 'Find documents', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Unsupported query operator' }).waitFor(); checks++;
  await page.getByLabel('Document filter').fill('{"status":"active"}');
  await page.getByRole('button', { name: 'Find documents', exact: true }).click();
  await page.getByText('ORD-10002', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Inspect document 000000000000000000000002', exact: true }).click();
  await page.getByRole('dialog').getByText('Customer 1', { exact: false }).waitFor(); checks++;
  await page.getByLabel('Explore a field').fill('items.21');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await page.getByRole('dialog').getByText('SKU-22', { exact: false }).waitFor(); checks++;
  await page.screenshot({ path: `${evidence}/detail.png`, fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Workspace guide', exact: false }).click();
  await page.getByRole('heading', { name: 'A little guide to your workspace' }).waitFor(); checks++;
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile viewport does not overflow');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'products', exact: true }).click();
  await page.getByText('Notebook', { exact: true }).waitFor(); checks++;
  await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 0);
  await page.screenshot({ path: `${evidence}/mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Disconnect database', exact: true }).click();
  await page.getByRole('heading', { name: 'Connect your database' }).waitFor(); checks++;
  check(await page.getByLabel('Connection string').inputValue() === '', 'connection form cleared after disconnect');
  await page.getByLabel('Connection string').fill(uri);
  await page.getByRole('button', { name: 'Connect & explore' }).click();
  await page.getByRole('heading', { name: 'Your database workspace' }).waitFor();
  // Simulate server-side idle expiry and ensure the browser removes sensitive data.
  const cookies = await context.cookies(); const session = cookies.find(cookie => cookie.name === 'phpmongo_session');
  const file = `${root}/var/sessions/sess_${session.value}`;
  const sessionData = await readFile(file, 'utf8');
  await writeFile(file, sessionData.replace(/last_activity\|i:\d+;/, `last_activity|i:${Math.floor(Date.now() / 1000) - 3601};`));
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'orders', exact: true }).click();
  await page.getByRole('heading', { name: 'Welcome to phpMongo' }).waitFor(); checks++;
  check(await page.locator('.document-panel').count() === 0, 'expired session clears explorer data');
  check(requests.every(request => request.url.startsWith(base)), 'no external runtime requests');
  check(failures.length === 0, `browser errors: ${failures.join('; ')}`);
  const after = spawnSync('php', ['-r', 'require $argv[1]."/vendor/autoload.php"; $c=new MongoDB\\Client($argv[2]); echo $c->selectCollection("eCommerce","orders")->countDocuments();', root, uri], { encoding: 'utf8' });
  check(after.stdout === '120', 'browser flow leaves database unchanged');
  const devPort = await freePort();
  const vite = start(process.execPath, [`${root}/node_modules/vite/bin/vite.js`, '--config', `${root}/frontend/vite.config.ts`, '--port', String(devPort), '--strictPort'], { cwd: root, env: { ...process.env, PHPMONGO_API_URL: base, PHPMONGO_VITE_CACHE_DIR: `${temporary}/vite-cache` } });
  await ready(`http://127.0.0.1:${devPort}`);
  const devContext = await browser.newContext();
  const devPage = await devContext.newPage();
  await devPage.goto(`http://127.0.0.1:${devPort}`);
  await devPage.getByRole('heading', { name: 'Welcome to phpMongo' }).waitFor();
  await devPage.getByLabel('Master password').fill(password);
  await devPage.getByRole('button', { name: 'Unlock workspace' }).click();
  await devPage.getByRole('heading', { name: 'Connect your database' }).waitFor(); checks++;
  check(await devPage.locator('.color-icon').first().evaluate(el => el.complete && el.naturalWidth > 0), 'colour icons load in Vite development mode');
  await devContext.close();
  await browser.close(); browser = null;
  console.log(`PASS: ${checks} browser checks with real MongoDB and Slim APIs. Screenshots: test-results/.`);
} catch (error) {
  console.error(error);
  console.error(`Test artifacts retained at ${temporary}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  for (const process of processes.reverse()) { process.kill('SIGTERM'); await Promise.race([new Promise(resolve => process.once('exit', resolve)), delay(3000)]); }
  if (!process.exitCode) await rm(temporary, { recursive: true, force: true });
}
