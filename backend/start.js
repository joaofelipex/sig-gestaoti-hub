const path = require('path');
const { spawnSync } = require('child_process');

const entry = path.join(__dirname, 'dist', 'index.js');

if (process.platform === 'win32' && process.cwd().startsWith('\\\\wsl.localhost\\')) {
  const wslPath = '/home/infraestrutura-imts/projetos/sig-heartbeat-hub/backend/dist/index.js';
  const result = spawnSync('wsl', ['node', wslPath], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

require(entry);
