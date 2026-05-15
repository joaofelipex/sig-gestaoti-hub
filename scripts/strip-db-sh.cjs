/**
 * Remove CR (\r) from shell scripts — evita falhas no Bash do WSL quando o
 * ficheiro foi gravado com CRLF (ex.: editor no Windows sobre \\wsl$).
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'db.sh');
const raw = fs.readFileSync(target, 'utf8');
const lf = raw.replace(/\r/g, '');
if (lf !== raw) {
  fs.writeFileSync(target, lf, 'utf8');
}
