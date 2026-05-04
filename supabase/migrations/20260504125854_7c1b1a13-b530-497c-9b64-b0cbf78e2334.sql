
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'usuario');
CREATE TYPE public.ativo_status AS ENUM ('ativo', 'manutencao', 'estoque', 'descartado');
CREATE TYPE public.alerta_severidade AS ENUM ('info', 'aviso', 'critico');

-- =========================================================
-- ORGANIZATIONS
-- =========================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  plano TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER_ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'usuario',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND org_id = _org_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- AUTO-CREATE PROFILE + ORG ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  user_org TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1));
  user_org := COALESCE(NEW.raw_user_meta_data ->> 'organizacao', user_name || ' Org');

  INSERT INTO public.organizations (nome) VALUES (user_org) RETURNING id INTO new_org_id;
  INSERT INTO public.profiles (user_id, org_id, nome, email) VALUES (NEW.id, new_org_id, user_name, NEW.email);
  INSERT INTO public.user_roles (user_id, org_id, role) VALUES (NEW.id, new_org_id, 'admin');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- RLS: identity tables
-- =========================================================
CREATE POLICY "members view org" ON public.organizations FOR SELECT TO authenticated
  USING (id = public.current_org_id());
CREATE POLICY "admin updates org" ON public.organizations FOR UPDATE TO authenticated
  USING (id = public.current_org_id() AND public.has_role(auth.uid(), id, 'admin'));

CREATE POLICY "view profiles in org" ON public.profiles FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "view roles in org" ON public.user_roles FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY "admin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (org_id = public.current_org_id() AND public.has_role(auth.uid(), org_id, 'admin'))
  WITH CHECK (org_id = public.current_org_id() AND public.has_role(auth.uid(), org_id, 'admin'));

-- =========================================================
-- DOMAIN TABLES
-- =========================================================
CREATE TABLE public.departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  centro_custo TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  cargo TEXT,
  departamento_id UUID REFERENCES public.departamentos(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  patrimonio TEXT,
  valor_aquisicao NUMERIC(12,2) DEFAULT 0,
  data_aquisicao DATE,
  vida_util_meses INT DEFAULT 60,
  status public.ativo_status NOT NULL DEFAULT 'ativo',
  responsavel_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  departamento_id UUID REFERENCES public.departamentos(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT,
  custo NUMERIC(12,2) DEFAULT 0,
  fornecedor TEXT,
  data_abertura DATE NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao DATE,
  status TEXT NOT NULL DEFAULT 'aberta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.termos_responsabilidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  data_assinatura DATE NOT NULL DEFAULT CURRENT_DATE,
  data_devolucao DATE,
  pdf_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.dominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  registrar TEXT,
  data_vencimento DATE,
  ssl_vencimento DATE,
  custo_anual NUMERIC(12,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.licencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  fornecedor TEXT,
  tipo TEXT,
  custo_mensal NUMERIC(12,2) DEFAULT 0,
  qtd_usuarios INT DEFAULT 1,
  data_renovacao DATE,
  responsavel_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.servidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  provedor TEXT,
  ip_publico TEXT,
  ambiente TEXT DEFAULT 'producao',
  uptime_pct NUMERIC(5,2) DEFAULT 100,
  custo_mensal NUMERIC(12,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.registros_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  sistema TEXT NOT NULL,
  nivel_acesso TEXT,
  data_concessao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_revogacao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  severidade public.alerta_severidade NOT NULL DEFAULT 'info',
  lida BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- ENABLE RLS + UNIFORM POLICIES + UPDATED_AT TRIGGERS
-- =========================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'departamentos','usuarios','ativos','manutencoes','termos_responsabilidade',
    'dominios','licencas','servidores','registros_acesso','alertas'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($f$CREATE POLICY "org members read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (org_id = public.current_org_id());$f$, t);
    EXECUTE format($f$CREATE POLICY "org members insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id());$f$, t);
    EXECUTE format($f$CREATE POLICY "org members update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());$f$, t);
    EXECUTE format($f$CREATE POLICY "org members delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (org_id = public.current_org_id());$f$, t);
    IF t <> 'alertas' THEN
      EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
    END IF;
  END LOOP;
END $$;

CREATE TRIGGER set_updated_at_orgs BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_ativos_org ON public.ativos(org_id);
CREATE INDEX idx_manutencoes_ativo ON public.manutencoes(ativo_id);
CREATE INDEX idx_usuarios_org ON public.usuarios(org_id);
CREATE INDEX idx_alertas_org_lida ON public.alertas(org_id, lida);
