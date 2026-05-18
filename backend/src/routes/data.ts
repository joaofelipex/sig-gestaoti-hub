import { Router } from 'express';
import type { Pool, PoolClient } from 'pg';
import { pool } from '../db';
import { API_TABLES } from '../tables';
import { pickRowColumns } from '../columns';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { getProfileOrg } from './auth';
import { getDataScope, isOrgScoped, sqlOrgReadScope, sqlOrgWriteScope } from '../org-scope';

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
  const scope = getDataScope();
  try {
    const out: Record<string, unknown[]> = {};
    const where = sqlOrgReadScope('$1');
    for (const t of DASHBOARD_TABLES) {
      const q = isOrgScoped()
        ? await pool.query(`SELECT * FROM public.${t} WHERE ${where}`, [orgId])
        : await pool.query(`SELECT * FROM public.${t} WHERE ${where}`);
      out[t] = q.rows;
    }
    res.setHeader('X-Data-Scope', scope);
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
  const where = sqlOrgReadScope('$1');
  const q = isOrgScoped()
    ? await pool.query(`SELECT * FROM public.empresas WHERE ${where} ORDER BY nome`, [prof.org_id])
    : await pool.query(`SELECT * FROM public.empresas WHERE ${where} ORDER BY nome`);
  res.json(q.rows);
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
    // org_id é NOT NULL no schema — novos registos usam a org do perfil
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
  const idPh = keys.length + 1;
  const orgPh = keys.length + 2;
  const vals = isOrgScoped()
    ? [...keys.map((k) => row[k]), id, prof.org_id]
    : [...keys.map((k) => row[k]), id];
  const where = sqlOrgWriteScope(`$${orgPh}`, `$${idPh}`);
  const sql = `UPDATE public.${table} SET ${sets} WHERE ${where} RETURNING *`;
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
    const where = sqlOrgWriteScope('$2', '$1');
    const params = isOrgScoped() ? [id, prof.org_id] : [id];
    const q = await pool.query(`DELETE FROM public.${table} WHERE ${where}`, params);
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
