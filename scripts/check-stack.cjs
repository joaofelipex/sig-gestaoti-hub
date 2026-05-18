/**
 * Verifica Postgres e API (/health) usando portas em config/stack.runtime.json
 * (gerado por npm run sync:stack).
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const RT_PATH = path.join(ROOT, 'config', 'stack.runtime.json');

function ensureRuntime() {
  if (fs.existsSync(RT_PATH)) return;
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'sync-stack.cjs')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

function loadRuntime() {
  ensureRuntime();
  return JSON.parse(fs.readFileSync(RT_PATH, 'utf8'));
}

function checkTcp(host, port, label) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port }, () => {
      s.end();
      resolve({ ok: true, label });
    });
    s.setTimeout(4000);
    s.on('timeout', () => {
      s.destroy();
      resolve({ ok: false, label, err: 'timeout' });
    });
    s.on('error', (e) => resolve({ ok: false, label, err: e.message }));
  });
}

function checkHttp(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://${API_HOST}:${port}/health`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          const dbOk = j.database === 'up' || j.database === undefined;
          resolve({ ok: res.statusCode === 200 && j.ok === true && dbOk, status: res.statusCode, body });
        } catch {
          resolve({ ok: false, status: res.statusCode, body });
        }
      });
    });
    req.setTimeout(4000);
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, err: 'timeout' });
    });
    req.on('error', (e) => resolve({ ok: false, err: e.message }));
  });
}

async function main() {
  const rt = loadRuntime();
  const PG_HOST = rt.DB_HOST || '127.0.0.1';
  const PG_PORT = rt.DB_PORT || rt.HOST_PG_PORT || 5433;
  const API_HOST = '127.0.0.1';
  const API_PORT = rt.API_PORT || 3000;

  const pg = await checkTcp(PG_HOST, PG_PORT, 'Postgres');
  const api = await checkHttp(API_PORT);

  if (pg.ok) console.log(`OK  Postgres em ${PG_HOST}:${PG_PORT}`);
  else console.log(`FALHA Postgres (${PG_HOST}:${PG_PORT}): ${pg.err || 'sem ligação'} — ligue o Postgres do DBeaver e confira config/stack.env`);

  if (api.ok) console.log(`OK  API em http://${API_HOST}:${API_PORT}/health`);
  else
    console.log(
      `FALHA API (http://${API_HOST}:${API_PORT}): ${api.err || JSON.stringify(api)} — corre na raiz: npm run api:dev (ou npm run dev:stack)`
    );

  if (!pg.ok || !api.ok) process.exit(1);
  console.log('Stack pronto: cd frontend && npm run dev → http://127.0.0.1:8080');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
