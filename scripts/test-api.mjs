import {spawn, spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createServer} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(path.join(tmpdir(), 'pawmongo-browser-api-'));
const children = [];
async function port() {
  const server = createServer();
  await new Promise((resolve, reject) => {server.on('error', reject); server.listen(0, '127.0.0.1', resolve);});
  const result = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return result;
}
function launch(command, args, env = process.env) {
  const child = spawn(command, args, {cwd: root, env, stdio: ['ignore', 'ignore', 'pipe']});
  let errors = '';
  child.stderr.on('data', chunk => {errors += chunk;});
  child.on('error', error => {errors += error.message;});
  children.push(child);
  return () => errors;
}
try {
  const mongoPort = await port(), phpPort = await port();
  mkdirSync(path.join(temporary, 'db'));
  const mongoErrors = launch(process.env.PAWMONGO_TEST_MONGOD || 'mongod', ['--bind_ip', '127.0.0.1', '--port', String(mongoPort), '--dbpath', path.join(temporary, 'db'), '--logpath', path.join(temporary, 'mongo.log'), '--quiet']);
  const env = {...process.env, MONGODB_URI: `mongodb://127.0.0.1:${mongoPort}`, PAWMONGO_LEGACY_API: '0'};
  let ready = false;
  for (let i = 0; i < 80; i++) {
    const result = spawnSync('php', ['-r', 'require "lib/vendor/autoload.php"; $c = new MongoDB\\Client(getenv("MONGODB_URI"), ["serverSelectionTimeoutMS" => 100]); $c->selectDatabase("admin")->command(["ping" => 1])->toArray();'], {cwd: root, env, stdio: 'ignore'});
    if (result.status === 0) {ready = true; break;}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error(`Isolated MongoDB did not start: ${mongoErrors()}`);
  const phpErrors = launch('php', ['-S', `127.0.0.1:${phpPort}`, '-t', 'lib/public', 'lib/public/router.php'], env);
  const origin = `http://127.0.0.1:${phpPort}`;
  ready = false;
  for (let i = 0; i < 50; i++) {
    try { const res = await fetch(`${origin}/api/health`); if ((await res.json()).backend === 'php') {ready = true; break;} } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error(`PHP did not start: ${phpErrors()}`);
  const test = spawn(process.execPath, ['themes/tests/live-api.mjs'], {cwd: root, env: {...env, TEST_API_URL: origin, TEST_DATABASE: 'pawmongo_csr_test'}, stdio: 'inherit'});
  const code = await new Promise((resolve, reject) => {test.on('error', reject); test.on('exit', resolve);});
  if (code !== 0) throw new Error(`PHP theme API tests failed (${code}). ${phpErrors()}`);
} finally {
  await Promise.all(children.map(child => new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) {resolve(); return;}
    child.on('exit', resolve); child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000); timer.unref();
  })));
  rmSync(temporary, {recursive: true, force: true});
}
