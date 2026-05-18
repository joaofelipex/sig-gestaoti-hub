#!/usr/bin/env node
/**
 * Verifica Postgres + login demo + contagens por org.
 */
const http = require('http');
const { Pool } = require('pg');
const { loadBackendEnv } = require('./load-backend-env.cjs');

async function httpJson(method, path, body, token) {
  const cfg = loadBackendEnv();
  const port = cfg.API_PORT;
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const cfg = loadBackendEnv();
  console.log('=== check-data ===\n');
  console.log('DB:', cfg.DATABASE_URL.replace(/:([^:@/]+)@/, ':***@'));

  const pool = new Pool({ connectionString: cfg.DATABASE_URL });
  try {
    await pool.query('SELECT 1');
    console.log('OK  Postgres ligado\n');

    const users = await pool.query(
      `SELECT id, email, encrypted_password IS NOT NULL AS has_pw FROM auth.users ORDER BY email LIMIT 10`,
    );
    console.log('auth.users:', users.rows);

    const prof = await pool.query(
      `SELECT user_id, org_id, email FROM public.profiles LIMIT 10`,
    );
    console.log('profiles:', prof.rows);

    const demo = await pool.query(
      `SELECT crypt('demo123456', encrypted_password::text) = encrypted_password AS ok
       FROM auth.users WHERE lower(email) = 'dev@local.imts' AND encrypted_password IS NOT NULL`,
    );
    console.log('demo login hash ok:', demo.rows[0]?.ok ?? 'sem utilizador demo');

    for (const t of ['ativos', 'dominios', 'licencas', 'empresas']) {
      const q = await pool.query(`SELECT org_id, count(*)::int c FROM public.${t} GROUP BY org_id`);
      console.log(`${t}:`, q.rows);
    }
  } finally {
    await pool.end();
  }

  console.log('\n--- API (precisa backend a correr: cd backend && npm run dev) ---');
  try {
    const health = await httpJson('GET', '/health');
    console.log('/health', health.status, health.body);

    const login = await httpJson('POST', '/api/auth/login', {
      email: 'dev@local.imts',
      password: 'demo123456',
    });
    console.log('/api/auth/login', login.status, login.body?.error || (login.body?.token ? 'token OK' : login.body));

    if (login.body?.token) {
      const dash = await httpJson('GET', '/api/data/dashboard', null, login.body.token);
      if (dash.status === 200 && dash.body) {
        const counts = Object.fromEntries(
          Object.entries(dash.body).map(([k, v]) => [k, Array.isArray(v) ? v.length : v]),
        );
        console.log('/api/data/dashboard', dash.status, counts);
      } else {
        console.log('/api/data/dashboard', dash.status, dash.body);
      }
    }
  } catch (e) {
    console.log('API inacessível:', e.message);
    console.log('→ Suba: cd backend && npm run dev');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
