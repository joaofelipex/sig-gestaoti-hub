/**
 * Importa CSV de exportação (delimitador ';', nomes *-export-*.csv) para PostgreSQL.
 *
 * Uso (Postgres a correr — cola a URI ou usa Docker na 5432):
 *   DATABASE_URL="postgresql://USER:SENHA@HOST:PORTA/NOME_BD" CSV_DIR="C:/Users/.../Downloads" npm run db:import-csv
 *
 * Variáveis de ambiente:
 *   DATABASE_URL ou POSTGRES_URL — se omitido, usa TARGET=docker (Postgres local na porta HOST_PG_PORT, default 5432)
 *   CSV_DIR — pasta com *-export-*.csv (ou 1º argumento: node scripts/import-csv-dir.cjs "C:/.../Downloads")
 *   TARGET=docker — só usado quando não passas DATABASE_URL (ligação ao contentor local)
 *   AUTH_MODE=auto | full | docker | none — auto: auth.identities → full; só auth.users → docker
 *
 * Palavra-passe no modo full (identities + users): imported123
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Client } = require('pg');

const DEFAULT_CSV_DIR = path.join(__dirname, '..', 'database', 'import', 'csv');
const IMPORTED_PASSWORD = 'imported123';

function nullIfEmpty(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === '' || s === '\t-' || s === '-') return null;
  return s;
}

function bool(v) {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'true' || s === 't' || s === '1') return true;
  if (s === 'false' || s === 'f' || s === '0') return false;
  return null;
}

function num(v) {
  const n = nullIfEmpty(v);
  if (n === null) return null;
  const x = Number(String(n).replace(',', '.'));
  return Number.isFinite(x) ? x : null;
}

function intg(v) {
  const n = num(v);
  if (n === null) return null;
  return Math.round(n);
}

function jsonb(v, fallback = '{}') {
  const s = nullIfEmpty(v);
  if (!s) return fallback;
  if (s === '[]') return '[]';
  try {
    JSON.parse(s);
    return s;
  } catch {
    return fallback;
  }
}

function parseCsvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const rows = parse(raw, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  });
  return rows;
}

function findLatestCsv(dir, table) {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(`${table}-export-`) && f.endsWith('.csv'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files.length ? path.join(dir, files[0].f) : null;
}

function resolveDatabaseUrl(target) {
  const explicit =
    process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PGURL || process.env.PG_CONNECTION_STRING;
  if (explicit) return explicit.trim();
  if (target === 'docker') {
    const port = process.env.HOST_PG_PORT || '5432';
    const pw = process.env.LOCAL_POSTGRES_PASSWORD || 'postgres';
    return `postgresql://postgres:${encodeURIComponent(pw)}@127.0.0.1:${port}/sig_gestao_ti`;
  }
  throw new Error(
    'Define DATABASE_URL (ou POSTGRES_URL) ou corre com TARGET=docker e Postgres local na porta HOST_PG_PORT (default 5432). Ex.:\n' +
      '  DATABASE_URL="postgresql://postgres:senha@127.0.0.1:5432/sig_gestao_ti" CSV_DIR="..." npm run db:import-csv'
  );
}

function maskUrl(u) {
  try {
    const x = new URL(u);
    if (x.password) x.password = '***';
    return x.toString();
  } catch {
    return u.replace(/:([^:@/]+)@/, ':***@');
  }
}

async function detectAuthMode(client) {
  const override = (process.env.AUTH_MODE || 'auto').toLowerCase();
  if (override === 'full' || override === 'docker' || override === 'none') return override;
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'auth' AND table_name = 'identities'
    ) AS identities,
    EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'auth' AND table_name = 'users'
    ) AS users
  `);
  if (rows[0].identities) return 'full';
  if (rows[0].users) return 'docker';
  return 'none';
}

async function truncatePublic(client) {
  await client.query(`
    DO $$
    DECLARE q text;
    BEGIN
      SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' CASCADE'
        INTO q
      FROM pg_tables WHERE schemaname = 'public';
      IF q IS NOT NULL THEN EXECUTE q; END IF;
    END $$;
  `);
}

async function wipeAuth(client) {
  await client.query('DELETE FROM auth.identities');
  await client.query('DELETE FROM auth.users');
}

async function ensureAuthUser(client, userId, email) {
  const em = (email && String(email).trim()) || `user+${userId.slice(0, 8)}@imported.local`;
  await client.query(
    `INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at,
      confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at,
      email_change_token_new, email_change, email_change_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
      phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
      email_change_token_current, email_change_confirm_status, banned_until,
      reauthentication_token, reauthentication_sent_at, is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', $1::uuid, 'authenticated', 'authenticated', $2,
      crypt($3, gen_salt('bf')), now(), NULL, '', now(), '', NULL, '', '', NULL, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, now(), now(),
      NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false
    )`,
    [userId, em, IMPORTED_PASSWORD]
  );
  await client.query(
    `INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
     VALUES (gen_random_uuid(), $1::uuid, jsonb_build_object('sub', $1::text, 'email', $2, 'email_verified', true, 'phone_verified', false),
             'email', $2, now(), now(), now())`,
    [userId, em]
  );
}

async function collectAuthUsersFromCsv(dir) {
  const out = new Map();
  for (const t of ['profiles', 'user_roles']) {
    const fp = findLatestCsv(dir, t);
    if (!fp) continue;
    const rows = parseCsvFile(fp);
    for (const r of rows) {
      if (r.user_id) out.set(r.user_id, r.email || out.get(r.user_id));
    }
  }
  return out;
}

const INSERTS = {
  organizations: {
    sql: `INSERT INTO public.organizations (id, nome, cnpj, plano, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)`,
    map: (r) => [
      r.id,
      nullIfEmpty(r.nome) || 'Organização',
      nullIfEmpty(r.cnpj),
      nullIfEmpty(r.plano) || 'local',
      r.created_at,
      r.updated_at,
    ],
  },
  empresas: {
    sql: `INSERT INTO public.empresas (id, org_id, nome, cnpj, segmento, responsavel, ativo, observacoes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.nome) || 'Empresa',
      nullIfEmpty(r.cnpj),
      nullIfEmpty(r.segmento),
      nullIfEmpty(r.responsavel),
      bool(r.ativo) !== false,
      nullIfEmpty(r.observacoes),
      r.created_at,
      r.updated_at,
    ],
  },
  departamentos: {
    sql: `INSERT INTO public.departamentos (id, org_id, nome, centro_custo, responsavel, empresa_id, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.nome) || 'Departamento',
      nullIfEmpty(r.centro_custo),
      nullIfEmpty(r.responsavel),
      nullIfEmpty(r.empresa_id),
      r.created_at,
      r.updated_at,
    ],
  },
  usuarios: {
    sql: `INSERT INTO public.usuarios (id, org_id, departamento_id, nome, email, cargo, ativo, empresa_id, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.departamento_id),
      nullIfEmpty(r.nome) || 'Utilizador',
      nullIfEmpty(r.email),
      nullIfEmpty(r.cargo),
      bool(r.ativo) !== false,
      nullIfEmpty(r.empresa_id),
      r.created_at,
      r.updated_at,
    ],
  },
  profiles: {
    sql: `INSERT INTO public.profiles (id, user_id, org_id, email, nome, avatar_url, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    map: (r) => [
      r.id,
      r.user_id,
      r.org_id,
      nullIfEmpty(r.email) || 'sem-email@local',
      nullIfEmpty(r.nome) || 'Nome',
      nullIfEmpty(r.avatar_url),
      r.created_at,
      r.updated_at,
    ],
  },
  user_roles: {
    sql: `INSERT INTO public.user_roles (id, user_id, org_id, role, created_at) VALUES ($1,$2,$3,$4::public.app_role,$5)`,
    map: (r) => [r.id, r.user_id, r.org_id, (nullIfEmpty(r.role) || 'usuario').toLowerCase(), r.created_at],
  },
  ativos: {
    sql: `INSERT INTO public.ativos (
      id, org_id, empresa_id, tipo, status, marca, modelo, numero_serie, patrimonio, data_aquisicao, valor_aquisicao,
      vida_util_meses, warranty_end, departamento_id, department_nome, responsavel_id, assigned_to, specs, maintenance_log,
      observacoes, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5::public.ativo_status,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb,$20,$21,$22
    )`,
    map: (r) => {
      const st = (nullIfEmpty(r.status) || 'ativo').toLowerCase();
      return [
        r.id,
        r.org_id,
        nullIfEmpty(r.empresa_id),
        nullIfEmpty(r.tipo) || 'Outro',
        ['ativo', 'estoque', 'manutencao', 'descartado'].includes(st) ? st : 'ativo',
        nullIfEmpty(r.marca),
        nullIfEmpty(r.modelo),
        nullIfEmpty(r.numero_serie),
        nullIfEmpty(r.patrimonio),
        nullIfEmpty(r.data_aquisicao),
        num(r.valor_aquisicao),
        intg(r.vida_util_meses),
        nullIfEmpty(r.warranty_end),
        nullIfEmpty(r.departamento_id),
        nullIfEmpty(r.department_nome),
        nullIfEmpty(r.responsavel_id),
        nullIfEmpty(r.assigned_to),
        jsonb(r.specs, '{}'),
        jsonb(r.maintenance_log, '[]'),
        nullIfEmpty(r.observacoes),
        r.created_at,
        r.updated_at,
      ];
    },
  },
  dominios: {
    sql: `INSERT INTO public.dominios (
      id, org_id, empresa_id, nome, registrar, data_vencimento, custo_anual, custo_renovacao, auto_renovacao,
      dns_provider, hosting_provider, ssl_vencimento, status, observacoes, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      nullIfEmpty(r.nome) || 'dominio',
      nullIfEmpty(r.registrar),
      nullIfEmpty(r.data_vencimento),
      num(r.custo_anual) ?? 0,
      num(r.custo_renovacao) ?? 0,
      bool(r.auto_renovacao) === true,
      nullIfEmpty(r.dns_provider),
      nullIfEmpty(r.hosting_provider),
      nullIfEmpty(r.ssl_vencimento),
      nullIfEmpty(r.status) || 'Ativo',
      nullIfEmpty(r.observacoes),
      r.created_at,
      r.updated_at,
    ],
  },
  dns_records: {
    sql: `INSERT INTO public.dns_records (id, org_id, empresa_id, dominio_id, tipo, nome, valor, ttl, prioridade, observacoes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      r.dominio_id,
      nullIfEmpty(r.tipo) || 'A',
      nullIfEmpty(r.nome) || '@',
      nullIfEmpty(r.valor) || '.',
      intg(r.ttl) ?? 3600,
      intg(r.prioridade),
      nullIfEmpty(r.observacoes),
      r.created_at,
      r.updated_at,
    ],
  },
  licencas: {
    sql: `INSERT INTO public.licencas (
      id, org_id, empresa_id, nome, categoria, tipo, total_licencas, qtd_usuarios, custo_unitario, custo_mensal,
      data_renovacao, fornecedor, chave_ativacao, observacoes, responsavel_id, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      nullIfEmpty(r.nome) || 'Licença',
      nullIfEmpty(r.categoria) || 'Outro',
      nullIfEmpty(r.tipo),
      intg(r.total_licencas) ?? 0,
      intg(r.qtd_usuarios),
      num(r.custo_unitario) ?? 0,
      num(r.custo_mensal),
      nullIfEmpty(r.data_renovacao),
      nullIfEmpty(r.fornecedor),
      nullIfEmpty(r.chave_ativacao),
      nullIfEmpty(r.observacoes),
      nullIfEmpty(r.responsavel_id),
      r.created_at,
      r.updated_at,
    ],
  },
  servidores: {
    sql: `INSERT INTO public.servidores (
      id, org_id, empresa_id, nome, provedor, tipo, regiao, ambiente, ip_publico, sistema_operacional, cpu, ram, armazenamento,
      status, uptime_pct, custo_mensal, finalidade, equipe_responsavel, contrato_fim, ultimo_backup, url_monitoramento,
      ssl_vencimento, observacoes, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      nullIfEmpty(r.nome) || 'servidor',
      nullIfEmpty(r.provedor),
      nullIfEmpty(r.tipo),
      nullIfEmpty(r.regiao),
      nullIfEmpty(r.ambiente),
      nullIfEmpty(r.ip_publico),
      nullIfEmpty(r.sistema_operacional),
      nullIfEmpty(r.cpu),
      nullIfEmpty(r.ram),
      nullIfEmpty(r.armazenamento),
      nullIfEmpty(r.status) || 'Online',
      num(r.uptime_pct),
      num(r.custo_mensal),
      nullIfEmpty(r.finalidade),
      nullIfEmpty(r.equipe_responsavel),
      nullIfEmpty(r.contrato_fim),
      nullIfEmpty(r.ultimo_backup),
      nullIfEmpty(r.url_monitoramento),
      nullIfEmpty(r.ssl_vencimento),
      nullIfEmpty(r.observacoes),
      r.created_at,
      r.updated_at,
    ],
  },
  contratos: {
    sql: `INSERT INTO public.contratos (id, org_id, empresa_id, supplier, object, type, status, monthly_cost, cost_center, end_date, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      nullIfEmpty(r.supplier) || '—',
      nullIfEmpty(r.object) || '—',
      nullIfEmpty(r.type) || '—',
      nullIfEmpty(r.status) || 'Ativo',
      num(r.monthly_cost) ?? 0,
      nullIfEmpty(r.cost_center),
      nullIfEmpty(r.end_date),
      r.created_at,
      r.updated_at,
    ],
  },
  manutencoes: {
    sql: `INSERT INTO public.manutencoes (id, org_id, empresa_id, ativo_id, tipo, status, data_abertura, data_conclusao, custo, fornecedor, descricao, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      r.ativo_id,
      nullIfEmpty(r.tipo) || 'Corretiva',
      nullIfEmpty(r.status) || 'Aberta',
      r.data_abertura,
      nullIfEmpty(r.data_conclusao),
      num(r.custo),
      nullIfEmpty(r.fornecedor),
      nullIfEmpty(r.descricao),
      r.created_at,
      r.updated_at,
    ],
  },
  movimentacoes: {
    sql: `INSERT INTO public.movimentacoes (
      id, org_id, empresa_id, ativo_id, ativo_label, tipo, data, from_department, to_department, from_user, to_user,
      responsible, recipient, reason, notes, value, term_generated, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      r.ativo_id,
      nullIfEmpty(r.ativo_label),
      nullIfEmpty(r.tipo) || 'Movimento',
      r.data,
      nullIfEmpty(r.from_department),
      nullIfEmpty(r.to_department),
      nullIfEmpty(r.from_user),
      nullIfEmpty(r.to_user),
      nullIfEmpty(r.responsible),
      nullIfEmpty(r.recipient),
      nullIfEmpty(r.reason),
      nullIfEmpty(r.notes),
      num(r.value),
      bool(r.term_generated),
      r.created_at,
      r.updated_at,
    ],
  },
  inventario: {
    sql: `INSERT INTO public.inventario (id, org_id, empresa_id, nome, categoria, quantity, min_quantity, unit, unit_cost, location, supplier, sku, notes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      nullIfEmpty(r.nome) || 'Item',
      nullIfEmpty(r.categoria) || '—',
      intg(r.quantity) ?? 0,
      intg(r.min_quantity) ?? 0,
      nullIfEmpty(r.unit) || 'un',
      num(r.unit_cost) ?? 0,
      nullIfEmpty(r.location),
      nullIfEmpty(r.supplier),
      nullIfEmpty(r.sku),
      nullIfEmpty(r.notes),
      r.created_at,
      r.updated_at,
    ],
  },
  inventario_movimentacoes: {
    sql: `INSERT INTO public.inventario_movimentacoes (id, org_id, empresa_id, item_id, item_name, tipo, data, quantity, unit_cost, destination, reason, responsible, invoice, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      r.item_id,
      nullIfEmpty(r.item_name),
      nullIfEmpty(r.tipo) || 'Movimento',
      r.data,
      intg(r.quantity) ?? 0,
      num(r.unit_cost),
      nullIfEmpty(r.destination),
      nullIfEmpty(r.reason),
      nullIfEmpty(r.responsible),
      nullIfEmpty(r.invoice),
      r.created_at,
    ],
  },
  alertas: {
    sql: `INSERT INTO public.alertas (id, org_id, empresa_id, titulo, tipo, severidade, mensagem, lida, link, created_at)
          VALUES ($1,$2,$3,$4,$5,$6::public.alerta_severidade,$7,$8,$9,$10)`,
    map: (r) => {
      let sev = (nullIfEmpty(r.severidade) || 'info').toLowerCase();
      if (!['info', 'aviso', 'critico'].includes(sev)) sev = 'info';
      return [
        r.id,
        r.org_id,
        nullIfEmpty(r.empresa_id),
        nullIfEmpty(r.titulo) || 'Alerta',
        nullIfEmpty(r.tipo) || 'geral',
        sev,
        nullIfEmpty(r.mensagem),
        bool(r.lida) === true,
        nullIfEmpty(r.link),
        r.created_at,
      ];
    },
  },
  orcamentos: {
    sql: `INSERT INTO public.orcamentos (id, org_id, empresa_id, year, category, cost_center, annual_budget, notes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      intg(r.year) ?? new Date().getFullYear(),
      nullIfEmpty(r.category) || 'Geral',
      nullIfEmpty(r.cost_center) || '—',
      num(r.annual_budget) ?? 0,
      nullIfEmpty(r.notes),
      r.created_at,
      r.updated_at,
    ],
  },
  acoes_economista: {
    sql: `INSERT INTO public.acoes_economista (id, org_id, empresa_id, title, description, category, priority, effort, status, owner, due_date, estimated_savings, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      nullIfEmpty(r.title) || 'Ação',
      nullIfEmpty(r.description),
      nullIfEmpty(r.category) || 'Geral',
      nullIfEmpty(r.priority) || 'Média',
      nullIfEmpty(r.effort) || 'M',
      nullIfEmpty(r.status) || 'Aberto',
      nullIfEmpty(r.owner),
      nullIfEmpty(r.due_date),
      num(r.estimated_savings) ?? 0,
      r.created_at,
      r.updated_at,
    ],
  },
  registros_acesso: {
    sql: `INSERT INTO public.registros_acesso (id, org_id, empresa_id, usuario_id, user_label, sistema, recurso, recurso_tipo, nivel_acesso, data_concessao, ultimo_acesso, data_revogacao, ativo, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      nullIfEmpty(r.usuario_id),
      nullIfEmpty(r.user_label),
      nullIfEmpty(r.sistema) || '—',
      nullIfEmpty(r.recurso),
      nullIfEmpty(r.recurso_tipo),
      nullIfEmpty(r.nivel_acesso),
      r.data_concessao,
      nullIfEmpty(r.ultimo_acesso),
      nullIfEmpty(r.data_revogacao),
      bool(r.ativo) !== false,
      r.created_at,
      r.updated_at,
    ],
  },
  riscos: {
    sql: `INSERT INTO public.riscos (id, org_id, empresa_id, title, severity, owner, mitigation, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      nullIfEmpty(r.title) || 'Risco',
      nullIfEmpty(r.severity) || 'Média',
      nullIfEmpty(r.owner),
      nullIfEmpty(r.mitigation),
      r.created_at,
      r.updated_at,
    ],
  },
  pagamentos: {
    sql: `INSERT INTO public.pagamentos (id, org_id, empresa_id, nome, categoria, competencia, valor, status, vencimento, data_pagamento, fornecedor, observacoes, referencia_id, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5::public.pagamento_categoria,$6,$7,$8::public.pagamento_status,$9,$10,$11,$12,$13,$14,$15)`,
    map: (r) => {
      const catRaw = (nullIfEmpty(r.categoria) || 'outro').toLowerCase();
      const cats = ['servidor', 'licenca', 'dominio', 'contrato', 'outro'];
      const cat = cats.includes(catRaw) ? catRaw : 'outro';
      let st = (nullIfEmpty(r.status) || 'pendente').toLowerCase();
      if (!['pendente', 'pago', 'atrasado'].includes(st)) st = 'pendente';
      return [
        r.id,
        r.org_id,
        nullIfEmpty(r.empresa_id),
        nullIfEmpty(r.nome) || 'Pagamento',
        cat,
        nullIfEmpty(r.competencia) || '1970-01',
        num(r.valor) ?? 0,
        st,
        nullIfEmpty(r.vencimento),
        nullIfEmpty(r.data_pagamento),
        nullIfEmpty(r.fornecedor),
        nullIfEmpty(r.observacoes),
        nullIfEmpty(r.referencia_id),
        r.created_at,
        r.updated_at,
      ];
    },
  },
  termos_responsabilidade: {
    sql: `INSERT INTO public.termos_responsabilidade (id, org_id, empresa_id, ativo_id, usuario_id, data_assinatura, data_devolucao, pdf_url, observacoes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    map: (r) => [
      r.id,
      r.org_id,
      nullIfEmpty(r.empresa_id),
      r.ativo_id,
      r.usuario_id,
      r.data_assinatura,
      nullIfEmpty(r.data_devolucao),
      nullIfEmpty(r.pdf_url),
      nullIfEmpty(r.observacoes),
      r.created_at,
      r.updated_at,
    ],
  },
};

const IMPORT_ORDER = [
  'organizations',
  'empresas',
  'departamentos',
  'usuarios',
  'profiles',
  'user_roles',
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
];

async function importTable(client, dir, table) {
  const def = INSERTS[table];
  if (!def) return 0;
  const fp = findLatestCsv(dir, table);
  if (!fp) return 0;
  const rows = parseCsvFile(fp);
  if (!rows.length) return 0;
  let n = 0;
  for (const r of rows) {
    const vals = def.map(r);
    try {
      await client.query(def.sql, vals);
      n++;
    } catch (e) {
      console.error(`Erro ${table} id=${r.id}:`, e.message);
      throw e;
    }
  }
  console.log(`  ${table}: ${n} linhas (${path.basename(fp)})`);
  return n;
}

async function main() {
  const csvDir = process.argv[2] || process.env.CSV_DIR || DEFAULT_CSV_DIR;
  const target = (process.env.TARGET || 'docker').toLowerCase();
  const dbUrlArg = process.argv.find((a) => a.startsWith('--database-url='));
  if (dbUrlArg) process.env.DATABASE_URL = dbUrlArg.split('=').slice(1).join('=');

  if (!fs.existsSync(csvDir)) {
    console.error('Pasta CSV em falta:', csvDir);
    console.error('Define CSV_DIR ou coloca ficheiros em database/import/csv/');
    process.exit(1);
  }
  const csvExports = fs
    .readdirSync(csvDir)
    .filter((f) => f.includes('-export-') && f.endsWith('.csv'));
  if (!csvExports.length) {
    console.error('Nenhum ficheiro *-export-*.csv nesta pasta:', csvDir);
    console.error(
      'Exporta as tabelas do teu Postgres (CSV com *-export-*.csv) ou coloca os ficheiros em database/import/csv/ e volta a correr.'
    );
    process.exit(1);
  }
  console.log('>> Encontrados', csvExports.length, 'ficheiros CSV de exportação.');
  const dbUrl = resolveDatabaseUrl(target);
  console.log('>> Base de dados:', maskUrl(dbUrl));
  console.log('>> CSV_DIR:', csvDir);

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('127.0.0.1') || dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  const authMode = await detectAuthMode(client);
  console.log('>> Auth:', authMode, '(AUTH_MODE=' + (process.env.AUTH_MODE || 'auto') + ')');
  if (authMode === 'none') {
    console.warn(
      '>> Aviso: sem tabelas auth.users nesta base. O import de profiles/user_roles pode falhar por FK. ' +
        'Usa um Postgres inicializado com database/init/01_schema.sql (e 03_api_auth.sql se precisares de login).'
    );
  }

  try {
    await client.query('BEGIN');
    console.log('>> A limpar schema public + preparar Auth...');
    await truncatePublic(client);
    if (authMode === 'full') {
      await wipeAuth(client);
      const users = await collectAuthUsersFromCsv(csvDir);
      for (const [uid, email] of users) {
        await ensureAuthUser(client, uid, email);
      }
      console.log(`>> Auth (identities + users): ${users.size} utilizadores (password: ${IMPORTED_PASSWORD})`);
    } else if (authMode === 'docker') {
      await client.query('TRUNCATE auth.users CASCADE');
      const users = await collectAuthUsersFromCsv(csvDir);
      for (const [uid, email] of users) {
        await client.query(
          'INSERT INTO auth.users (id, email, created_at) VALUES ($1::uuid, $2, now()) ON CONFLICT (id) DO NOTHING',
          [uid, (email && String(email).trim()) || `user+${uid.slice(0, 8)}@imported.local`]
        );
      }
      await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
      await client.query(
        `UPDATE auth.users SET encrypted_password = crypt($1::text, gen_salt('bf')) WHERE encrypted_password IS NULL`,
        [IMPORTED_PASSWORD]
      );
      console.log(
        `>> auth.users (Docker / minimal): ${users.size} linhas (login: palavra-passe ${IMPORTED_PASSWORD})`
      );
    } else {
      console.log('>> Auth: ignorado (AUTH_MODE=none ou base sem auth)');
    }

    for (const table of IMPORT_ORDER) {
      await importTable(client, csvDir, table);
    }
    await client.query('COMMIT');
    console.log('>> Importação concluída com sucesso.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
