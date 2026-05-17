import { Pool, type PoolConfig } from 'pg';

function buildPoolConfig(): PoolConfig {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return { connectionString: url };
  }
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'sig_heartbeat_hub',
  };
}

export const pool = new Pool(buildPoolConfig());

/** Garante extensão/coluna usadas por login e cadastro (bases antigas sem 03_api_auth.sql). */
export async function ensureAuthSchema(): Promise<void> {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pool.query('ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS encrypted_password text');
}
