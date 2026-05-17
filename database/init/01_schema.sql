-- SIG Heartbeat Hub — schema local (PostgreSQL 16)
-- Derivado de frontend/src/app/services/database.types.ts + tabela empresas / empresa_id.
-- Auth mínima: schema auth.users para FKs de profiles / user_roles.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  encrypted_password text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.alerta_severidade AS ENUM ('info', 'aviso', 'critico');
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'usuario');
CREATE TYPE public.ativo_status AS ENUM ('ativo', 'manutencao', 'estoque', 'descartado');
CREATE TYPE public.pagamento_categoria AS ENUM ('servidor', 'licenca', 'dominio', 'contrato', 'outro');
CREATE TYPE public.pagamento_status AS ENUM ('pendente', 'pago', 'atrasado');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Stubs usados por policies no Supabase; em Postgres puro podem ser estendidos depois.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULL::uuid;
$$;

-- ---------------------------------------------------------------------------
-- Core
-- ---------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  plano text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  nome text NOT NULL,
  cnpj text,
  segmento text,
  responsavel text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  nome text NOT NULL,
  centro_custo text,
  responsavel text,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_departamentos_updated_at
  BEFORE UPDATE ON public.departamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  departamento_id uuid REFERENCES public.departamentos (id) ON DELETE SET NULL,
  nome text NOT NULL,
  email text,
  cargo text,
  ativo boolean NOT NULL DEFAULT true,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'usuario',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND ur.org_id = _org_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Domínio
-- ---------------------------------------------------------------------------
CREATE TABLE public.ativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  tipo text NOT NULL,
  status public.ativo_status NOT NULL DEFAULT 'ativo',
  marca text,
  modelo text,
  numero_serie text,
  patrimonio text,
  data_aquisicao date,
  valor_aquisicao numeric,
  vida_util_meses integer,
  warranty_end date,
  departamento_id uuid REFERENCES public.departamentos (id) ON DELETE SET NULL,
  department_nome text,
  responsavel_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  assigned_to text,
  specs jsonb,
  maintenance_log jsonb,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ativos_updated_at
  BEFORE UPDATE ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dominios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  nome text NOT NULL,
  registrar text,
  data_vencimento date,
  custo_anual numeric,
  custo_renovacao numeric,
  auto_renovacao boolean NOT NULL DEFAULT false,
  dns_provider text,
  hosting_provider text,
  ssl_vencimento date,
  status text NOT NULL DEFAULT 'Ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_dominios_updated_at
  BEFORE UPDATE ON public.dominios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dns_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  dominio_id uuid NOT NULL REFERENCES public.dominios (id) ON DELETE CASCADE,
  tipo text NOT NULL,
  nome text NOT NULL,
  valor text NOT NULL,
  ttl integer NOT NULL DEFAULT 3600,
  prioridade integer,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_dns_records_updated_at
  BEFORE UPDATE ON public.dns_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.licencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  nome text NOT NULL,
  categoria text NOT NULL,
  tipo text,
  total_licencas integer NOT NULL DEFAULT 0,
  qtd_usuarios integer,
  custo_unitario numeric NOT NULL DEFAULT 0,
  custo_mensal numeric,
  data_renovacao date,
  fornecedor text,
  chave_ativacao text,
  observacoes text,
  responsavel_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_licencas_updated_at
  BEFORE UPDATE ON public.licencas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.servidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  nome text NOT NULL,
  provedor text,
  tipo text,
  regiao text,
  ambiente text,
  ip_publico text,
  sistema_operacional text,
  cpu text,
  ram text,
  armazenamento text,
  status text NOT NULL DEFAULT 'Online',
  uptime_pct numeric,
  custo_mensal numeric,
  finalidade text,
  equipe_responsavel text,
  contrato_fim date,
  ultimo_backup date,
  url_monitoramento text,
  ssl_vencimento date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_servidores_updated_at
  BEFORE UPDATE ON public.servidores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  supplier text NOT NULL,
  object text NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  monthly_cost numeric NOT NULL DEFAULT 0,
  cost_center text,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  ativo_id uuid NOT NULL REFERENCES public.ativos (id) ON DELETE CASCADE,
  tipo text NOT NULL,
  status text NOT NULL,
  data_abertura date NOT NULL,
  data_conclusao date,
  custo numeric,
  fornecedor text,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_manutencoes_updated_at
  BEFORE UPDATE ON public.manutencoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  ativo_id uuid NOT NULL REFERENCES public.ativos (id) ON DELETE CASCADE,
  ativo_label text,
  tipo text NOT NULL,
  data date NOT NULL,
  from_department text,
  to_department text,
  from_user text,
  to_user text,
  responsible text,
  recipient text,
  reason text,
  notes text,
  value numeric,
  term_generated boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_movimentacoes_updated_at
  BEFORE UPDATE ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  nome text NOT NULL,
  categoria text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'un',
  unit_cost numeric NOT NULL DEFAULT 0,
  location text,
  supplier text,
  sku text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_inventario_updated_at
  BEFORE UPDATE ON public.inventario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventario_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES public.inventario (id) ON DELETE CASCADE,
  item_name text,
  tipo text NOT NULL,
  data date NOT NULL,
  quantity integer NOT NULL,
  unit_cost numeric,
  destination text,
  reason text,
  responsible text,
  invoice text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  titulo text NOT NULL,
  tipo text NOT NULL,
  severidade public.alerta_severidade NOT NULL DEFAULT 'info',
  mensagem text,
  lida boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  year integer NOT NULL,
  category text NOT NULL,
  cost_center text NOT NULL,
  annual_budget numeric NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_orcamentos_updated_at
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.acoes_economista (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  priority text NOT NULL,
  effort text NOT NULL,
  status text NOT NULL,
  owner text,
  due_date date,
  estimated_savings numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_acoes_economista_updated_at
  BEFORE UPDATE ON public.acoes_economista
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.registros_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  user_label text,
  sistema text NOT NULL,
  recurso text,
  recurso_tipo text,
  nivel_acesso text,
  data_concessao date NOT NULL,
  ultimo_acesso date,
  data_revogacao date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_registros_acesso_updated_at
  BEFORE UPDATE ON public.registros_acesso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.riscos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  title text NOT NULL,
  severity text NOT NULL,
  owner text,
  mitigation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_riscos_updated_at
  BEFORE UPDATE ON public.riscos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  nome text NOT NULL,
  categoria public.pagamento_categoria NOT NULL,
  competencia text NOT NULL,
  valor numeric NOT NULL,
  status public.pagamento_status NOT NULL DEFAULT 'pendente',
  vencimento date,
  data_pagamento date,
  fornecedor text,
  observacoes text,
  referencia_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_pagamentos_updated_at
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.termos_responsabilidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  ativo_id uuid NOT NULL REFERENCES public.ativos (id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  data_assinatura date NOT NULL,
  data_devolucao date,
  pdf_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_termos_responsabilidade_updated_at
  BEFORE UPDATE ON public.termos_responsabilidade
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Índices (filtros por org / empresa)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_ativos_org ON public.ativos (org_id);
CREATE INDEX idx_ativos_empresa ON public.ativos (empresa_id);
CREATE INDEX idx_dominios_org ON public.dominios (org_id);
CREATE INDEX idx_dominios_empresa ON public.dominios (empresa_id);
CREATE INDEX idx_licencas_org ON public.licencas (org_id);
CREATE INDEX idx_licencas_empresa ON public.licencas (empresa_id);
CREATE INDEX idx_servidores_org ON public.servidores (org_id);
CREATE INDEX idx_servidores_empresa ON public.servidores (empresa_id);
CREATE INDEX idx_pagamentos_org ON public.pagamentos (org_id);
CREATE INDEX idx_pagamentos_empresa ON public.pagamentos (empresa_id);
CREATE INDEX idx_manutencoes_org ON public.manutencoes (org_id);
CREATE INDEX idx_manutencoes_empresa ON public.manutencoes (empresa_id);
CREATE INDEX idx_empresas_org ON public.empresas (org_id);
