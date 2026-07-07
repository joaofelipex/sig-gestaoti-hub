/**
 * Bootstrap da stack local (Windows/Linux/macOS, sem Docker obrigatório):
 *   1) sync:stack (config → backend/.env, proxy, etc.)
 *   2) Espera Postgres
 *   3) Cria a base se não existir
 *   4) Aplica database/init/*.sql se a base estiver vazia
 *   5) Aplica database/migrations/*.sql pendentes
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');
const { mergeStack } = require('./sync-stack.cjs');
const { findPostgres } = require('./probe-postgres-port.cjs');

const ROOT = path.join(__dirname, '..');
const INIT_DIR = path.join(ROOT, 'database', 'init');
const RT = path.join(ROOT, 'config', 'stack.runtime.json');

function adminUrl(cfg) {
  const u = encodeURIComponent(cfg.DB_USERNAME || 'postgres');
  const p = encodeURIComponent(cfg.DB_PASSWORD || 'postgres');
  const h = cfg.DB_HOST || '127.0.0.1';
  const port = cfg.DB_PORT || '5432';
  return `postgresql://${u}:${p}@${h}:${port}/postgres`;
}

async function waitForPostgres(host, port, maxSec = 60) {
  const { tryPort } = require('./probe-postgres-port.cjs');
  for (let i = 0; i < maxSec; i++) {
    if (await tryPort(host, port)) return;
    if (i === 0) console.log(`>> A aguardar Postgres em ${host}:${port} …`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Postgres não respondeu em ${host}:${port} (${maxSec}s)`);
}

async function dbExists(client, name) {
  const r = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  return r.rowCount > 0;
}

async function hasTables(client) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LIMIT 1`,
  );
  return r.rowCount > 0;
}

async function applySqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  console.log(`>> A aplicar ${path.basename(filePath)} …`);
  await client.query(sql);
}

async function applyMigrations(databaseUrl) {
  console.log('>> A aplicar migrações pendentes (database/migrations/) …');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'apply-repo-migrations.cjs')], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    throw new Error('Falha ao aplicar migrações');
  }
}

async function main() {
  console.log('=== stack:bootstrap ===\n');
  mergeStack();

  if (!fs.existsSync(RT)) {
    console.error('Falta config/stack.runtime.json após sync:stack');
    process.exit(1);
  }
  const rt = JSON.parse(fs.readFileSync(RT, 'utf8'));

  let host = rt.DB_HOST || '127.0.0.1';
  let port = rt.DB_PORT || rt.HOST_PG_PORT || 5432;
  const found = await findPostgres(port);
  if (found) {
    host = found.host;
    port = found.port;
  }

  await waitForPostgres(host, port);

  const dbName = rt.DB_DATABASE || 'sig_gestao_ti';
  const admin = new Client({ connectionString: adminUrl({ ...rt, DB_HOST: host, DB_PORT: port }) });
  await admin.connect();

  if (!(await dbExists(admin, dbName))) {
    console.log(`>> A criar base "${dbName}" …`);
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
  } else {
    console.log(`>> Base "${dbName}" já existe`);
  }
  await admin.end();

  const appUrl = rt.DATABASE_URL.replace(
    /\/[^/?]+(\?|$)/,
    `/${encodeURIComponent(dbName).replace(/%20/g, ' ')}$1`,
  );
  const app = new Client({ connectionString: appUrl });
  await app.connect();

  const seeded = !(await hasTables(app));

  if (seeded) {
    const files = fs
      .readdirSync(INIT_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    if (!files.length) {
      console.error('Nenhum ficheiro em database/init/');
      process.exit(1);
    }

    for (const f of files) {
      await applySqlFile(app, path.join(INIT_DIR, f));
    }
  } else {
    console.log('>> Schema init já presente — a saltar database/init/*.sql');
  }
  await app.end();

  await applyMigrations(appUrl);

  if (seeded) {
    console.log('\nOK — base criada com schema + seed demo + migrações.');
  } else {
    console.log('\nOK — schema alinhado (init + migrações).');
  }
  console.log('Login demo: dev@local.imts / demo123456');
}

main().catch((e) => {
  console.error('Falha:', e.message || e);
  process.exit(1);
});
