import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  const timeout = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 3000);
  timeout.unref();
}

function start(command, args) {
  const child = spawn(command, args, { cwd, stdio: 'inherit' });
  children.add(child);
  child.on('error', error => {
    console.error(`Cannot start ${command}: ${error.message}`);
    children.delete(child);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    children.delete(child);
    stop(code ?? (signal ? 1 : 0));
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
start('php', ['-S', '127.0.0.1:8080', '-t', 'public', 'public/router.php']);
start(process.execPath, ['node_modules/next/dist/bin/next', 'dev', 'frontend', '--hostname', '127.0.0.1', '--port', '3000']);
