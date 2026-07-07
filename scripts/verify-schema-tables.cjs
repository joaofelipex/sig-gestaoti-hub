const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { loadBackendEnv } = require('./load-backend-env.cjs');

const ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'database', 'migrations');

function tablesFromSql(content) {
  const out = new Set();
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const schema = (m[1] || 'public').toLowerCase();
    const table = m[2].toLowerCase();
    out.add(`${schema}.${table}`);
  }
  return out;
}

function expectedTables() {
  const all = new Set();
  if (!fs.existsSync(MIGRATIONS_DIR)) return all;
  for (const f of fs.readdirSync(MIGRATIONS_DIR).filter((x) => x.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    for (const t of tablesFromSql(sql)) all.add(t);
  }
  return all;
}

async function actualTables(client) {
  const r = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema IN ('public', 'auth')
    ORDER BY 1, 2
  `);
  return new Set(r.rows.map((x) => `${x.table_schema}.${x.table_name}`));
}

(async () => {
  const cfg = loadBackendEnv();
  const expected = expectedTables();
  const c = new Client({ connectionString: cfg.DATABASE_URL });
  await c.connect();
  const actual = await actualTables(c);
  await c.end();

  const missing = [...expected].filter((t) => !actual.has(t)).sort();
  const extra = [...actual].filter((t) => !expected.has(t) && t !== 'public._repo_migration_log').sort();

  console.log('Pasta: database/migrations/');
  console.log('Esperadas (SQL):', expected.size);
  console.log('Existentes (DB):', actual.size);
  if (missing.length) {
    console.log('\nFALTAM:');
    missing.forEach((t) => console.log('  -', t));
  } else {
    console.log('\nOK — todas as tabelas dos .sql em database/migrations/ existem:');
    [...expected].sort().forEach((t) => console.log('  ✓', t));
  }
  if (extra.length) {
    console.log('\nExtra (não nos .sql de migrations):');
    extra.forEach((t) => console.log('  +', t));
  }
  process.exit(missing.length ? 1 : 0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
