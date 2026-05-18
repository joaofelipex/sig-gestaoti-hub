/**
 * Sincroniza config/stack.env → backend/.env (automático no npm start).
 */
const fs = require('fs');
const path = require('path');

process.env.STACK_SYNC_QUIET = '1';
const { mergeStack } = require('./sync-stack.cjs');
const { findPostgres, tryPort } = require('./probe-postgres-port.cjs');

const ROOT = path.join(__dirname, '..');
const STACK_ENV = path.join(ROOT, 'config', 'stack.env');

mergeStack();

function readPortFromStackEnv() {
  if (!fs.existsSync(STACK_ENV)) return 5433;
  const raw = fs.readFileSync(STACK_ENV, 'utf8');
  const m = raw.match(/^DB_PORT\s*=\s*(\d+)/m);
  return m ? parseInt(m[1], 10) : 5433;
}

function readHostFromStackEnv() {
  if (!fs.existsSync(STACK_ENV)) return '127.0.0.1';
  const m = fs.readFileSync(STACK_ENV, 'utf8').match(/^DB_HOST\s*=\s*(\S+)/m);
  return m ? m[1].trim() : '127.0.0.1';
}

function patchStackEnv(host, port) {
  if (!fs.existsSync(STACK_ENV)) return;
  let raw = fs.readFileSync(STACK_ENV, 'utf8');
  const set = (key, val) => {
    const re = new RegExp(`^${key}\\s*=.*$`, 'm');
    const line = `${key}=${val}`;
    raw = re.test(raw) ? raw.replace(re, line) : `${raw.trimEnd()}\n${line}\n`;
  };
  set('DB_HOST', host);
  set('DB_PORT', String(port));
  set('HOST_PG_PORT', String(port));
  raw = raw.replace(/^DATABASE_URL\s*=.*$\n?/m, '');
  fs.writeFileSync(STACK_ENV, raw.endsWith('\n') ? raw : raw + '\n', 'utf8');
}

async function alignPostgresPort() {
  const preferred = readPortFromStackEnv();
  const host = readHostFromStackEnv();

  if (await tryPort(host, preferred)) return;

  const found = await findPostgres(preferred);
  if (!found) {
    console.warn(
      `\n[stack] Postgres não responde em ${host}:${preferred}.\n` +
        `       Use os mesmos dados do DBeaver em config/stack.env (DB_HOST, DB_PORT, user, senha, base).\n`,
    );
    return;
  }

  if (found.port !== preferred || found.host !== host) {
    patchStackEnv(found.host, found.port);
    console.warn(`[stack] A usar Postgres em ${found.host}:${found.port} (actualizado config/stack.env)\n`);
    mergeStack();
  }
}

alignPostgresPort().catch((e) => console.error(e));
