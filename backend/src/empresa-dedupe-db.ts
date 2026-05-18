import type { Pool, PoolClient } from 'pg';
import { EMPRESA_DEDUPE_KEY_SQL } from './empresa-dedupe';

/** Mesma chave que EMPRESA_DEDUPE_KEY_SQL, sem alias de tabela. */
export const EMPRESA_DEDUPE_KEY_PLAIN_SQL = EMPRESA_DEDUPE_KEY_SQL.replace(/\be\./g, '');

const TABLES_WITH_EMPRESA_ID = [
  'departamentos',
  'usuarios',
  'ativos',
  'dominios',
  'dns_records',
  'licencas',
  'servidores',
  'contratos',
  'manutencoes',
  'movimentacoes',
  'inventario',
  'inventario_movimentacoes',
  'alertas',
  'orcamentos',
  'acoes_economista',
  'registros_acesso',
  'riscos',
  'pagamentos',
  'termos_responsabilidade',
] as const;

export type EmpresaDedupeResult = {
  removed: number;
  relinked: number;
  before: number;
  after: number;
};

type PgConn = Pool | PoolClient;

export async function countEmpresaDuplicateGroups(conn: PgConn): Promise<number> {
  const q = await conn.query<{ c: number }>(`
    SELECT count(*)::int AS c FROM (
      SELECT 1
      FROM public.empresas
      GROUP BY ${EMPRESA_DEDUPE_KEY_PLAIN_SQL}
      HAVING count(*) > 1
    ) d
  `);
  return q.rows[0]?.c ?? 0;
}

/** Remove duplicatas no Postgres; idempotente (nada a fazer se já estiver limpo). */
export async function dedupeEmpresasInDatabase(conn: Pool): Promise<EmpresaDedupeResult> {
  const client = await conn.connect();
  try {
    const beforeQ = await client.query<{ c: number }>(
      'SELECT count(*)::int AS c FROM public.empresas',
    );
    const before = beforeQ.rows[0]?.c ?? 0;

    const groups = await client.query<{ ids: string[] }>(`
      SELECT array_agg(id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id) AS ids
      FROM public.empresas
      GROUP BY ${EMPRESA_DEDUPE_KEY_PLAIN_SQL}
      HAVING count(*) > 1
    `);

    if (!groups.rows.length) {
      return { removed: 0, relinked: 0, before, after: before };
    }

    await client.query('BEGIN');
    let removed = 0;
    let relinked = 0;

    for (const g of groups.rows) {
      const [keeper, ...dupes] = g.ids;
      for (const dupeId of dupes) {
        for (const table of TABLES_WITH_EMPRESA_ID) {
          const r = await client.query(
            `UPDATE public.${table} SET empresa_id = $1::uuid WHERE empresa_id = $2::uuid`,
            [keeper, dupeId],
          );
          relinked += r.rowCount ?? 0;
        }
        await client.query('DELETE FROM public.empresas WHERE id = $1::uuid', [dupeId]);
        removed += 1;
      }
    }

    await client.query('COMMIT');

    const afterQ = await client.query<{ c: number }>(
      'SELECT count(*)::int AS c FROM public.empresas',
    );
    return { removed, relinked, before, after: afterQ.rows[0]?.c ?? 0 };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Evita INSERT duplicado: devolve empresa existente (mesmo CNPJ ou nome). */
export async function findExistingEmpresa(
  conn: PgConn,
  row: { nome?: unknown; cnpj?: unknown },
): Promise<Record<string, unknown> | null> {
  const nome = row.nome ?? null;
  const cnpj = row.cnpj ?? null;
  const q = await conn.query(
    `
    SELECT *
    FROM public.empresas e
    WHERE
      (
        length(regexp_replace(coalesce($2::text, ''), '[^0-9]', '', 'g')) >= 11
        AND regexp_replace(coalesce(e.cnpj, ''), '[^0-9]', '', 'g')
          = regexp_replace(coalesce($2::text, ''), '[^0-9]', '', 'g')
      )
      OR (
        length(regexp_replace(coalesce($2::text, ''), '[^0-9]', '', 'g')) < 11
        AND length(btrim(coalesce($1::text, ''))) > 0
        AND lower(regexp_replace(btrim(e.nome), '[[:space:]]+', ' ', 'g'))
          = lower(regexp_replace(btrim($1::text), '[[:space:]]+', ' ', 'g'))
      )
    ORDER BY e.updated_at DESC NULLS LAST, e.created_at DESC NULLS LAST, e.id
    LIMIT 1
    `,
    [nome, cnpj],
  );
  return (q.rows[0] as Record<string, unknown>) ?? null;
}
