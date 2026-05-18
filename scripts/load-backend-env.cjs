/**
 * Lê variáveis de `backend/.env` (ou `.env.example` se em falta).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BE_ENV = path.join(ROOT, 'backend', '.env');
const BE_EXAMPLE = path.join(ROOT, 'backend', '.env.example');

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
  if (cfg.DATABASE_URL && String(cfg.DATABASE_URL).trim()) {
    return String(cfg.DATABASE_URL).trim();
  }
  const u = encodeURIComponent(cfg.DB_USERNAME || 'postgres');
  const p = encodeURIComponent(cfg.DB_PASSWORD || 'postgres');
  const h = cfg.DB_HOST || '127.0.0.1';
  const port = cfg.DB_PORT || '5432';
  const db = cfg.DB_DATABASE || 'sig_heartbeat_hub';
  return `postgresql://${u}:${p}@${h}:${port}/${db}`;
}

function loadBackendEnv() {
  const fromFile = fs.existsSync(BE_ENV) ? BE_ENV : BE_EXAMPLE;
  if (!fs.existsSync(fromFile)) {
    throw new Error('Crie backend/.env (copie de backend/.env.example)');
  }
  const cfg = parseEnvFile(fromFile);
  const DATABASE_URL = buildDatabaseUrl(cfg);
  const DB_PORT = cfg.DB_PORT || '5432';
  return {
    DATABASE_URL,
    DB_HOST: cfg.DB_HOST || '127.0.0.1',
    DB_PORT,
    DB_USERNAME: cfg.DB_USERNAME || 'postgres',
    DB_PASSWORD: cfg.DB_PASSWORD || 'postgres',
    DB_DATABASE: cfg.DB_DATABASE || 'sig_heartbeat_hub',
    HOST_PG_PORT: cfg.DB_PORT || cfg.HOST_PG_PORT || '5432',
    API_PORT: cfg.PORT || '3000',
    PORT: cfg.PORT || '3000',
    CORS_ORIGIN: cfg.CORS_ORIGIN || '',
    JWT_SECRET: cfg.JWT_SECRET || '',
    _source: fromFile,
  };
}

module.exports = { loadBackendEnv, parseEnvFile, buildDatabaseUrl, BE_ENV, BE_EXAMPLE };
