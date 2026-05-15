/**
 * Remove CR (\r) de scripts shell — evita falhas no Bash do WSL quando o
 * ficheiro foi gravado com CRLF (ex.: editor no Windows sobre \\wsl$).
 */
const fs = require('fs');
const path = require('path');

const scripts = ['db.sh', 'sync-remote-to-docker.sh', 'seed-local-docker.sh'];

for (const name of scripts) {
  const target = path.join(__dirname, name);
  if (!fs.existsSync(target)) continue;
  const raw = fs.readFileSync(target, 'utf8');
  const lf = raw.replace(/\r/g, '');
  if (lf !== raw) {
    fs.writeFileSync(target, lf, 'utf8');
    console.log('Normalized line endings:', name);
  }
}
