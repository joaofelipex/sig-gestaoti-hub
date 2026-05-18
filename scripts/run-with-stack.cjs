/**
 * Executa um comando com variáveis de `backend/.env`.
 */
const path = require('path');
const { spawnSync } = require('child_process');
const { loadBackendEnv } = require('./load-backend-env.cjs');

const ROOT = path.join(__dirname, '..');

let cfg;
try {
  cfg = loadBackendEnv();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const env = {
  ...process.env,
  HOST_PG_PORT: String(cfg.HOST_PG_PORT),
  DB_HOST: cfg.DB_HOST,
  DB_PORT: String(cfg.DB_PORT),
  DB_USERNAME: cfg.DB_USERNAME,
  DB_PASSWORD: cfg.DB_PASSWORD,
  DB_DATABASE: cfg.DB_DATABASE,
  DATABASE_URL: cfg.DATABASE_URL,
  PORT: String(cfg.API_PORT),
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
