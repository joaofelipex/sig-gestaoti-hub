import type { Pool } from 'pg';

const cache = new Map<string, Set<string>>();

export async function publicColumns(pool: Pool, table: string): Promise<Set<string>> {
  const hit = cache.get(table);
  if (hit) return hit;
  const r = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  const set = new Set(r.rows.map((x) => x.column_name));
  cache.set(table, set);
  return set;
}

/** Filtra o body JSON a colunas existentes na tabela; opcionalmente remove org_id. */
export async function pickRowColumns(
  pool: Pool,
  table: string,
  body: Record<string, unknown>,
  options: { stripOrgId?: boolean } = {}
): Promise<Record<string, unknown>> {
  const cols = await publicColumns(pool, table);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!cols.has(k)) continue;
    if (options.stripOrgId && k === 'org_id') continue;
    out[k] = v;
  }
  return out;
}
