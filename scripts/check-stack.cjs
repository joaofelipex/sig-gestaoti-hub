/**
 * Verifica Postgres (5433) e API (3000 /health). Uso: npm run check:stack
 */
const net = require('net');
const http = require('http');

const PG_HOST = process.env.DB_HOST || '127.0.0.1';
const PG_PORT = parseInt(process.env.DB_PORT || process.env.HOST_PG_PORT || '5433', 10);
const API_HOST = '127.0.0.1';
const API_PORT = parseInt(process.env.PORT || '3000', 10);

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
          resolve({ ok: res.statusCode === 200 && j.ok === true, status: res.statusCode, body });
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
  const pg = await checkTcp(PG_HOST, PG_PORT, 'Postgres');
  const api = await checkHttp(API_PORT);

  if (pg.ok) console.log(`OK  Postgres em ${PG_HOST}:${PG_PORT}`);
  else console.log(`FALHA Postgres (${PG_HOST}:${PG_PORT}): ${pg.err || 'sem ligação'} — corre na raiz: npm run db:up`);

  if (api.ok) console.log(`OK  API em http://${API_HOST}:${API_PORT}/health`);
  else
    console.log(
      `FALHA API (http://${API_HOST}:${API_PORT}): ${api.err || JSON.stringify(api)} — corre na raiz: npm run api:dev (ou npm run dev:stack)`
    );

  if (!pg.ok || !api.ok) process.exit(1);
  console.log('Stack pronto: abre o Angular (ex.: npm run dev:ui ou npm run dev:stack) em http://127.0.0.1:8080');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
