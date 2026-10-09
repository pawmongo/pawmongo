import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const theme = path.join(root, 'themes');
function run(command, args, cwd) {
  const result = spawnSync(command, args, {cwd, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('npm', ['run', 'build'], theme);
if (!existsSync(path.join(theme, 'out/index.html'))) throw new Error('Next.js static CSR export was not generated.');
run('python3', ['scripts/package.py'], root);
