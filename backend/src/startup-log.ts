import { pool } from './db';
import { getDataScope } from './org-scope';

/** Resumo no terminal ao arrancar — ajuda a ver se a base tem dados. */
export async function logStartupDataSummary(): Promise<void> {
  const tables = [
    'ativos',
    'dominios',
    'licencas',
    'servidores',
    'empresas',
    'alertas',
    'pagamentos',
  ] as const;

  try {
    console.log(
      `[data] DATA_SCOPE=${getDataScope()} (leitura public.* = todos; escrita org só se DATA_SCOPE=org)`,
    );

    await pool.query(`
      UPDATE auth.users
      SET encrypted_password = crypt('demo123456', gen_salt('bf'))
      WHERE lower(coalesce(email,'')) = 'dev@local.imts'
        AND (encrypted_password IS NULL OR encrypted_password = '')
    `);

    const users = await pool.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM auth.users`,
    );
    const demo = await pool.query<{ ok: boolean; has_profile: boolean }>(
      `SELECT
         (encrypted_password IS NOT NULL AND crypt('demo123456', encrypted_password::text) = encrypted_password) AS ok,
         EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id) AS has_profile
       FROM auth.users u
       WHERE lower(coalesce(u.email,'')) = 'dev@local.imts' LIMIT 1`,
    );
    console.log(`[data] utilizadores: ${users.rows[0]?.c ?? 0}`);
    if (demo.rows[0]) {
      console.log(
        demo.rows[0].ok
          ? '[data] login demo OK (dev@local.imts / demo123456)'
          : '[data] usuário demo existe mas a senha não é demo123456',
      );
      if (!demo.rows[0].has_profile) {
        console.log('[data] AVISO: demo sem perfil — dashboard ficará vazio (403). Aplique 02_seed.sql');
      }
    } else {
      console.log('[data] sem dev@local.imts — cadastre-se na aplicação ou: npm run db:seed (Docker)');
    }

    for (const t of tables) {
      const q = await pool.query<{ c: number }>(
        `SELECT count(*)::int AS c FROM public.${t}`,
      );
      console.log(`[data] ${t}: ${q.rows[0]?.c ?? 0}`);
    }

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[data] não foi possível contar registros:', msg);
  }
}
