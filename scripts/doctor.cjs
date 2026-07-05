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

  console.log('=== SIG Gestão TI — diagnóstico ===\n');
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

  const apiPort = parseInt(cfg.API_PORT, 10);
  const webPort = parseInt(process.env.WEB_PORT || '8080', 10);
  const apiUp = await tryPort('127.0.0.1', apiPort);
  const webUp = await tryPort('127.0.0.1', webPort);

  console.log('');
  if (apiUp) {
    console.log(`OK  API em 127.0.0.1:${apiPort}`);
  } else {
    console.log(`FALHA  API não responde em 127.0.0.1:${apiPort} — cd backend && npm run dev`);
  }
  if (webUp) {
    console.log(`OK  Frontend em 127.0.0.1:${webPort}`);
  } else {
    console.log(`FALHA  Frontend não responde em 127.0.0.1:${webPort} — npm run dev (na raiz)`);
  }

  if (!apiUp || !webUp) {
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
