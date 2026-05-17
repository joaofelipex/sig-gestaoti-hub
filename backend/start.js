/** @deprecated — use `npm start` ou `npm run dev` (API Express em src/index.ts). */
console.warn('[backend] start.js está obsoleto — a correr src/index.ts via ts-node-dev.');
require('child_process').spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['start'],
  { stdio: 'inherit', cwd: __dirname }
);
