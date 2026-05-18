/**
 * Diagnóstico: Postgres (backend/.env) e portas comuns.
 */
const net = require('net');
const { loadBackendEnv } = require('./load-backend-env.cjs');

function tryPort(host, port) {
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
  const cfg = loadBackendEnv();
  const host = cfg.DB_HOST;
  const port = parseInt(cfg.DB_PORT, 10);

  console.log('=== SIG Heartbeat — diagnóstico ===\n');
  console.log(`Config: backend/.env`);
  console.log(`Postgres: ${cfg.DATABASE_URL.replace(/:([^:@/]+)@/, ':***@')}`);
  console.log(`API: http://127.0.0.1:${cfg.API_PORT}\n`);

  const ok = await tryPort(host, port);
  if (ok) {
    console.log(`OK  Postgres em ${host}:${port}`);
  } else {
    console.log(`FALHA  Nada em ${host}:${port} — ligue o Postgres (mesmo do DBeaver) e confira backend/.env`);
    process.exit(1);
  }

  console.log('\nArranque:');
  console.log('  cd backend && npm start');
  console.log('  cd frontend && npm run dev');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
