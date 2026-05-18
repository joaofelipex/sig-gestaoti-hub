/**
 * Fonte de verdade da stack: `config/stack.env.example` (defaults) + `config/stack.env` (opcional, sobrepõe).
 * Gera:
 *   - config/stack.runtime.json
 *   - frontend/src/environments/environment.stack.ts
 *   - frontend/proxy.conf.json
 *   - backend/.env (merge de chaves conhecidas; mantém outras linhas do .env existente)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXAMPLE = path.join(ROOT, 'config', 'stack.env.example');
const OVERRIDE = path.join(ROOT, 'config', 'stack.env');
const RUNTIME = path.join(ROOT, 'config', 'stack.runtime.json');
const FE_ENV = path.join(ROOT, 'frontend', 'src', 'environments', 'environment.stack.ts');
const FE_PROXY = path.join(ROOT, 'frontend', 'proxy.conf.json');
const BE_ENV = path.join(ROOT, 'backend', '.env');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function buildDatabaseUrl(cfg) {
  const u = encodeURIComponent(cfg.DB_USERNAME || 'postgres');
  const p = encodeURIComponent(cfg.DB_PASSWORD || 'postgres');
  const h = cfg.DB_HOST || '127.0.0.1';
  const port = cfg.DB_PORT || '5433';
  const db = cfg.DB_DATABASE || 'sig_heartbeat_hub';
  return `postgresql://${u}:${p}@${h}:${port}/${db}`;
}

function ensureStackEnvFile() {
  if (fs.existsSync(OVERRIDE)) return;
  fs.mkdirSync(path.dirname(OVERRIDE), { recursive: true });
  fs.copyFileSync(EXAMPLE, OVERRIDE);
  console.log('>> Criado config/stack.env a partir do exemplo — ajuste DB_PORT à sua instância Postgres.');
  console.log('>> Ajuste DATABASE_URL se usar outro servidor e volte a correr: npm run sync:stack');
}

function mergeStack() {
  ensureStackEnvFile();
  const defaults = parseEnvFile(EXAMPLE);
  const over = fs.existsSync(OVERRIDE) ? parseEnvFile(OVERRIDE) : {};
  const cfg = { ...defaults, ...over };

  cfg.STACK = cfg.STACK || 'local';
  cfg.HOST_PG_PORT = cfg.HOST_PG_PORT || '5433';
  cfg.API_PORT = cfg.API_PORT || '3000';
  cfg.DB_HOST = cfg.DB_HOST || '127.0.0.1';
  cfg.DB_PORT = cfg.DB_PORT || cfg.HOST_PG_PORT;
  cfg.DB_USERNAME = cfg.DB_USERNAME || 'postgres';
  cfg.DB_PASSWORD = cfg.DB_PASSWORD || 'postgres';
  cfg.DB_DATABASE = cfg.DB_DATABASE || 'sig_heartbeat_hub';
  cfg.PUBLIC_API_URL = cfg.PUBLIC_API_URL != null && cfg.PUBLIC_API_URL !== '' ? cfg.PUBLIC_API_URL : '/api';
  cfg.CORS_ORIGIN =
    cfg.CORS_ORIGIN ||
    'http://127.0.0.1:8080,http://localhost:8080,http://[::1]:8080';
  cfg.JWT_SECRET = cfg.JWT_SECRET || 'alterar-em-desenvolvimento';

  if (!cfg.DATABASE_URL || String(cfg.DATABASE_URL).trim() === '') {
    cfg.DATABASE_URL = buildDatabaseUrl(cfg);
  }

  const rt = {
    STACK: cfg.STACK,
    HOST_PG_PORT: parseInt(String(cfg.HOST_PG_PORT), 10),
    API_PORT: parseInt(String(cfg.API_PORT), 10),
    DB_HOST: cfg.DB_HOST,
    DB_PORT: parseInt(String(cfg.DB_PORT), 10),
    DB_USERNAME: cfg.DB_USERNAME,
    DB_PASSWORD: cfg.DB_PASSWORD,
    DB_DATABASE: cfg.DB_DATABASE,
    DATABASE_URL: cfg.DATABASE_URL,
    PUBLIC_API_URL: cfg.PUBLIC_API_URL,
    CORS_ORIGIN: cfg.CORS_ORIGIN,
    JWT_SECRET: cfg.JWT_SECRET,
  };

  fs.mkdirSync(path.dirname(RUNTIME), { recursive: true });
  fs.writeFileSync(RUNTIME, JSON.stringify(rt, null, 2) + '\n', 'utf8');

  const showHint = String(cfg.STACK).toLowerCase() === 'local';
  const apiUrlEsc = JSON.stringify(cfg.PUBLIC_API_URL);
  const stackEsc = JSON.stringify(cfg.STACK);
  const feBody =
    '/**\n' +
    ' * Gerado por `npm run sync:stack` a partir de config/stack.env.example (+ config/stack.env se existir).\n' +
    ' * Não editar à mão: altere a stack e volte a correr sync.\n' +
    ' */\n' +
    "import { SIG_DEFAULT_WHITELABEL, type WhiteLabelConfig } from '../app/core/white-label.model';\n\n" +
    'export const environment = {\n' +
    '  production: false,\n' +
    `  apiUrl: ${apiUrlEsc},\n` +
    `  showLocalDemoHint: ${showHint ? 'true' : 'false'},\n` +
    `  stack: ${stackEsc},\n` +
    '  whiteLabel: {\n' +
    '    ...SIG_DEFAULT_WHITELABEL,\n' +
    '  } satisfies WhiteLabelConfig,\n' +
    '};\n';
  fs.mkdirSync(path.dirname(FE_ENV), { recursive: true });
  fs.writeFileSync(FE_ENV, feBody, 'utf8');

  const target = `http://127.0.0.1:${rt.API_PORT}`;
  const proxy = {
    '/api': {
      target,
      secure: false,
      changeOrigin: true,
      logLevel: 'silent',
    },
  };
  fs.writeFileSync(FE_PROXY, JSON.stringify(proxy, null, 2) + '\n', 'utf8');

  const beLines = [
    '# --- Gerado / actualizado por npm run sync:stack ---',
    `DATABASE_URL=${cfg.DATABASE_URL}`,
    `DB_HOST=${cfg.DB_HOST}`,
    `DB_PORT=${cfg.DB_PORT}`,
    `DB_USERNAME=${cfg.DB_USERNAME}`,
    `DB_PASSWORD=${cfg.DB_PASSWORD}`,
    `DB_DATABASE=${cfg.DB_DATABASE}`,
    `PORT=${cfg.API_PORT}`,
    `CORS_ORIGIN=${cfg.CORS_ORIGIN}`,
    `JWT_SECRET=${cfg.JWT_SECRET}`,
    '',
  ];

  const controlled = new Set([
    'DATABASE_URL',
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'PORT',
    'CORS_ORIGIN',
    'JWT_SECRET',
  ]);

  const extra = [];
  if (fs.existsSync(BE_ENV)) {
    const raw = fs.readFileSync(BE_ENV, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      if (controlled.has(k)) continue;
      extra.push(line.endsWith('\n') ? line : line + '\n');
    }
  }

  fs.mkdirSync(path.dirname(BE_ENV), { recursive: true });
  fs.writeFileSync(BE_ENV, [...beLines, ...extra].join('\n'), 'utf8');

  if (!process.env.STACK_SYNC_QUIET && !process.argv.includes('--quiet')) {
    console.log(
      `sync:stack OK — STACK=${rt.STACK} · Postgres ${rt.DATABASE_URL.replace(/:[^:@/]+@/, ':***@')} · API :${rt.API_PORT} · Angular apiUrl=${rt.PUBLIC_API_URL}`,
    );
  }
}

if (require.main === module) {
  mergeStack();
}

module.exports = { mergeStack };
