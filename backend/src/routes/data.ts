import { Router } from 'express';
import type { Pool, PoolClient } from 'pg';
import { pool } from '../db';
import { API_TABLES } from '../tables';
import { pickRowColumns } from '../columns';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { getProfileOrg } from '../profile';
import { EMPRESAS_UNIQUE_SQL } from '../empresa-dedupe';
import { findExistingEmpresa } from '../empresa-dedupe-db';
import { getDataScope, isOrgScoped, sqlOrgReadScope, sqlOrgWriteScope } from '../org-scope';
import { requireWriteAccess } from '../middleware/rbac';

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
  'dns_records',
] as const;

type DashboardTable = (typeof DASHBOARD_TABLES)[number];

/** Colunas usadas pelo frontend — evita transferir jsonb pesados no carregamento inicial. */
const DASHBOARD_SELECT: Partial<Record<DashboardTable, string>> = {
  ativos: `id, org_id, empresa_id, tipo, status, marca, modelo, numero_serie,
    data_aquisicao, warranty_end, department_nome, assigned_to, valor_aquisicao`,
  dominios: `id, org_id, empresa_id, nome, registrar, data_vencimento, custo_renovacao,
    custo_anual, auto_renovacao, dns_provider, hosting_provider, ssl_vencimento, status, observacoes`,
  licencas: `id, org_id, empresa_id, nome, tipo, total_licencas, qtd_usuarios,
    chave_ativacao, custo_unitario, custo_mensal, data_renovacao, fornecedor, categoria`,
  servidores: `id, org_id, empresa_id, nome, provedor, tipo, regiao, ip_publico,
    sistema_operacional, cpu, ram, armazenamento, status, uptime_pct, custo_mensal,
    finalidade, equipe_responsavel, contrato_fim, ultimo_backup, url_monitoramento,
    ssl_vencimento, observacoes`,
  contratos: `id, org_id, empresa_id, supplier, object, type, status, cost_center, monthly_cost, end_date`,
  manutencoes: `id, org_id, empresa_id, ativo_id, tipo, status, data_abertura,
    data_conclusao, custo, fornecedor, descricao`,
  movimentacoes: `id, org_id, empresa_id, ativo_id, ativo_label, tipo, data,
    from_department, to_department, from_user, to_user, responsible, recipient,
    reason, notes, value, term_generated`,
  inventario: `id, org_id, empresa_id, nome, categoria, quantity, min_quantity,
    unit, unit_cost, location, supplier, sku, notes`,
  alertas: `id, org_id, empresa_id, titulo, mensagem, tipo, severidade, lida, link, created_at`,
  orcamentos: `id, org_id, empresa_id, year, category, cost_center, annual_budget, notes`,
  acoes_economista: `id, org_id, empresa_id, title, description, category, priority,
    effort, estimated_savings, owner, due_date, status, created_at`,
  registros_acesso: `id, org_id, empresa_id, user_label, recurso, recurso_tipo,
    nivel_acesso, data_concessao, ultimo_acesso, ativo`,
  riscos: `id, org_id, empresa_id, title, severity, owner, mitigation`,
  pagamentos: `id, org_id, empresa_id, nome, categoria, competencia, valor, status,
    vencimento, data_pagamento, fornecedor, observacoes`,
  dns_records: `id, org_id, empresa_id, dominio_id, tipo, nome, valor, ttl, prioridade, observacoes`,
};

function parseDashboardTables(raw: unknown): DashboardTable[] {
  if (typeof raw !== 'string' || !raw.trim()) {
    return [...DASHBOARD_TABLES];
  }
  const wanted = new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return DASHBOARD_TABLES.filter((t) => wanted.has(t));
}

r.use(requireAuth);

const STATUS_TABLES = [
  'empresas',
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
  'dns_records',
] as const;

r.get('/status', async (req: AuthedRequest, res) => {
  const uid = req.userId!;
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }
  const scope = getDataScope();
  const where = sqlOrgReadScope('$1');
  const params = isOrgScoped() ? [prof.org_id] : [];
  try {
    const counts = await Promise.all(
      STATUS_TABLES.map(async (table) => {
        const q = await pool.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM public.${table} WHERE ${where}`,
          params,
        );
        return [table, parseInt(q.rows[0]?.count ?? '0', 10)] as const;
      }),
    );
    res.setHeader('X-Data-Scope', scope);
    res.json({
      org_id: prof.org_id,
      org_nome: prof.org_nome,
      dataScope: scope,
      role: prof.role,
      tableCounts: Object.fromEntries(counts),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao obter estado dos dados' });
  }
});

r.get('/dashboard', async (req: AuthedRequest, res) => {
  const uid = req.userId!;
  const prof = await getProfileOrg(uid);
  if (!prof) {
    res.status(403).json({ error: 'Sem perfil' });
    return;
  }
  const scope = getDataScope();
  const tables = parseDashboardTables(req.query.tables);
  try {
    const where = sqlOrgReadScope('$1');
    const params = isOrgScoped() ? [prof.org_id] : [];
    const rows = await Promise.all(
      tables.map(async (t) => {
        const cols = DASHBOARD_SELECT[t];
        const sql = cols
          ? `SELECT ${cols} FROM public.${t} WHERE ${where}`
          : `SELECT * FROM public.${t} WHERE ${where}`;
        const q = await pool.query(sql, params);
        return [t, q.rows] as const;
      }),
    );
    const out = Object.fromEntries(rows) as Record<string, unknown[]>;
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

  const sql = isOrgScoped()
    ? `SELECT * FROM (${EMPRESAS_UNIQUE_SQL}) q WHERE q.org_id = $1`
    : EMPRESAS_UNIQUE_SQL;
  const q = await pool.query(sql, isOrgScoped() ? [prof.org_id] : []);
  res.json(q.rows);
});

r.post('/:table', requireWriteAccess, async (req: AuthedRequest, res) => {
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
    if (table === 'empresas') {
      const existing = await findExistingEmpresa(client, row);
      if (existing) return existing;
    }
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

r.patch('/:table/:id', requireWriteAccess, async (req: AuthedRequest, res) => {
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
      res.status(404).json({ error: 'Registro não encontrado' });
      return;
    }
    res.json(q.rows[0]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro';
    res.status(400).json({ error: msg });
  }
});

r.delete('/:table/:id', requireWriteAccess, async (req: AuthedRequest, res) => {
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
      res.status(404).json({ error: 'Registro não encontrado' });
      return;
    }
    res.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro';
    res.status(400).json({ error: msg });
  }
});

export default r;
