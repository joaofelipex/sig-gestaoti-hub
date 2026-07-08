import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getPostgresTargetLabel, pool, verifyConnection } from '../db';
import { getDataScope, isOrgScoped } from '../org-scope';
import { signToken } from '../jwt';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { authRateLimit } from '../middleware/rate-limit';
import { canWrite, getProfileOrg } from '../profile';

const r = Router();

export { getProfileOrg } from '../profile';

r.post('/login', authRateLimit, async (req, res) => {
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    return;
  }
  const u = await pool.query(
    `SELECT id, email FROM auth.users
     WHERE lower(coalesce(email,'')) = $1
       AND encrypted_password IS NOT NULL
       AND crypt($2::text, encrypted_password::text) = encrypted_password`,
    [email, password],
  );
  const row = u.rows[0] as { id: string; email: string } | undefined;
  if (!row) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }
  const token = signToken({ sub: row.id, email: row.email });
  res.json({ token, user: { id: row.id, email: row.email } });
});

r.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.userId!;
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(404).json({ error: 'Perfil não encontrado' });
    return;
  }
  const orgId = prof.org_id;
  const scope = getDataScope();
  const orgFilter = isOrgScoped() ? 'WHERE org_id = $1' : '';
  const orgParams = isOrgScoped() ? [orgId] : [];

  const [pg, countsQ] = await Promise.all([
    verifyConnection().catch(() => null),
    pool.query<{ ativos: number; empresas: number; alertas: number }>(
      `SELECT
         (SELECT count(*)::int FROM public.ativos ${orgFilter}) AS ativos,
         (SELECT count(*)::int FROM public.empresas ${orgFilter}) AS empresas,
         (SELECT count(*)::int FROM public.alertas ${orgFilter}) AS alertas`,
      orgParams,
    ),
  ]);
  const counts = countsQ.rows[0] ?? { ativos: 0, empresas: 0, alertas: 0 };

  res.json({
    user: { id: uid, email: prof.email },
    profile: {
      org_id: orgId,
      org_nome: prof.org_nome,
      nome: prof.nome,
      email: prof.email,
      avatar_url: prof.avatar_url,
      role: prof.role,
    },
    permissions: {
      canWrite: canWrite(prof.role),
    },
    postgres: {
      configured: getPostgresTargetLabel(),
      database: pg?.database ?? null,
      host: pg?.host ?? null,
      port: pg?.port ?? null,
    },
    dataCounts: counts,
    dataScope: scope,
    writeScope: scope,
  });
});

r.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

r.patch('/me', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.userId!;
  const body = req.body ?? {};
  const hasNome = Object.prototype.hasOwnProperty.call(body, 'nome');
  const hasEmail = Object.prototype.hasOwnProperty.call(body, 'email');
  const hasAvatar = Object.prototype.hasOwnProperty.call(body, 'avatar_url');

  if (!hasNome && !hasEmail && !hasAvatar) {
    res.status(400).json({ error: 'Nenhum campo para atualizar' });
    return;
  }

  const nome = hasNome ? String(body.nome ?? '').trim() : undefined;
  const email = hasEmail
    ? String(body.email ?? '')
        .trim()
        .toLowerCase()
    : undefined;
  const avatar_url = hasAvatar ? (body.avatar_url ? String(body.avatar_url).trim() : null) : undefined;

  if (nome !== undefined && !nome) {
    res.status(400).json({ error: 'Nome é obrigatório' });
    return;
  }
  if (email !== undefined) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'E-mail inválido' });
      return;
    }
    const exists = await pool.query(`SELECT 1 FROM auth.users WHERE lower(coalesce(email,'')) = $1 AND id <> $2`, [
      email,
      uid,
    ]);
    if (exists.rowCount) {
      res.status(409).json({ error: 'E-mail já utilizado por outra conta' });
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (email !== undefined) {
      await client.query(`UPDATE auth.users SET email = $1 WHERE id = $2`, [email, uid]);
    }
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (nome !== undefined) {
      sets.push(`nome = $${i++}`);
      params.push(nome);
    }
    if (email !== undefined) {
      sets.push(`email = $${i++}`);
      params.push(email);
    }
    if (avatar_url !== undefined) {
      sets.push(`avatar_url = $${i++}`);
      params.push(avatar_url);
    }
    params.push(uid);
    await client.query(`UPDATE public.profiles SET ${sets.join(', ')} WHERE user_id = $${i}`, params);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('patch /me:', e);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
    return;
  } finally {
    client.release();
  }

  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(404).json({ error: 'Perfil não encontrado' });
    return;
  }
  res.json({
    profile: {
      org_id: prof.org_id,
      org_nome: prof.org_nome,
      nome: prof.nome,
      email: prof.email,
      avatar_url: prof.avatar_url,
      role: prof.role,
    },
  });
});

r.post('/change-password', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.userId!;
  const currentPassword = String(req.body?.currentPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    return;
  }

  const check = await pool.query(
    `SELECT 1 FROM auth.users
     WHERE id = $1
       AND encrypted_password IS NOT NULL
       AND crypt($2::text, encrypted_password::text) = encrypted_password`,
    [uid, currentPassword],
  );
  if (!check.rowCount) {
    res.status(401).json({ error: 'Senha atual incorreta' });
    return;
  }

  const hashRow = await pool.query<{ hash: string }>(`SELECT crypt($1::text, gen_salt('bf')) AS hash`, [newPassword]);
  const hash = hashRow.rows[0]?.hash;
  if (!hash) {
    res.status(500).json({ error: 'Erro ao processar nova senha' });
    return;
  }

  await pool.query(`UPDATE auth.users SET encrypted_password = $1 WHERE id = $2`, [hash, uid]);
  res.json({ ok: true });
});

r.post('/signup', authRateLimit, async (req, res) => {
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || '');
  const nome = String(req.body?.nome || '').trim();
  const organizacao = String(req.body?.organizacao || '').trim();
  if (!email || !password || password.length < 6 || !nome || !organizacao) {
    res.status(400).json({ error: 'Dados inválidos' });
    return;
  }
  const exists = await pool.query(`SELECT 1 FROM auth.users WHERE lower(coalesce(email,'')) = $1`, [email]);
  if (exists.rowCount) {
    res.status(409).json({ error: 'E-mail já cadastrado' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const org = await client.query(
      `INSERT INTO public.organizations (nome, cnpj, plano) VALUES ($1, null, 'standard') RETURNING id`,
      [organizacao],
    );
    const orgId = org.rows[0].id as string;
    const userId = randomUUID();
    const hashRow = await client.query<{ hash: string }>(
      `SELECT crypt($1::text, gen_salt('bf')) AS hash`,
      [password],
    );
    const hash = hashRow.rows[0]?.hash;
    if (!hash) {
      throw new Error('Falha ao gerar hash da senha');
    }
    await client.query(
      `INSERT INTO auth.users (id, email, encrypted_password, created_at) VALUES ($1, $2, $3, now())`,
      [userId, email, hash],
    );
    await client.query(
      `INSERT INTO public.profiles (user_id, org_id, email, nome) VALUES ($1, $2, $3, $4)`,
      [userId, orgId, email, nome],
    );
    await client.query(`INSERT INTO public.user_roles (user_id, org_id, role) VALUES ($1, $2, 'admin')`, [
      userId,
      orgId,
    ]);
    await client.query('COMMIT');
    const token = signToken({ sub: userId, email });
    res.status(201).json({ token, user: { id: userId, email } });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('signup:', e);
    const msg = e instanceof Error ? e.message : '';
    if (/encrypted_password|pgcrypto|crypt/i.test(msg)) {
      res.status(500).json({
        error: 'Base desatualizada. Na raiz do projeto: npm run db:apply-migrations e reinicie a API.',
      });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar conta' });
  } finally {
    client.release();
  }
});

export default r;
