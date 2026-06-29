import './env';
import { Pool, type PoolConfig } from 'pg';

export interface PostgresTarget {
  database: string;
  host: string;
  port: number;
}

/** Rótulo seguro para logs (sem palavra-passe). */
export function getPostgresTargetLabel(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    try {
      const u = new URL(url);
      const host = u.hostname || 'localhost';
      const port = u.port || '5432';
      const db = u.pathname.replace(/^\//, '') || '(default)';
      return `${host}:${port}/${db}`;
    } catch {
      return 'DATABASE_URL (inválida)';
    }
  }
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || '5433';
  const db = process.env.DB_DATABASE || 'sig_gestao_ti';
  return `${host}:${port}/${db}`;
}

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
    database: process.env.DB_DATABASE || 'sig_gestao_ti',
  };
}

export const pool = new Pool(buildPoolConfig());

/** Ligação real ao PostgreSQL configurado em DATABASE_URL / DB_*. */
export async function verifyConnection(): Promise<PostgresTarget> {
  const label = getPostgresTargetLabel();
  const [hostPort, dbName] = label.split('/');
  const [hostFromEnv, portFromEnv] = (hostPort || '127.0.0.1:5432').split(':');

  const r = await pool.query<{
    database: string;
    host: string | null;
    port: number | null;
  }>(
    `SELECT
       current_database() AS database,
       inet_server_addr()::text AS host,
       inet_server_port() AS port`,
  );

  const row = r.rows[0];
  return {
    database: row.database || dbName || process.env.DB_DATABASE || 'sig_gestao_ti',
    host: row.host || hostFromEnv || '127.0.0.1',
    port: row.port ?? parseInt(portFromEnv || process.env.DB_PORT || '5432', 10),
  };
}

/** Migrações mínimas de auth (pgcrypto + coluna de palavra-passe). */
export async function ensureAuthSchema(): Promise<void> {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pool.query('ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS encrypted_password text');
}
