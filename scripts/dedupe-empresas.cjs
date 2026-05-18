#!/usr/bin/env node
/** Atalho manual — a API já deduplica empresas ao arrancar. */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const { Pool } = require('pg');

const DEDUPE_KEY_SQL = `
  CASE
    WHEN length(regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g')) >= 11 THEN
      'c:' || regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g')
    WHEN length(btrim(coalesce(nome, ''))) > 0 THEN
      'n:' || lower(regexp_replace(btrim(nome), '[[:space:]]+', ' ', 'g'))
    ELSE 'i:' || id::text
  END
`;

const TABLES_WITH_EMPRESA_ID = [
  'departamentos', 'usuarios', 'ativos', 'dominios', 'dns_records', 'licencas', 'servidores',
  'contratos', 'manutencoes', 'movimentacoes', 'inventario', 'inventario_movimentacoes',
  'alertas', 'orcamentos', 'acoes_economista', 'registros_acesso', 'riscos', 'pagamentos',
  'termos_responsabilidade',
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const before = (await client.query('SELECT count(*)::int AS c FROM public.empresas')).rows[0].c;
    const groups = await client.query(`
      SELECT array_agg(id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id) AS ids
      FROM public.empresas GROUP BY ${DEDUPE_KEY_SQL} HAVING count(*) > 1`);
    if (!groups.rows.length) {
      console.log('Nenhuma duplicata (igual ao arranque automático da API).');
      return;
    }
    await client.query('BEGIN');
    let removed = 0;
    let relinked = 0;
    for (const g of groups.rows) {
      const [keeper, ...dupes] = g.ids;
      for (const dupeId of dupes) {
        for (const table of TABLES_WITH_EMPRESA_ID) {
          relinked += (await client.query(
            `UPDATE public.${table} SET empresa_id = $1::uuid WHERE empresa_id = $2::uuid`,
            [keeper, dupeId],
          )).rowCount || 0;
        }
        await client.query('DELETE FROM public.empresas WHERE id = $1::uuid', [dupeId]);
        removed++;
      }
    }
    await client.query('COMMIT');
    const after = (await client.query('SELECT count(*)::int AS c FROM public.empresas')).rows[0].c;
    console.log(`Empresas: ${before} → ${after} (removidas ${removed}, FKs ${relinked})`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
