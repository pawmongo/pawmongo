import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2];
if (!['dev', 'start'].includes(mode)) throw new Error('Expected dev or start');
const entry = path.join(root, mode === 'dev' ? 'themes/node_modules/next/dist/bin/next' : 'themes/out/index.html');
if (!existsSync(entry)) throw new Error(mode === 'dev'
  ? 'Install theme dependencies with npm run install:theme.'
  : 'Build the application with npm run build first.');

const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  const timer = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 3000);
  timer.unref();
}
function launch(command, args, cwd, env = process.env) {
  const child = spawn(command, args, {cwd, env, stdio: 'inherit'});
  children.add(child);
  child.on('error', error => {
    console.error(error.message);
    children.delete(child);
    stop(1);
  });
  child.on('exit', (code) => {
    children.delete(child);
    // A server exiting unexpectedly must stop its companion too.
    if (!stopping) stop(code || 1);
  });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
const nextPort = process.env.PORT || '3000';
const phpPort = mode === 'dev' ? (process.env.PHP_PORT || '8080') : nextPort;
console.log(mode === 'dev'
  ? `CSR theme: http://127.0.0.1:${nextPort}; PHP API: http://127.0.0.1:${phpPort}`
  : `PHP + static CSR theme: http://127.0.0.1:${phpPort}`);
launch(process.env.PHP_BINARY || 'php', ['-S', `127.0.0.1:${phpPort}`, '-t', 'lib/public', 'lib/public/router.php'], root, {
  ...process.env,
  ...(mode === 'dev' ? {PAWMONGO_FRONTEND_ORIGIN: `http://127.0.0.1:${nextPort}`} : {}),
});
if (mode === 'dev') launch(process.execPath,
  [entry, 'dev', '--hostname', '127.0.0.1', '--port', nextPort], path.join(root, 'themes'), {
    ...process.env,
    PAWMONGO_API_URL: `http://127.0.0.1:${phpPort}`,
  });
