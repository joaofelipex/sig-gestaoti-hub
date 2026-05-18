/**
 * Prepara o PostgreSQL local persistente (Docker volume ou stack.env):
 *   - schema base se em falta
 *   - migrações do repositório
 *   - seed demo (02_seed + 03_api_auth) se a org demo estiver vazia
 *
 * Uso (na raiz): npm run stack:bootstrap
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..');
const INIT_DIR = path.join(ROOT, 'database', 'init');
const DEMO_ORG = '22222222-2222-2222-2222-222222222222';

function resolveDatabaseUrl() {
  const u = process.env.DATABASE_URL;
  if (u && String(u).trim()) return String(u).trim();
  const port = process.env.DB_PORT || process.env.HOST_PG_PORT || '5433';
  const user = process.env.DB_USERNAME || 'postgres';
  const pw = encodeURIComponent(process.env.DB_PASSWORD || 'postgres');
  const host = process.env.DB_HOST || '127.0.0.1';
  const db = process.env.DB_DATABASE || 'sig_heartbeat_hub';
  return `postgresql://${user}:${pw}@${host}:${port}/${db}`;
}

function maskUrl(u) {
  return u.replace(/:([^:@/]+)@/, ':***@');
}

async function tableExists(client, name) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [name],
  );
  return (r.rowCount ?? 0) > 0;
}

async function runSqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
}

async function main() {
  const dbUrl = resolveDatabaseUrl();
  console.log('>> Bootstrap Postgres:', maskUrl(dbUrl));

  const client = new Client({ connectionString: dbUrl, ssl: false });
  await client.connect();

  try {
    const hasOrgs = await tableExists(client, 'organizations');
    if (!hasOrgs) {
      const schema = path.join(INIT_DIR, '01_schema.sql');
      if (!fs.existsSync(schema)) {
        throw new Error('Em falta: database/init/01_schema.sql');
      }
      console.log('>> A aplicar schema base (01_schema.sql) …');
      await runSqlFile(client, schema);
    } else {
      console.log('>> Schema public já existe — a ignorar 01_schema.sql');
    }

    await client.end();
  } catch (e) {
    await client.end().catch(() => {});
    throw e;
  }

  console.log('>> Migrações do repositório …');
  const mig = spawnSync(process.execPath, [path.join(__dirname, 'apply-repo-migrations.cjs')], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });
  if (mig.status !== 0) process.exit(mig.status || 1);

  const client2 = new Client({ connectionString: dbUrl, ssl: false });
  await client2.connect();

  try {
    const countRes = await client2.query(
      `SELECT count(*)::int AS n FROM public.ativos WHERE org_id = $1::uuid`,
      [DEMO_ORG],
    );
    const n = countRes.rows[0]?.n ?? 0;

    if (n === 0) {
      const seed = path.join(INIT_DIR, '02_seed.sql');
      const auth = path.join(INIT_DIR, '03_api_auth.sql');
      if (!fs.existsSync(seed)) throw new Error('Em falta: database/init/02_seed.sql');
      console.log('>> Base sem dados demo — a aplicar 02_seed.sql …');
      await runSqlFile(client2, seed);
      if (fs.existsSync(auth)) {
        console.log('>> A aplicar 03_api_auth.sql …');
        await runSqlFile(client2, auth);
      }
    } else {
      console.log(`>> Dados demo já presentes (${n} ativos na org demo).`);
    }

    const stats = await client2.query(`
      SELECT
        (SELECT count(*)::int FROM public.ativos) AS ativos,
        (SELECT count(*)::int FROM public.empresas) AS empresas,
        (SELECT count(*)::int FROM auth.users) AS users
    `);
    const s = stats.rows[0];
    console.log(`>> Estado: ${s.ativos} ativos · ${s.empresas} empresas · ${s.users} utilizadores`);
    console.log('>> Login com dados: dev@local.imts / demo123456 (org demo com registos)');
    console.log('>> Conta nova (signup) começa vazia na MESMA base — é o PostgreSQL persistente.');
  } finally {
    await client2.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
