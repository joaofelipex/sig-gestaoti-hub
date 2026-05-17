import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db';
import { signToken } from '../jwt';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';

const r = Router();

export async function getProfileOrg(userId: string) {
  const q = await pool.query(
    `SELECT p.org_id, p.email, p.nome FROM public.profiles p WHERE p.user_id = $1 LIMIT 1`,
    [userId]
  );
  return q.rows[0] as { org_id: string; email: string; nome: string } | undefined;
}

r.post('/login', async (req, res) => {
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    res.status(400).json({ error: 'Email e palavra-passe obrigatórios' });
    return;
  }
  const u = await pool.query(
    `SELECT id, email FROM auth.users
     WHERE lower(coalesce(email,'')) = $1
       AND encrypted_password IS NOT NULL
       AND crypt($2::text, encrypted_password::text) = encrypted_password`,
    [email, password]
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
  res.json({
    user: { id: uid, email: prof.email },
    profile: { org_id: prof.org_id, nome: prof.nome, email: prof.email },
  });
});

r.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

r.post('/signup', async (req, res) => {
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
    res.status(409).json({ error: 'Email já registado' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const org = await client.query(
      `INSERT INTO public.organizations (nome, cnpj, plano) VALUES ($1, null, 'standard') RETURNING id`,
      [organizacao]
    );
    const orgId = org.rows[0].id as string;
    const userId = randomUUID();
    const hashRow = await client.query<{ hash: string }>(
      `SELECT crypt($1::text, gen_salt('bf')) AS hash`,
      [password]
    );
    const hash = hashRow.rows[0]?.hash;
    if (!hash) {
      throw new Error('Falha ao gerar hash da palavra-passe');
    }
    await client.query(
      `INSERT INTO auth.users (id, email, encrypted_password, created_at) VALUES ($1, $2, $3, now())`,
      [userId, email, hash]
    );
    await client.query(
      `INSERT INTO public.profiles (user_id, org_id, email, nome) VALUES ($1, $2, $3, $4)`,
      [userId, orgId, email, nome]
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
