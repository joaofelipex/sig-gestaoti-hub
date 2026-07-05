/**
 * Arranque opcional na raiz: API + UI (npm run dev na raiz do repo).
 */
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

const freePorts = spawnSync(process.execPath, [path.join(__dirname, 'dev-ports.cjs'), 'free'], {
  cwd: root,
  stdio: 'inherit',
});
if (freePorts.status !== 0) {
  process.exit(freePorts.status ?? 1);
}

console.log('');
console.log('  SIG Gestão TI');
console.log('  API  →  http://127.0.0.1:3000');
console.log('  App  →  http://127.0.0.1:8080');
console.log('  (Ctrl+C para parar)\n');

const child = spawn(npm, ['run', 'start:processes'], {
  cwd: root,
  stdio: 'inherit',
  shell: isWin,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
