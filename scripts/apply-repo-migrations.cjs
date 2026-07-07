/**
 * Aplica TODOS os ficheiros .sql de `database/migrations/` (inclui baseline).
 * SQL é tornado idempotente (IF NOT EXISTS, DROP IF EXISTS) para poder correr
 * em bases já parcialmente criadas.
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
  const port = process.env.HOST_PG_PORT || '5432';
  const pw = process.env.LOCAL_POSTGRES_PASSWORD || 'postgres';
  return `postgresql://postgres:${encodeURIComponent(pw)}@127.0.0.1:${port}/sig_gestao_ti`;
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

/** Torna DDL reexecutável em bases que já têm parte do schema. */
function makeIdempotentSql(sql) {
  let s = sql.replace(/^\uFEFF/, '');

  s = s.replace(
    /^CREATE TYPE (public\.\w+) AS ENUM \(([\s\S]*?)\);$/gm,
    (_, typeName, values) => `DO $$ BEGIN
  CREATE TYPE ${typeName} AS ENUM (${values});
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;`,
  );

  s = s.replace(
    /^CREATE TABLE (?!IF NOT EXISTS )(public\.\w+|auth\.\w+) \(/gm,
    'CREATE TABLE IF NOT EXISTS $1 (',
  );

  s = s.replace(/^CREATE INDEX (?!IF NOT EXISTS )(\S+)/gm, 'CREATE INDEX IF NOT EXISTS $1');

  s = s.replace(
    /CREATE TRIGGER (\w+)\s+(BEFORE|AFTER)\s+UPDATE ON (public\.\w+|auth\.\w+)\s+FOR EACH ROW EXECUTE FUNCTION (public\.\w+\(\));/g,
    (_, tname, when, table, fn) =>
      `DROP TRIGGER IF EXISTS ${tname} ON ${table};\nCREATE TRIGGER ${tname} ${when} UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION ${fn};`,
  );

  s = s.replace(
    /CREATE POLICY "([^"]+)" ON (public\.\w+)/g,
    (_, pname, table) => `DROP POLICY IF EXISTS "${pname}" ON ${table};\nCREATE POLICY "${pname}" ON ${table}`,
  );

  return s;
}

function tablesFromSql(content) {
  const out = [];
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    out.push({ schema: (m[1] || 'public').toLowerCase(), table: m[2].toLowerCase() });
  }
  return out;
}

async function ensureMissingTables(client, files) {
  for (const name of files) {
    const raw = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
    for (const { schema, table } of tablesFromSql(raw)) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
        [schema, table],
      );
      if (exists.rowCount) continue;

      const re = new RegExp(
        `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?"?${schema}"?\\.?"?${table}"?\\s*\\([\\s\\S]*?\\);`,
        'i',
      );
      const m = raw.match(re);
      if (!m) continue;
      const ddl = makeIdempotentSql(m[0]);
      console.log(`>> A criar tabela em falta: ${schema}.${table} (de ${name})`);
      await client.query(ddl);
    }
  }
}

async function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('Pasta em falta:', MIGRATIONS_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.error('Nenhum ficheiro .sql em', MIGRATIONS_DIR);
    process.exit(1);
  }

  const dbUrl = resolveDatabaseUrl();
  console.log('>> Base:', maskUrl(dbUrl));
  console.log('>> Migrações (todas):', files.join(', '));

  const client = new Client({ connectionString: dbUrl, ssl: false });
  await client.connect();

  try {
    await client.query(PREAMBLE);
    await ensureMissingTables(client, files);

    for (const name of files) {
      const check = await client.query('SELECT 1 FROM public._repo_migration_log WHERE name = $1', [name]);
      if (check.rowCount) {
        console.log('>> Já aplicado (ignorar):', name);
        continue;
      }
      const raw = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
      const sql = makeIdempotentSql(raw);
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
