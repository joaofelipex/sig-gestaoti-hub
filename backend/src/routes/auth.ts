import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getPostgresTargetLabel, pool, verifyConnection } from '../db';
import { getDataScope, isOrgScoped } from '../org-scope';
import { signToken } from '../jwt';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { authRateLimit } from '../middleware/rate-limit';
import { canWrite, getProfileOrg, isAdmin, isAppRole, type AppRole } from '../profile';
import { requireAdmin } from '../middleware/rbac';

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
      isAdmin: isAdmin(prof.role),
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
  const newPassword = String(req.body?.password ?? req.body?.newPassword ?? '');

  if (!newPassword) {
    res.status(400).json({ error: 'Senha é obrigatória' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    return;
  }

  const hashRow = await pool.query<{ hash: string }>(`SELECT crypt($1::text, gen_salt('bf')) AS hash`, [newPassword]);
  const hash = hashRow.rows[0]?.hash;
  if (!hash) {
    res.status(500).json({ error: 'Erro ao processar senha' });
    return;
  }

  await pool.query(`UPDATE auth.users SET encrypted_password = $1 WHERE id = $2`, [hash, uid]);
  res.json({ ok: true });
});

r.get('/users', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const me = await getProfileOrg(req.userId!);
  if (!me) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }
  const q = await pool.query<{
    user_id: string;
    email: string;
    nome: string;
    role: AppRole;
    created_at: string;
  }>(
    `SELECT p.user_id, p.email, p.nome,
            COALESCE(ur.role, 'usuario'::public.app_role) AS role,
            p.created_at
     FROM public.profiles p
     LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.org_id = p.org_id
     WHERE p.org_id = $1
     ORDER BY p.nome ASC`,
    [me.org_id],
  );
  res.json({ users: q.rows });
});

r.post('/users', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const me = await getProfileOrg(req.userId!);
  if (!me) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }

  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const nome = String(req.body?.nome || '').trim();
  const password = String(req.body?.password || '');
  const roleRaw = req.body?.role ?? 'usuario';

  if (!email || !nome || !password) {
    res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    return;
  }
  if (!isAppRole(roleRaw)) {
    res.status(400).json({ error: 'Papel inválido' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'E-mail inválido' });
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
    const userId = randomUUID();
    const hashRow = await client.query<{ hash: string }>(`SELECT crypt($1::text, gen_salt('bf')) AS hash`, [
      password,
    ]);
    const hash = hashRow.rows[0]?.hash;
    if (!hash) throw new Error('Falha ao gerar hash da senha');

    await client.query(
      `INSERT INTO auth.users (id, email, encrypted_password, created_at) VALUES ($1, $2, $3, now())`,
      [userId, email, hash],
    );
    await client.query(`INSERT INTO public.profiles (user_id, org_id, email, nome) VALUES ($1, $2, $3, $4)`, [
      userId,
      me.org_id,
      email,
      nome,
    ]);
    await client.query(`INSERT INTO public.user_roles (user_id, org_id, role) VALUES ($1, $2, $3)`, [
      userId,
      me.org_id,
      roleRaw,
    ]);
    await client.query('COMMIT');
    res.status(201).json({
      user: { user_id: userId, email, nome, role: roleRaw },
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('POST /auth/users:', e);
    res.status(500).json({ error: 'Erro ao criar utilizador' });
  } finally {
    client.release();
  }
});

r.patch('/users/:userId', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const me = await getProfileOrg(req.userId!);
  if (!me) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }

  const targetId = String(req.params.userId || '');
  if (!targetId) {
    res.status(400).json({ error: 'Utilizador inválido' });
    return;
  }

  const target = await pool.query<{ user_id: string; org_id: string }>(
    `SELECT user_id, org_id FROM public.profiles WHERE user_id = $1 AND org_id = $2`,
    [targetId, me.org_id],
  );
  if (!target.rowCount) {
    res.status(404).json({ error: 'Utilizador não encontrado nesta organização' });
    return;
  }

  const body = req.body ?? {};
  const hasNome = Object.prototype.hasOwnProperty.call(body, 'nome');
  const hasRole = Object.prototype.hasOwnProperty.call(body, 'role');
  const hasPassword = Object.prototype.hasOwnProperty.call(body, 'password');

  if (!hasNome && !hasRole && !hasPassword) {
    res.status(400).json({ error: 'Nenhum campo para atualizar' });
    return;
  }

  const nome = hasNome ? String(body.nome ?? '').trim() : undefined;
  const role = hasRole ? body.role : undefined;
  const password = hasPassword ? String(body.password ?? '') : undefined;

  if (nome !== undefined && !nome) {
    res.status(400).json({ error: 'Nome é obrigatório' });
    return;
  }
  if (role !== undefined && !isAppRole(role)) {
    res.status(400).json({ error: 'Papel inválido' });
    return;
  }
  if (password !== undefined && password.length > 0 && password.length < 6) {
    res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    return;
  }

  // Não deixar a org sem nenhum admin
  if (role !== undefined && role !== 'admin') {
    const admins = await pool.query(
      `SELECT count(*)::int AS n
       FROM public.user_roles
       WHERE org_id = $1 AND role = 'admin' AND user_id <> $2`,
      [me.org_id, targetId],
    );
    const n = Number(admins.rows[0]?.n ?? 0);
    const current = await pool.query<{ role: AppRole }>(
      `SELECT role FROM public.user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
      [targetId, me.org_id],
    );
    const wasAdmin = current.rows[0]?.role === 'admin';
    if (wasAdmin && n < 1) {
      res.status(400).json({ error: 'A organização precisa de pelo menos um administrador.' });
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (nome !== undefined) {
      await client.query(`UPDATE public.profiles SET nome = $1 WHERE user_id = $2 AND org_id = $3`, [
        nome,
        targetId,
        me.org_id,
      ]);
    }
    if (role !== undefined) {
      const upd = await client.query(
        `UPDATE public.user_roles SET role = $1 WHERE user_id = $2 AND org_id = $3`,
        [role, targetId, me.org_id],
      );
      if (!upd.rowCount) {
        await client.query(`INSERT INTO public.user_roles (user_id, org_id, role) VALUES ($1, $2, $3)`, [
          targetId,
          me.org_id,
          role,
        ]);
      }
    }
    if (password) {
      const hashRow = await client.query<{ hash: string }>(`SELECT crypt($1::text, gen_salt('bf')) AS hash`, [
        password,
      ]);
      const hash = hashRow.rows[0]?.hash;
      if (!hash) throw new Error('Falha ao gerar hash');
      await client.query(`UPDATE auth.users SET encrypted_password = $1 WHERE id = $2`, [hash, targetId]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('PATCH /auth/users:', e);
    res.status(500).json({ error: 'Erro ao atualizar utilizador' });
    return;
  } finally {
    client.release();
  }

  const updated = await pool.query(
    `SELECT p.user_id, p.email, p.nome,
            COALESCE(ur.role, 'usuario'::public.app_role) AS role
     FROM public.profiles p
     LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.org_id = p.org_id
     WHERE p.user_id = $1 AND p.org_id = $2`,
    [targetId, me.org_id],
  );
  res.json({ user: updated.rows[0] });
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
