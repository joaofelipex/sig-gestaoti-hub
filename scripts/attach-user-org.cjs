#!/usr/bin/env node
/**
 * Associa o perfil de um utilizador à organização que já tem dados (ex.: seed demo).
 *
 * Uso:
 *   node scripts/attach-user-org.cjs adm@adm.com
 *   node scripts/attach-user-org.cjs adm@adm.com 22222222-2222-2222-2222-222222222222
 */
const { Pool } = require('pg');
const { loadBackendEnv } = require('./load-backend-env.cjs');

const DEMO_ORG = '22222222-2222-2222-2222-222222222222';

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  const targetOrg = process.argv[3] || DEMO_ORG;
  if (!email) {
    console.error('Uso: node scripts/attach-user-org.cjs <email> [org_id]');
    process.exit(1);
  }

  const cfg = loadBackendEnv();
  const pool = new Pool({ connectionString: cfg.DATABASE_URL });

  try {
    const u = await pool.query(
      `SELECT id, email FROM auth.users WHERE lower(coalesce(email,'')) = $1`,
      [email],
    );
    if (!u.rows[0]) {
      console.error('Utilizador não encontrado:', email);
      process.exit(1);
    }
    const userId = u.rows[0].id;

    const org = await pool.query(`SELECT id, nome FROM public.organizations WHERE id = $1`, [targetOrg]);
    if (!org.rows[0]) {
      console.error('Organização não encontrada:', targetOrg);
      process.exit(1);
    }

    const before = await pool.query(
      `SELECT p.org_id, o.nome,
        (SELECT count(*)::int FROM public.ativos WHERE org_id = p.org_id) AS ativos
       FROM public.profiles p
       JOIN public.organizations o ON o.id = p.org_id
       WHERE p.user_id = $1`,
      [userId],
    );

    await pool.query(`UPDATE public.profiles SET org_id = $1 WHERE user_id = $2`, [targetOrg, userId]);
    await pool.query(
      `UPDATE public.user_roles SET org_id = $1 WHERE user_id = $2`,
      [targetOrg, userId],
    );

    const after = await pool.query(
      `SELECT count(*)::int AS ativos FROM public.ativos WHERE org_id = $1`,
      [targetOrg],
    );

    console.log('OK — perfil atualizado');
    console.log('  Utilizador:', email);
    if (before.rows[0]) {
      console.log('  Org anterior:', before.rows[0].nome, `(${before.rows[0].ativos} ativos)`);
    }
    console.log('  Org nova:', org.rows[0].nome, `(${after.rows[0]?.ativos ?? 0} ativos)`);
    console.log('\nSaia e entre de novo na app (ou recarregue) para ver os dados.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
