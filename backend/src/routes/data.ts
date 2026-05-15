import { Router } from 'express';
import type { Pool, PoolClient } from 'pg';
import { pool } from '../db';
import { API_TABLES } from '../tables';
import { pickRowColumns } from '../columns';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { getProfileOrg } from './auth';

const r = Router();

const DASHBOARD_TABLES = [
  'ativos',
  'dominios',
  'licencas',
  'servidores',
  'contratos',
  'manutencoes',
  'movimentacoes',
  'inventario',
  'alertas',
  'orcamentos',
  'acoes_economista',
  'registros_acesso',
  'riscos',
  'pagamentos',
] as const;

r.use(requireAuth);

r.get('/dashboard', async (req: AuthedRequest, res) => {
  const uid = req.userId!;
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }
  const orgId = prof.org_id;
  try {
    const out: Record<string, unknown[]> = {};
    for (const t of DASHBOARD_TABLES) {
      const q = await pool.query(`SELECT * FROM public.${t} WHERE org_id = $1`, [orgId]);
      out[t] = q.rows;
    }
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao carregar dados' });
  }
});

r.get('/empresas', async (req: AuthedRequest, res) => {
  const uid = req.userId!;
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }
  const q = await pool.query(`SELECT * FROM public.empresas WHERE org_id = $1 ORDER BY nome`, [prof.org_id]);
  res.json(q.rows);
});

/** Contagens por tabela (schema `public`) para a org do utilizador — usado na página «Dados & base». */
const SUMMARY_TABLES = [
  'empresas',
  'departamentos',
  'usuarios',
  ...DASHBOARD_TABLES,
  'dns_records',
  'inventario_movimentacoes',
  'termos_responsabilidade',
] as const;

r.get('/summary', async (req: AuthedRequest, res) => {
  const uid = req.userId!;
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }
  const orgId = prof.org_id;
  try {
    const ver = await pool.query(`SELECT version() AS v`);
    const counts: Record<string, number> = {};
    for (const t of SUMMARY_TABLES) {
      const q = await pool.query(`SELECT count(*)::int AS c FROM public.${t} WHERE org_id = $1::uuid`, [orgId]);
      counts[t] = q.rows[0]?.c ?? 0;
    }
    res.json({
      org_id: orgId,
      profile_email: prof.email,
      postgres_version: ver.rows[0]?.v as string,
      counts,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao ler resumo da base' });
  }
});

r.post('/:table', async (req: AuthedRequest, res) => {
  const table = String(req.params.table || '');
  if (!API_TABLES.has(table)) {
    res.status(404).json({ error: 'Tabela não permitida' });
    return;
  }
  if (table === 'profiles' || table === 'user_roles' || table === 'organizations') {
    res.status(403).json({ error: 'Operação não permitida nesta tabela' });
    return;
  }
  const uid = req.userId!;
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }

  const insertOne = async (client: Pool | PoolClient, item: Record<string, unknown>) => {
    const row = await pickRowColumns(pool, table, item, { stripOrgId: true });
    row.org_id = prof!.org_id;
    const keys = Object.keys(row);
    if (!keys.length) throw new Error('Corpo vazio');
    const vals = keys.map((k) => row[k]);
    const ph = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO public.${table} (${keys.join(', ')}) VALUES (${ph}) RETURNING *`;
    const q = await client.query(sql, vals);
    return q.rows[0];
  };

  const body = req.body;
  try {
    if (Array.isArray(body)) {
      if (!body.length) {
        res.status(400).json({ error: 'Lista vazia' });
        return;
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const inserted: unknown[] = [];
        for (const item of body) {
          inserted.push(await insertOne(client, item as Record<string, unknown>));
        }
        await client.query('COMMIT');
        res.status(201).json(inserted);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      return;
    }

    const row = await insertOne(pool, (body || {}) as Record<string, unknown>);
    res.status(201).json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro';
    res.status(400).json({ error: msg });
  }
});

r.patch('/:table/:id', async (req: AuthedRequest, res) => {
  const table = String(req.params.table || '');
  const id = String(req.params.id || '');
  if (!API_TABLES.has(table)) {
    res.status(404).json({ error: 'Tabela não permitida' });
    return;
  }
  if (table === 'profiles' || table === 'user_roles' || table === 'organizations') {
    res.status(403).json({ error: 'Operação não permitida nesta tabela' });
    return;
  }
  const uid = req.userId!;
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }
  const body = (req.body || {}) as Record<string, unknown>;
  const row = await pickRowColumns(pool, table, body, { stripOrgId: true });
  delete row.id;
  const keys = Object.keys(row);
  if (!keys.length) {
    res.status(400).json({ error: 'Nada a atualizar' });
    return;
  }
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const vals = [...keys.map((k) => row[k]), id, prof.org_id];
  const sql = `UPDATE public.${table} SET ${sets} WHERE id = $${keys.length + 1}::uuid AND org_id = $${keys.length + 2}::uuid RETURNING *`;
  try {
    const q = await pool.query(sql, vals);
    if (!q.rowCount) {
      res.status(404).json({ error: 'Registo não encontrado' });
      return;
    }
    res.json(q.rows[0]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro';
    res.status(400).json({ error: msg });
  }
});

r.delete('/:table/:id', async (req: AuthedRequest, res) => {
  const table = String(req.params.table || '');
  const id = String(req.params.id || '');
  if (!API_TABLES.has(table)) {
    res.status(404).json({ error: 'Tabela não permitida' });
    return;
  }
  if (table === 'profiles' || table === 'user_roles' || table === 'organizations') {
    res.status(403).json({ error: 'Operação não permitida nesta tabela' });
    return;
  }
  const uid = req.userId!;
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }
  try {
    const q = await pool.query(`DELETE FROM public.${table} WHERE id = $1::uuid AND org_id = $2::uuid`, [
      id,
      prof.org_id,
    ]);
    if (!q.rowCount) {
      res.status(404).json({ error: 'Registo não encontrado' });
      return;
    }
    res.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro';
    res.status(400).json({ error: msg });
  }
});

export default r;
