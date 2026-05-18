/**
 * Espera até o Postgres da stack aceitar ligações (config/stack.runtime.json).
 */
const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT = path.join(__dirname, '..');
const RT = path.join(ROOT, 'config', 'stack.runtime.json');

function loadRuntime() {
  if (!fs.existsSync(RT)) {
    console.error('Falta config/stack.runtime.json — corre: npm run sync:stack');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(RT, 'utf8'));
}

function tryConnect(host, port) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port }, () => {
      s.end();
      resolve(true);
    });
    s.setTimeout(2000);
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.on('error', () => resolve(false));
  });
}

async function main() {
  const rt = loadRuntime();
  const host = rt.DB_HOST || '127.0.0.1';
  const port = rt.DB_PORT || rt.HOST_PG_PORT || 5433;
  const max = parseInt(process.env.WAIT_PG_SECONDS || '90', 10);

  for (let i = 0; i < max; i++) {
    if (await tryConnect(host, port)) {
      console.log(`>> Postgres disponível em ${host}:${port}`);
      return;
    }
    if (i === 0) console.log(`>> A aguardar Postgres em ${host}:${port} …`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error(`>> Timeout: Postgres não respondeu em ${host}:${port} (${max}s). Corre: npm run db:up`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
