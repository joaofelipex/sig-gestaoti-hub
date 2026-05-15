/**
 * Aplica ficheiros .sql de `database/migrations/` ao Postgres local (por defeito Docker 5433).
 *
 * - Cria papéis `authenticated`, `anon`, `service_role` se não existirem (policies RLS típicas).
 * - Regista ficheiros já aplicados em public._repo_migration_log (não reaplica).
 * - Por defeito ignora nomes com "baseline" (o schema base vem de database/init/01_schema.sql).
 *   Para incluir baseline: APPLY_BASELINE=true
 *
 * Uso:
 *   npm run db:apply-migrations
 *   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/sig_heartbeat_hub" npm run db:apply-migrations
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'database', 'migrations');

const PREAMBLE = `
CREATE TABLE IF NOT EXISTS public._repo_migration_log (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role BYPASSRLS;
  END IF;
END $$;
`;

function resolveDatabaseUrl() {
  const u =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PGURL ||
    process.env.PG_CONNECTION_STRING;
  if (u) return u.trim();
  const port = process.env.HOST_PG_PORT || '5433';
  const pw = process.env.LOCAL_POSTGRES_PASSWORD || 'postgres';
  return `postgresql://postgres:${encodeURIComponent(pw)}@127.0.0.1:${port}/sig_heartbeat_hub`;
}

function maskUrl(u) {
  try {
    const x = new URL(u);
    if (x.password) x.password = '***';
    return x.toString();
  } catch {
    return u;
  }
}

async function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('Pasta em falta:', MIGRATIONS_DIR);
    process.exit(1);
  }
  const applyBaseline = String(process.env.APPLY_BASELINE || '').toLowerCase() === 'true';
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => applyBaseline || !/baseline/i.test(f))
    .sort();

  if (!files.length) {
    console.error('Nenhum ficheiro .sql em', MIGRATIONS_DIR);
    process.exit(1);
  }

  const dbUrl = resolveDatabaseUrl();
  console.log('>> Base:', maskUrl(dbUrl));
  console.log('>> Migrações:', files.join(', '));

  const client = new Client({
    connectionString: dbUrl,
    ssl: false,
  });
  await client.connect();

  try {
    await client.query(PREAMBLE);

    for (const name of files) {
      const check = await client.query('SELECT 1 FROM public._repo_migration_log WHERE name = $1', [name]);
      if (check.rowCount) {
        console.log('>> Já aplicado (ignorar):', name);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
      console.log('>> A aplicar:', name);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO public._repo_migration_log (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        console.log('>> OK:', name);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }
    console.log('>> Migrações concluídas.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
