/**
 * Executa um comando com variáveis vindas de config/stack.runtime.json
 * (HOST_PG_PORT, etc.). Uso: node scripts/run-with-stack.cjs bash scripts/db.sh up
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const RT = path.join(ROOT, 'config', 'stack.runtime.json');

if (!fs.existsSync(RT)) {
  console.error('Falta config/stack.runtime.json. Corre na raiz: npm run sync:stack');
  process.exit(1);
}

const rt = JSON.parse(fs.readFileSync(RT, 'utf8'));
const env = {
  ...process.env,
  HOST_PG_PORT: String(rt.HOST_PG_PORT),
  DB_HOST: rt.DB_HOST,
  DB_PORT: String(rt.DB_PORT),
  DB_USERNAME: rt.DB_USERNAME,
  DB_PASSWORD: rt.DB_PASSWORD,
  DB_DATABASE: rt.DB_DATABASE,
  DATABASE_URL: rt.DATABASE_URL,
  PORT: String(rt.API_PORT),
};

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Uso: node scripts/run-with-stack.cjs <comando> [args...]');
  process.exit(1);
}

const r = spawnSync(args[0], args.slice(1), {
  env,
  stdio: 'inherit',
  cwd: ROOT,
  shell: false,
});
process.exit(r.status ?? 1);
