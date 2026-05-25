--
-- PostgreSQL database dump
--

\restrict 4gDBpUFfX7hcnChdKJ9kuhOIBCFXGPvcW6KDZGRCUGD8crQdAkb0vXwTo6bJxOR

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: alerta_severidade; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alerta_severidade AS ENUM (
    'info',
    'aviso',
    'critico'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'gestor',
    'usuario'
);


--
-- Name: ativo_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ativo_status AS ENUM (
    'ativo',
    'manutencao',
    'estoque',
    'descartado'
);


--
-- Name: pagamento_categoria; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pagamento_categoria AS ENUM (
    'servidor',
    'licenca',
    'dominio',
    'contrato',
    'outro'
);


--
-- Name: pagamento_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pagamento_status AS ENUM (
    'pendente',
    'pago',
    'atrasado'
);


--
-- Name: current_org_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_org_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT NULL::uuid;
$$;


--
-- Name: has_role(uuid, public.app_role, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role, _org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND ur.org_id = _org_id
  );
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    id uuid NOT NULL,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    encrypted_password text
);


--
-- Name: acoes_economista; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acoes_economista (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    priority text NOT NULL,
    effort text NOT NULL,
    status text NOT NULL,
    owner text,
    due_date date,
    estimated_savings numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alertas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alertas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    titulo text NOT NULL,
    tipo text NOT NULL,
    severidade public.alerta_severidade DEFAULT 'info'::public.alerta_severidade NOT NULL,
    mensagem text,
    lida boolean DEFAULT false NOT NULL,
    link text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ativos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ativos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    tipo text NOT NULL,
    status public.ativo_status DEFAULT 'ativo'::public.ativo_status NOT NULL,
    marca text,
    modelo text,
    numero_serie text,
    patrimonio text,
    data_aquisicao date,
    valor_aquisicao numeric,
    vida_util_meses integer,
    warranty_end date,
    departamento_id uuid,
    department_nome text,
    responsavel_id uuid,
    assigned_to text,
    specs jsonb,
    maintenance_log jsonb,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contratos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contratos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    supplier text NOT NULL,
    object text NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    monthly_cost numeric DEFAULT 0 NOT NULL,
    cost_center text,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: departamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    nome text NOT NULL,
    centro_custo text,
    responsavel text,
    empresa_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dns_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dns_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    dominio_id uuid NOT NULL,
    tipo text NOT NULL,
    nome text NOT NULL,
    valor text NOT NULL,
    ttl integer DEFAULT 3600 NOT NULL,
    prioridade integer,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dominios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dominios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    nome text NOT NULL,
    registrar text,
    data_vencimento date,
    custo_anual numeric,
    custo_renovacao numeric,
    auto_renovacao boolean DEFAULT false NOT NULL,
    dns_provider text,
    hosting_provider text,
    ssl_vencimento date,
    status text DEFAULT 'Ativo'::text NOT NULL,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    nome text NOT NULL,
    cnpj text,
    segmento text,
    responsavel text,
    ativo boolean DEFAULT true NOT NULL,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    nome text NOT NULL,
    categoria text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    min_quantity integer DEFAULT 0 NOT NULL,
    unit text DEFAULT 'un'::text NOT NULL,
    unit_cost numeric DEFAULT 0 NOT NULL,
    location text,
    supplier text,
    sku text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventario_movimentacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_movimentacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    item_id uuid NOT NULL,
    item_name text,
    tipo text NOT NULL,
    data date NOT NULL,
    quantity integer NOT NULL,
    unit_cost numeric,
    destination text,
    reason text,
    responsible text,
    invoice text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: licencas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licencas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    nome text NOT NULL,
    categoria text NOT NULL,
    tipo text,
    total_licencas integer DEFAULT 0 NOT NULL,
    qtd_usuarios integer,
    custo_unitario numeric DEFAULT 0 NOT NULL,
    custo_mensal numeric,
    data_renovacao date,
    fornecedor text,
    chave_ativacao text,
    observacoes text,
    responsavel_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: manutencoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manutencoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    ativo_id uuid NOT NULL,
    tipo text NOT NULL,
    status text NOT NULL,
    data_abertura date NOT NULL,
    data_conclusao date,
    custo numeric,
    fornecedor text,
    descricao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: movimentacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimentacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    ativo_id uuid NOT NULL,
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orcamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orcamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    year integer NOT NULL,
    category text NOT NULL,
    cost_center text NOT NULL,
    annual_budget numeric NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    cnpj text,
    plano text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pagamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    nome text NOT NULL,
    categoria public.pagamento_categoria NOT NULL,
    competencia text NOT NULL,
    valor numeric NOT NULL,
    status public.pagamento_status DEFAULT 'pendente'::public.pagamento_status NOT NULL,
    vencimento date,
    data_pagamento date,
    fornecedor text,
    observacoes text,
    referencia_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    org_id uuid NOT NULL,
    email text NOT NULL,
    nome text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: registros_acesso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registros_acesso (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    usuario_id uuid,
    user_label text,
    sistema text NOT NULL,
    recurso text,
    recurso_tipo text,
    nivel_acesso text,
    data_concessao date NOT NULL,
    ultimo_acesso date,
    data_revogacao date,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: riscos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.riscos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    title text NOT NULL,
    severity text NOT NULL,
    owner text,
    mitigation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: servidores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servidores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
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
    status text DEFAULT 'Online'::text NOT NULL,
    uptime_pct numeric,
    custo_mensal numeric,
    finalidade text,
    equipe_responsavel text,
    contrato_fim date,
    ultimo_backup date,
    url_monitoramento text,
    ssl_vencimento date,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: termos_responsabilidade; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.termos_responsabilidade (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    empresa_id uuid,
    ativo_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    data_assinatura date NOT NULL,
    data_devolucao date,
    pdf_url text,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    org_id uuid NOT NULL,
    role public.app_role DEFAULT 'usuario'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    departamento_id uuid,
    nome text NOT NULL,
    email text,
    cargo text,
    ativo boolean DEFAULT true NOT NULL,
    empresa_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (id, email, created_at, encrypted_password) FROM stdin;
2006d9f9-72ef-48ad-8769-72ba07d459d1	felipe.miranda@imts.com.br	2026-05-17 20:41:33.942558+00	$2a$06$yMnPK/dwDFY3z4yV5a57yuEO39PBtJXKl.N4xt6mJKaerDWSnzrY.
abf82c2e-d0a0-40d9-9067-264ad3fa904a	adm@adm.com	2026-05-17 21:03:06.208123+00	$2a$06$Yr2wuxTdHkxp4uuyUggtG.wh83WLT.Z.huP3B7YzF12SY8g8zqVq6
11111111-1111-1111-1111-111111111111	dev@local.imts	2026-05-17 22:13:02.516082+00	$2a$06$2uwDrmDqQ3sEJdPrxMHkzO1E9QEknYabKgkIFioH61SENwaSHMeAG
\.


--
-- Data for Name: acoes_economista; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.acoes_economista (id, org_id, empresa_id, title, description, category, priority, effort, status, owner, due_date, estimated_savings, created_at, updated_at) FROM stdin;
5dcf43df-4407-4dd6-925e-7f8259e0fa63	700654e3-a545-43c7-be27-dc34d810c935	\N	Manter licenças Office 365 o suficiente para o Grupo.	Manter licenças Office 365 o suficiente para o Grupo.\n\nTemos padrão B. Basic e B. Standard.	Licenças	Média	Médio	Em andamento	Felipe Miranda	2026-05-30	1000	2026-05-08 13:27:39.997654+00	2026-05-08 13:27:39.997654+00
20202020-2020-2020-2020-202020202020	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	Direitosizing reserved instances	Rever instâncias m5 reservadas na região SP	FinOps	Alta	M	Aberto	Economista TI	2026-03-31	42000	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: alertas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alertas (id, org_id, empresa_id, titulo, tipo, severidade, mensagem, lida, link, created_at) FROM stdin;
134035e4-37f4-4331-9c0d-995dafeaddb0	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: kazzaz.com.br	dominio	critico	Vencido em 2025-06-24T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
5909fe5a-03f5-40ca-a051-7b467ba1a8d9	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: p9x.com.br	dominio	critico	Vencido em 2025-07-06T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
4d6b2ffb-8611-4e65-90f8-439adb92515f	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: pmgt-ceara.com.br	dominio	critico	Vencido em 2025-08-19T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
0bd53c31-c7d0-48ab-8090-a4ea97e2bbf3	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: pmgt-maranhao.com.br	dominio	critico	Vencido em 2025-08-19T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
8d3ae519-e90d-47a6-b42c-8183dee1bae6	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: smarttsutilities.com.br	dominio	critico	Vencido em 2025-07-16T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
bd993266-a97d-44a8-9c26-f50357e35f1f	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: hyperconvergence.com.br	dominio	critico	Vencido em 2026-05-17T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
24837055-e7f1-488e-af45-da9f76f5115d	700654e3-a545-43c7-be27-dc34d810c935	\N	Licença renova em 1d: Microsoft 365 Business Basic	licenca	critico	Renovação em 2026-05-18T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
1f2a966a-3603-4a5d-bf6e-c7da1532dbf9	700654e3-a545-43c7-be27-dc34d810c935	\N	Contrato Servidor VPS - Servidor VPS - SSD NVMe 5 vence em 25d	servidor	aviso	Contrato em 2026-06-11T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
7f56b6cf-4ea2-4d4b-9b92-1f9ded77c847	700654e3-a545-43c7-be27-dc34d810c935	\N	Contrato Servidor VPS - Servidor VPS - SSD NVMe 5 vence em 25d	servidor	aviso	Contrato em 2026-06-11T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
de2158de-cbc4-41e4-aea9-cc54fd87c981	700654e3-a545-43c7-be27-dc34d810c935	\N	Contrato Servidor VPS - Servidor VPS - SSD NVMe 5 vence em 25d	servidor	aviso	Contrato em 2026-06-11T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
773edeae-7aaf-4edc-929e-593e0eb015f1	db815a55-70a8-421e-ba4a-6efade18fc2a	\N	Domínio expira em 21 dias	dominio	aviso	auttis.com.br vence em 2026-06-11T03:00:00.000Z	t	\N	2026-05-21 17:57:25.824409+00
13b39de9-e49f-4a18-9e56-da01e53f9b6d	db815a55-70a8-421e-ba4a-6efade18fc2a	\N	Domínio expira em 22 dias	dominio	aviso	hitmia.com.br vence em 2026-06-12T03:00:00.000Z	t	\N	2026-05-21 17:57:25.824409+00
7ae372b1-a65c-497b-9b52-13fdd34d510b	db815a55-70a8-421e-ba4a-6efade18fc2a	\N	Contrato vence em 28 dias	servidor	aviso	Servidor VPS - Servidor VPS - SSD NVMe 5 vence em 2026-06-18T03:00:00.000Z	t	\N	2026-05-21 17:57:25.824409+00
c913efa1-5c0d-443d-9d5c-edb21fd5ba84	db815a55-70a8-421e-ba4a-6efade18fc2a	\N	Contrato vence em 29 dias	servidor	aviso	Servidor VPS - Servidor VPS - SSD NVMe 16 vence em 2026-06-19T03:00:00.000Z	t	\N	2026-05-21 17:57:25.824409+00
849527c6-19ec-4be3-ab38-db0d0078b602	db815a55-70a8-421e-ba4a-6efade18fc2a	\N	Contrato vence em 21 dias	servidor	aviso	Servidor VPS - Servidor VPS - SSD NVMe 5 vence em 2026-06-11T03:00:00.000Z	t	\N	2026-05-21 17:57:25.824409+00
5f95943a-c6f7-426d-8a8d-6547105411a4	db815a55-70a8-421e-ba4a-6efade18fc2a	\N	Contrato vence em 28 dias	servidor	aviso	Servidor VPS - Servidor VPS - SSD NVMe 16 vence em 2026-06-18T03:00:00.000Z	t	\N	2026-05-21 17:57:25.824409+00
f0000000-0000-0000-0000-000000000001	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	Incidente crítico simulado	infra	critico	Teste de alerta crítico (dados demo)	t	/alertas	2026-05-17 22:13:02.516082+00
a1bb5a9e-05bb-4ee9-8276-7de1f7876089	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: performance9x.com.br	dominio	critico	Vencido em 2026-01-31T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
49e1a6b1-8661-48c6-9d4a-4ab090c2a5c2	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio vence em 25d: auttis.com.br	dominio	aviso	Vence em 2026-06-11T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
8ee2edbd-6cd7-4859-af5a-6cdca390a1fc	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio vence em 26d: hitmia.com.br	dominio	aviso	Vence em 2026-06-12T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
44882856-693e-4a6f-876d-8ca46a40435d	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: biolumini.com.br	dominio	critico	Vencido em 2026-05-04T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
2f0b50ab-ac50-4a45-997f-c232dedcf2e1	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: biolumine.com.br	dominio	critico	Vencido em 2026-05-04T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
c7affcba-1089-4b9e-b75b-0c90794225af	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: gestaoefuturo.com.br	dominio	critico	Vencido em 2026-05-13T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
8051db77-8738-43ea-9303-8bf06461562b	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: mobitheca.com.br	dominio	critico	Vencido em 2026-05-15T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
c3aa7f0a-3638-4096-a48a-add3390d9d9c	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: marcasefranquias.com.br	dominio	critico	Vencido em 2024-11-04T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
9e3db30e-4b4f-4048-bf89-dcae13d16d1d	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: beeteca.com.br	dominio	critico	Vencido em 2025-07-30T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
7ae2ddf7-5d31-4a39-8dac-ea147ef8755d	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: beeteka.com.br	dominio	critico	Vencido em 2025-07-30T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
41e2874f-268e-4f15-9740-e0e1770a1340	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: gestaoefranquias.com.br	dominio	critico	Vencido em 2025-08-21T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
6f778513-f2da-4f75-a731-ba254f13f73b	700654e3-a545-43c7-be27-dc34d810c935	\N	Domínio expirado: beetheca.com.br	dominio	critico	Vencido em 2025-07-30T03:00:00.000Z	t	\N	2026-05-17 21:00:45.703443+00
\.


--
-- Data for Name: ativos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ativos (id, org_id, empresa_id, tipo, status, marca, modelo, numero_serie, patrimonio, data_aquisicao, valor_aquisicao, vida_util_meses, warranty_end, departamento_id, department_nome, responsavel_id, assigned_to, specs, maintenance_log, observacoes, created_at, updated_at) FROM stdin;
91ee3188-61a2-4d1e-8ed5-5505a9fb5812	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Samsung	NP730QED	0ABN9QCW100160R	\N	2022-09-01	7000	60	2023-09-10	\N	Administrativo	\N	Roxena	{"ip": "172.16.20.30", "so": "Windows 11 Pro 24H2", "cpu": "12th Gen Intel Core i5-1235U @ 1.30GHz", "mac": "E0:D0:45:85:89:05", "ram": "16 GiB", "storage": "SSD 256 GB", "rustdesk_id": "375183207"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:17:35.318347+00
65ddcea9-3892-43d8-a56d-4c5833efdae8	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	ThinkPad T14 Gen 2	PE0AM7EW	\N	\N	5500	60	\N	\N	Tecnologia e Processos	\N	Joana Darc	{"ip": "192.168.17.106", "so": "Windows 11 24H2", "cpu": "11th Gen Intel Core i5-1145G7 @ 2.60GHz x8", "mac": "AC:5A:FC:B0:42:EE", "ram": "16 GiB", "storage": "SSD 256 GB", "rustdesk_id": "481313518"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
6fd94351-8771-4c75-96db-5a438f85cffe	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	estoque	Lenovo	IdeaPad 1 15IAU7	PE0CPYGF	\N	\N	3200	60	\N	\N	Infraestrutura	\N	\N	{"ip": "192.168.17.229", "so": "Windows 11 24H2", "cpu": "12th Gen Intel Core i5-1235U @ 1.30GHz x12", "mac": "C0-35-32-2B-0B-07", "ram": "8 GiB", "storage": "SSD 512 GB", "rustdesk_id": "304810759"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
ff807061-4ac7-47e1-8b17-fa4638aaea7d	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 1 15IAU7	PE0CPYFW	\N	\N	3200	60	\N	\N	Infraestrutura	\N	Marcelo Silva	{"ip": "192.168.17.137", "so": "Windows 11 24H2", "cpu": "12th Gen Intel Core i5-1235U @ 1.30GHz x12", "mac": "C0-35-32-27-6A-51", "ram": "24 GiB", "storage": "SSD 512 GB", "rustdesk_id": "304573009"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
f3e3b95b-2b0f-4226-a4c9-4b76f0f28b87	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCAF	\N	\N	3500	60	\N	\N	Tecnologia	\N	Moisés	{"ip": "192.168.17.154", "so": "Ubuntu 22.04.2 LTS", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04:E8:B9:C0:06:D9", "ram": "24 GiB", "storage": "SSD 512 GB", "rustdesk_id": "1430814943"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
e7b88b88-255b-4a11-868e-7909e4b7393f	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCAH	\N	\N	3500	60	\N	\N	Tecnologia	\N	Felipe Miranda	{"ip": "192.168.17.130", "so": "Ubuntu 22.04.2 LTS", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04:E8:B9:C0:03:5A", "ram": "24 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432014170"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
b814b5cd-70b3-4973-8f36-9343e0b7f41b	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 1 15IAU7	PE0CMJRR	\N	\N	3200	60	\N	\N	Tecnologia	\N	Russell Cavalcante	{"ip": "192.168.17.190", "so": "Ubuntu 22.04.2 LTS", "cpu": "12th Gen Intel Core i7-1255U @ 3.50GHz x12", "mac": "C0:35:32:33:81:39", "ram": "24 GiB", "storage": "SSD 512 GB", "rustdesk_id": "305365305"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
96fd62ce-dc41-4ae5-b717-c7bfa10e8e13	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJC97	\N	\N	3500	60	\N	\N	Licitações	\N	Fábio Teófilo	{"ip": "192.168.17.230", "so": "Windows 11 23H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-D8-70", "ram": "8 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432068721"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
7e7fd9a1-a9f1-413f-bf13-941b6196f166	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJC9T	\N	\N	3500	60	\N	\N	RH	\N	Xanda Bosschart	{"ip": "172.16.20.251", "so": "Windows 11 24H2", "cpu": "Intel Core i5-1135G7 CPU @ 2.40GHz", "mac": "04-E8-B9-C0-04-B8", "ram": "8 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432014171"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
cc5b6e0e-5624-4f75-8297-c804ea3ba782	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCAP	\N	\N	3500	60	\N	\N	Marketing	\N	Isabelle	{"ip": "192.168.17.71", "so": "Windows 11 24H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-08-82", "ram": "24 GiB", "storage": "SSD 512 GB + SSD 960 GB", "rustdesk_id": "432015491"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
e5b84c82-1677-41f2-85ca-3588bc42bc58	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	estoque	Lenovo	IdeaPad 3 15ITL6	PE07BJCQ4	\N	\N	3500	60	\N	\N	\N	\N	\N	{"ip": "", "so": "Windows 11 24H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "", "ram": "24 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432015611"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
3e4c01f8-f7e8-4305-ab29-28df82077920	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 1 15IAU7	PE0C7W1P	\N	\N	3200	60	\N	\N	Secretaria	\N	Marianna	{"ip": "192.168.17.231", "so": "Windows 11 24H2", "cpu": "12th Gen Intel Core i5-1235U @ 1.30GHz x12", "mac": "8C-E9-EE-8A-29-EC", "ram": "8 GiB", "storage": "SSD 512 GB", "rustdesk_id": "243935725"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
bc88e526-c499-4e97-a435-2054373a1668	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCAC	\N	\N	3500	60	\N	\N	Secretaria	\N	Valeria	{"ip": "192.168.17.67", "so": "Windows 11 24H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-09-22", "ram": "8 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432015651"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
52a66018-f5a7-4d08-96c7-f212ca0294f2	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJC8R	\N	\N	3500	60	\N	\N	Secretaria	\N	Sarah	{"ip": "192.168.17.171", "so": "Windows 11 23H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-D6-BD", "ram": "8 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432068286"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
aff07e02-ebbe-4a80-a97d-1eb747872e9c	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Samsung	Galaxy Book2	0ABR9QDT700131	\N	\N	4200	60	\N	\N	Inteligência	\N	Bruno	{"ip": "192.168.17.93", "so": "Windows 11 24H2", "cpu": "12th Gen Intel Core i7-1255U @ 1.70GHz x12", "mac": "4C-03-4F-C1-CA-E6", "ram": "16 GiB", "storage": "SSD 1024 GB", "rustdesk_id": "264358631"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
8bd99403-5500-40ec-925b-ce200fd67f19	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCA1	\N	\N	3500	60	\N	\N	Inteligência	\N	Jeiel	{"ip": "192.168.17.68", "so": "Windows 11 24H3", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-06-A2", "ram": "24 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432015011"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
a4460f63-49fa-4a07-a41a-253e85c8fdf5	700654e3-a545-43c7-be27-dc34d810c935	\N	Desktop	ativo	Lenovo	ThinkCentre M900	PE02M5E6	\N	\N	1800	60	\N	\N	Sala de Reunião (Ítalo)	\N	Ítalo Teofilo	{"ip": "192.168.17.211", "so": "Windows 10 Pro 22H2", "cpu": "6th Gen Intel Core i5-6500T @ 2.50GHz x8", "mac": "14-AB-C5-5B-62-FB", "ram": "8 GiB", "storage": "SSD 240 GB", "rustdesk_id": "50408604"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
91ea88c9-c818-47ba-a8cb-74aacd8f61aa	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 1 15IAU7	PE0CEE9Y	\N	\N	3200	60	\N	\N	Inteligência	\N	Meirelane (novo)	{"ip": "192.168.17.199", "so": "Windows 11 24H2", "cpu": "12th Gen Intel Core i5-1235U @ 1.30GHz x12", "mac": "B0-47-E9-AF-9A-8D", "ram": "24 GiB", "storage": "SSD 512 GB", "rustdesk_id": "162503310"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
ca232d7c-d962-479f-8d1c-0815f22307f4	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCAJ	\N	\N	3500	60	\N	\N	Comercial	\N	Fabiana Souza	{"ip": "192.168.18.51", "so": "Windows 11 24H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-06-F2", "ram": "8 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432015091"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
dd27cbf1-c8fd-4fe4-82a2-d1f2440cdbc1	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 1 15IAU7	PE0CEE9X	\N	\N	3200	60	\N	\N	Delivery	\N	Paulo Germano	{"ip": "192.168.17.103", "so": "Windows 10 Pro 22H2", "cpu": "12th Gen Intel Core i5-1235U @ 1.30GHz x12", "mac": "B0-47-E9-AF-83-22", "ram": "8 GiB", "storage": "SSD 512 GB", "rustdesk_id": "162497315"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
2f914cdb-bda3-470a-9f68-cf950dbad2e5	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCAN	\N	\N	3500	60	\N	\N	Controladoria	\N	Geysa Monteiro	{"ip": "192.168.17.146", "so": "Windows 11 24H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-07-0B", "ram": "24 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432015116"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
1b4f9c95-a33d-465e-9fb2-20bc5686cd3a	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCAB	\N	\N	3500	60	\N	\N	Controladoria	\N	Joalef	{"ip": "192.168.17.247", "so": "Windows 11 23H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-09-B3", "ram": "24 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432015796"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
b568212b-3084-444f-ba29-aad838708ac0	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCAM	\N	\N	3500	60	\N	\N	Global	\N	Andressa Queiroz	{"ip": "172.16.20.102", "so": "Windows 11 24H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-08-8C", "ram": "8 GiB", "storage": "SSD 512 GB", "rustdesk_id": "1390809492"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
09c7b392-9ba4-4051-8e1e-c64e5a97f808	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	estoque	Lenovo	IdeaPad 1 15IAU7	PE0CEDE2	\N	\N	3200	60	\N	\N	Sistemas	\N	\N	{"ip": "192.168.17.104", "so": "Ubuntu 22.04.4 LTS", "cpu": "12th Gen Intel Core i5-1235U @ 1.30GHz x12", "mac": "B0:47:E9:EB:A3:DE", "ram": "8 GiB", "storage": "SSD 512 GB", "rustdesk_id": "172691037"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
ca61a7e2-db37-4986-ab43-05e0afc9144f	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 1 15IAU7	PE0E1A3V	\N	\N	3200	60	\N	\N	Sistemas	\N	Roger	{"ip": "172.16.20.94", "so": "Ubuntu 24.04.4 LTS", "cpu": "12th Gen Intel Core i7-1255U @ 3.50GHz x12", "mac": "88:F4:DA:0E:C2:1B", "ram": "12 GiB", "storage": "SSD 512 GB", "rustdesk_id": ""}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
b955f183-a11f-4d16-89f5-3da917fbba23	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 1 15IAU7	PE0EA7GM	\N	\N	3200	60	\N	\N	Sistemas	\N	Moisés	{"ip": "172.16.20.96", "so": "Ubuntu 24.04.4 LTS", "cpu": "12th Gen Intel Core i7-1255U @ 3.50GHz x12", "mac": "D0:57:7E:F5:DF:48", "ram": "28 GiB", "storage": "SSD 512 GB", "rustdesk_id": ""}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
845f063a-b5d3-49c7-8721-cd66c033a38d	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCAF-2	\N	\N	3500	60	\N	\N	Sistemas	\N	Giuseppe	{"ip": "", "so": "Ubuntu 24.04.4 LTS", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "", "ram": "12 GiB", "storage": "SSD 512 GB", "rustdesk_id": ""}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
7f7a0c5e-8b8b-4c02-97f3-7bc866e120d3	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Samsung	Galaxy Book Go NP340XLA	0AEQ9QEWC01258V	\N	\N	2800	60	\N	\N	HCITIS	\N	Thais Lima	{"ip": "", "so": "Windows 11 24H2", "cpu": "Snapdragon 7cGen2 @ 2.55GHz", "mac": "", "ram": "4 GiB", "storage": "", "rustdesk_id": "163619865"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
3e0f4d3a-5285-4d5c-b246-813b948cf09e	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad Slim 3 15HR10	PE0EGQC	\N	\N	3800	60	\N	\N	HCITIS	\N	Thais Lima	{"ip": "", "so": "Windows 11 25H2", "cpu": "13th Gen Intel Core i5-13420H", "mac": "", "ram": "8 GiB", "storage": "SSD 477 GB", "rustdesk_id": "403431200"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
b996fae5-a843-4e4d-ac51-96e334a4a638	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCA7	\N	\N	3500	60	\N	\N	Onni AI/IMTS	\N	Kellyane	{"ip": "192.168.17.243", "so": "Windows 11 24H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-08-C8", "ram": "24 GiB", "storage": "SSD 512 GB", "rustdesk_id": "432015561"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
1e329292-5bb0-4e20-a820-0cf735636929	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	ativo	Lenovo	IdeaPad 3 15ITL6	PE0BJCAE	\N	\N	3500	60	\N	\N	RH	\N	Lais Matias	{"ip": "172.16.20.155", "so": "Windows 11 24H2", "cpu": "11th Gen Intel Core i5-1135G7 @ 2.40GHz x8", "mac": "04-E8-B9-C0-03-78", "ram": "12 GiB", "storage": "SSD 512 GB", "rustdesk_id": "1812838399"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
25e91348-def5-4474-9998-752f04269dfb	700654e3-a545-43c7-be27-dc34d810c935	\N	Impressora	ativo	Epson	L14150 Series	X6QM034306	\N	\N	4500	60	\N	\N	Secretaria da diretoria	\N	Valeria	{"ip": "172.16.20.195", "mac": "F8:25:51:C6:8C:B5", "unidade": "IMTS", "tecnologia": "Jato de Tinta", "identificador": "C68CB5"}	[]	\N	2026-05-07 17:09:24.217568+00	2026-05-07 17:42:10.890137+00
900292f0-7eb9-4dad-a0f3-1aaa7340b296	700654e3-a545-43c7-be27-dc34d810c935	\N	Impressora	ativo	Epson	L14150 Series	X6QM021921	\N	\N	4500	60	\N	\N	Financeiro	\N	\N	{"ip": "172.16.20.9", "mac": "F8:25:51:C4:18:6F", "unidade": "IMTS", "tecnologia": "Jato de Tinta", "identificador": "C4186F"}	[]	\N	2026-05-07 17:09:24.217568+00	2026-05-07 17:42:10.890137+00
8ec59f9e-ad7b-4071-ab2a-f48730a850df	700654e3-a545-43c7-be27-dc34d810c935	\N	Impressora	ativo	Epson	L14150 Series	X6QM021915	\N	\N	4500	60	\N	\N	Marketing	\N	\N	{"ip": "172.16.20.111", "mac": "F8:25:51:C3:F9:30", "unidade": "IMTS", "tecnologia": "Jato de Tinta", "identificador": "C3F930"}	[]	\N	2026-05-07 17:09:24.217568+00	2026-05-07 17:42:10.890137+00
a5bd6b8e-c61b-4159-ad2b-a72cdbcf7b9a	700654e3-a545-43c7-be27-dc34d810c935	\N	Impressora	ativo	Epson	L4260 Series	XAA9227425	\N	\N	1500	60	\N	\N	Administrativo	\N	\N	{"ip": "172.16.20.58", "mac": "E0:BB:9E:16:41:1C", "unidade": "IMTS", "tecnologia": "Jato de Tinta", "identificador": "16411C"}	[]	\N	2026-05-07 17:09:24.217568+00	2026-05-07 17:42:10.890137+00
3bd179fb-3a5e-4da1-ae4f-31ef61f9ac28	700654e3-a545-43c7-be27-dc34d810c935	\N	Impressora	ativo	Epson	L4260 Series	XAA9420948	\N	\N	1500	60	\N	\N	Recepção	\N	\N	{"ip": "172.16.20.11", "mac": "68:55:D4:3A:1C:3E", "unidade": "IMTS", "tecnologia": "Jato de Tinta", "identificador": "3A1C3E"}	[]	\N	2026-05-07 17:09:24.217568+00	2026-05-07 17:42:10.890137+00
e46efe35-dd24-4540-8cd4-cd37df27dad0	700654e3-a545-43c7-be27-dc34d810c935	\N	Impressora	ativo	Epson	L4160 Series	X59C179899	\N	\N	1800	60	\N	\N	RH	\N	\N	{"ip": "172.16.20.112", "mac": "E0:BB:9E:E0:66:AE", "unidade": "IMTS", "tecnologia": "Jato de Tinta"}	[]	\N	2026-05-07 17:09:24.217568+00	2026-05-07 17:42:10.890137+00
9937cef4-4182-4fb3-8b43-6067d6164fe2	700654e3-a545-43c7-be27-dc34d810c935	\N	Notebook	descartado	DELL	Inspiron	D47WWQ2	\N	2018-01-01	3500	60	0018-12-31	\N	Inteligência	\N	Meirelane	{"ip": "192.168.17.58", "so": "Windows 10 Pro 22H2", "cpu": "11th Gen Intel Core i7-7500U @ 2.70GHz x8", "mac": "74-40-BB-10-72-3D", "ram": "16 GiB", "storage": "SSD 512 GB", "rustdesk_id": "83220923"}	[]	\N	2026-05-06 13:59:37.268147+00	2026-05-07 17:42:10.890137+00
8b9dc9d3-fd14-4faf-a5e9-45a860a58258	700654e3-a545-43c7-be27-dc34d810c935	\N	Impressora	ativo	Epson	L14150 Series	X6QM033967	\N	2025-04-01	4500	60	2025-12-01	\N	Inteligencia	\N	\N	{"ip": "172.16.20.206", "mac": "F8:25:51:C6:70:7A", "unidade": "IMTS", "tecnologia": "Jato de Tinta", "identificador": "C6707A"}	[]	\N	2026-05-07 17:09:24.217568+00	2026-05-07 17:44:23.644974+00
d01e1cbd-b03c-4978-bfb2-b3d40f243fc7	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	PHILIPS	50PUG6513/78	AF211835056083	\N	\N	0	60	\N	\N	Recepção	\N	\N	{"ip": "172.16.20.151", "os": "SAPHI", "mac": "70:AF:24:98:89:56", "nome": "Recepção", "ambiente": "Recepção"}	[]	\N	2026-05-08 13:26:02.851239+00	2026-05-08 13:26:02.851239+00
3ef4c595-9d46-4506-af82-78c0ce1269d9	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	PHILIPS	50PUG6513/78	AF211907056156	\N	\N	0	60	\N	\N	Administrativo / Sala da roxena	\N	\N	{"ip": "172.16.20.152", "os": "SAPHI", "mac": "70:AF:24:E1:C7:F7", "nome": "Sala Roxena", "ambiente": "Administrativo / Sala da roxena"}	[]	\N	2026-05-08 13:26:02.985761+00	2026-05-08 13:26:02.985761+00
3f8984f1-803d-493f-8b6e-bc5c1700947a	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	PHILIPS	50PUG6513/78	AF211846054767	\N	\N	0	60	\N	\N	Espaço Maturidade (Reunião)	\N	\N	{"ip": "172.16.20.108", "os": "SAPHI", "mac": "70:AF:24:9E:21:E3", "nome": "Espaço Maturidade", "ambiente": "Espaço Maturidade (Reunião)"}	[]	\N	2026-05-08 13:26:03.118444+00	2026-05-08 13:26:03.118444+00
6607517f-cdba-4aab-a46e-5b55ef76e0b1	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	PHILIPS	50PUG6513/78	AF111831052279	\N	\N	0	60	\N	\N	Espaço Resiliência (Reunião)	\N	\N	{"os": "SAPHI", "mac": "70:AF:24:6B:07:DC", "nome": "Espaço Resiliência", "ambiente": "Espaço Resiliência (Reunião)"}	[]	\N	2026-05-08 13:26:03.251326+00	2026-05-08 13:26:03.251326+00
23a005cd-961f-47bb-99a3-92177f7d6ee6	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	LG	55TR3DK	\N	\N	\N	0	60	\N	\N	Espaço Felicidade	\N	\N	{"ip": "172.16.20.141", "os": "Android 11", "mac": "90:e4:68:02:e9:dd", "nome": "Espaço Felicidade (Dashboard)", "ambiente": "Espaço Felicidade"}	[]	\N	2026-05-08 13:26:03.384223+00	2026-05-08 13:26:03.384223+00
fd83f0ae-bb6b-47e6-990c-68da619448d8	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	Samsung	UN65DU7700GXZD	Y5MU3X7X405438N	\N	\N	0	60	\N	\N	Espaço Felicidade	\N	\N	{"ip": "172.16.20.20", "os": "Tizen", "mac": "e8:aa:cb:c1:77:eb", "nome": "Espaço Felicidade (Meeting)", "ambiente": "Espaço Felicidade"}	[]	\N	2026-05-08 13:26:03.516884+00	2026-05-08 13:26:03.516884+00
8aca738e-ca0c-4048-b29b-beb6eba17630	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	Samsung	UN50DU7700GXZD	Y5MY3X3X404495P	\N	\N	0	60	\N	\N	Espaço Felicidade	\N	\N	{"ip": "172.16.20.29", "os": "Tizen", "mac": "e8:aa:cb:c1:42:a4", "nome": "Espaço Felicidade (Market)", "ambiente": "Espaço Felicidade"}	[]	\N	2026-05-08 13:26:03.651894+00	2026-05-08 13:26:03.651894+00
51f505a4-a939-4b73-9444-9386b371cb09	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	LG	65UN7310PSC	011AZPU4V592	\N	\N	0	60	\N	\N	Espaço Felicidade	\N	\N	{"ip": "192.168.17.155", "os": "webOS", "mac": "58:FD:B1:C6:3D:61", "nome": "Espaço Felicidade (Rest)", "ambiente": "Espaço Felicidade"}	[]	\N	2026-05-08 13:26:03.784676+00	2026-05-08 13:26:03.784676+00
da834766-3a9e-4ec8-a90a-5a76336aa8d4	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	Samsung	UN85CU8000GXZD	Y5C33X7X200909M	\N	\N	0	60	\N	\N	Salão superior	\N	\N	{"ip": "172.16.20.120", "os": "Tizen", "mac": "6c:70:cb:73:e9:a0", "nome": "Hall", "ambiente": "Salão superior"}	[]	\N	2026-05-08 13:26:03.919516+00	2026-05-08 13:26:03.919516+00
79ff3610-93b9-46a4-a86d-bb69258cebf5	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	LG	55TR3DK	\N	\N	\N	0	60	\N	\N	Sala Reunião / Sala do Italo	\N	\N	{"ip": "172.16.20.132", "os": "Android 11", "mac": "90:e4:68:8c:f8:23", "nome": "SALA_REUNIAO_DASHBOARD", "ambiente": "Sala Reunião / Sala do Italo"}	[]	\N	2026-05-08 13:26:04.052373+00	2026-05-08 13:26:04.052373+00
992b885b-433f-4df5-a852-d268a72df016	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	Samsung	QN65Q60BAGXZD	Y4Y93X5T801636H	\N	\N	0	60	\N	\N	Sala Reunião / Sala do Italo	\N	\N	{"ip": "172.16.20.131", "os": "Tizen", "mac": "f0:70:4f:7e:33:7d", "nome": "SALA_REUNIAO_FRONT", "ambiente": "Sala Reunião / Sala do Italo"}	[]	\N	2026-05-08 13:26:04.185505+00	2026-05-08 13:26:04.185505+00
29da5846-78f0-43ec-8c82-09e59c5a8b35	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	LG	55UR8750PSA	308AZHY51225	\N	\N	0	60	\N	\N	Sala Reunião / Sala do Italo	\N	\N	{"ip": "172.16.20.93", "os": "webOS 24", "mac": "64:E4:A5:5C:41:4F", "nome": "SALA_REUNIAO_BACK", "ambiente": "Sala Reunião / Sala do Italo"}	[]	\N	2026-05-08 13:26:04.318319+00	2026-05-08 13:26:04.318319+00
cd56e47b-b9ac-4bae-875a-352c99b77cdc	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	LG	55TR3DK-BM	409GLEH00924	\N	\N	0	60	\N	\N	CodeLab	\N	\N	{"ip": "172.16.20.149", "os": "Android 13", "mac": "44:37:0b:5e:2e:4c", "nome": "CodeLab Dashboard", "ambiente": "CodeLab"}	[]	\N	2026-05-08 13:26:04.451095+00	2026-05-08 13:26:04.451095+00
0403630b-8835-4844-97e7-674bb4dd3cf3	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	LG	65UA8550PSA	505AZVNAW799	\N	\N	0	60	\N	\N	CodeLab	\N	\N	{"ip": "172.16.20.175", "os": "webOS 25", "mac": "58:96:0A:24:EE:C9", "nome": "CodeLab Front", "ambiente": "CodeLab"}	[]	\N	2026-05-08 13:26:04.58388+00	2026-05-08 13:26:04.58388+00
c78116d9-efe3-418e-93f3-602b5b01bbee	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	Samsung	UN50DU7700GXZD	Y5MY3X3X404623E	\N	\N	0	60	\N	\N	CodeLab	\N	\N	{"ip": "172.16.20.148", "os": "Tizen", "mac": "e8:aa:cb:c1:6c:1b", "nome": "CodeLab Back", "ambiente": "CodeLab"}	[]	\N	2026-05-08 13:26:04.716737+00	2026-05-08 13:26:04.716737+00
f084c601-65df-4bee-8fd4-0fa59b113162	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	LG	55UR8750PSA	308AZFM51219	\N	\N	0	60	\N	\N	Sala da Kamila	\N	\N	{"ip": "172.16.20.108", "os": "webOS 24", "mac": "64.E4:A5:5C:41:24", "nome": "SALA BACKOFFICE", "ambiente": "Sala da Kamila"}	[]	\N	2026-05-08 13:26:04.850832+00	2026-05-08 13:26:04.850832+00
1dcc6918-0d25-4ee7-864b-97304c19e3dd	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	LG	75UA8550PSA.BWZFLJZ	507AZJTPB220	\N	\N	0	60	\N	\N	Espaço Expansão (Auditório)	\N	\N	{"ip": "172.16.20.190", "os": "webOS 25", "mac": "58:96:0A:43:73:9F", "nome": "Espaço Expansão TV", "ambiente": "Espaço Expansão (Auditório)"}	[]	\N	2026-05-08 13:26:04.98353+00	2026-05-08 13:26:04.98353+00
1267f674-9110-4f0e-a128-7fbb522f7188	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	LG	75TR3DK-BM	\N	\N	\N	0	60	\N	\N	Espaço Expansão (Auditório)	\N	\N	{"ip": "172.16.20.166", "os": "Android 13", "mac": "58:41:46:1e:63:a7", "nome": "Espaço Expansão Dashboard", "ambiente": "Espaço Expansão (Auditório)"}	[]	\N	2026-05-08 13:26:05.11669+00	2026-05-08 13:26:05.11669+00
f12b6938-edb1-4eea-964e-32502253bbe5	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	Samsung	UN50DU7700GXZD	Y5MY3X3X404498Y	\N	\N	0	60	\N	\N	Espaço Liderança (Delivery)	\N	\N	{"ip": "172.16.20.165", "os": "Tizen", "mac": "e8:aa:cb:c1:42:d1", "nome": "Espaço Liderança (Delivery)", "ambiente": "Espaço Liderança (Delivery)"}	[]	\N	2026-05-08 13:26:05.249653+00	2026-05-08 13:26:05.249653+00
7e5de4ce-8ff0-4172-b075-2bd7826ba7f0	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	Samsung	UN50DU7700GXZD	Y5MY3X3X404458M	\N	\N	0	60	\N	\N	Espaço Liderança (Inovações)	\N	\N	{"ip": "172.16.20.168", "os": "Tizen", "mac": "e8:aa:cb:c1:5b:f1", "nome": "Espaço Liderança (Inovações)", "ambiente": "Espaço Liderança (Inovações)"}	[]	\N	2026-05-08 13:26:05.382371+00	2026-05-08 13:26:05.382371+00
d539bb06-88bf-48b2-b81d-124f1ccb4999	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	Samsung	UN50DU7700GXZD	Y5MY3X3X404360J	\N	\N	0	60	\N	\N	Espaço Liderança (Negócios)	\N	\N	{"ip": "172.16.20.159", "os": "Tizen", "mac": "e8:aa:cb:c1:60:9f", "nome": "Espaço Liderança (Negócios)", "ambiente": "Espaço Liderança (Negócios)"}	[]	\N	2026-05-08 13:26:05.515906+00	2026-05-08 13:26:05.515906+00
ca287292-ed2b-4dac-930e-642d2ccd6d32	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	PHILIPS	50PUG6513/78	AF111832061259	\N	\N	0	60	\N	\N	Espaço Lideranca (Exelência)	\N	\N	{"ip": "172.16.20.186", "os": "SAPHI", "mac": "70:AF:24:6B:41:42", "nome": "Espaço Lideranca (Exelência)", "ambiente": "Espaço Lideranca (Exelência)"}	[]	\N	2026-05-08 13:26:05.648817+00	2026-05-08 13:26:05.648817+00
95c94a4c-7890-45ae-a223-1c1f14c84416	700654e3-a545-43c7-be27-dc34d810c935	\N	TV	ativo	Samsung	UN50DU7700GXZD	Y5MY3X3X404393L	\N	\N	0	60	\N	\N	Espaço Lideranca (Confiança)	\N	\N	{"ip": "172.16.20.162", "os": "Tizen", "mac": "e8:aa:cb:c1:48:79", "nome": "Espaço Lideranca (Confiança)", "ambiente": "Espaço Lideranca (Confiança)"}	[]	\N	2026-05-08 13:26:05.781804+00	2026-05-08 13:26:05.781804+00
fd280d22-7601-4827-b40b-0a25017a237f	700654e3-a545-43c7-be27-dc34d810c935	\N	Biometria	ativo	Control Id	Idflex Pro	\N	\N	\N	0	60	\N	\N	Suporte	\N	\N	{"ip": "172.16..20.21", "ambiente": "Suporte"}	[]	\N	2026-05-08 13:26:05.914585+00	2026-05-08 13:26:05.914585+00
40a34ab5-5537-4844-9008-2c51de2c02ca	700654e3-a545-43c7-be27-dc34d810c935	\N	Biometria	ativo	Control Id	Idflex Pro	\N	\N	\N	0	60	\N	\N	Secretaria da diretoria	\N	\N	{"ip": "172.16..20.22", "ambiente": "Secretaria da diretoria"}	[]	\N	2026-05-08 13:26:06.047075+00	2026-05-08 13:26:06.047075+00
4b3e93ba-a918-42b6-9479-112ff2b9d21a	700654e3-a545-43c7-be27-dc34d810c935	\N	Biometria	ativo	Control Id	Idflex Pro	\N	\N	\N	0	60	\N	\N	Sala Do Italo/Reunião	\N	\N	{"ip": "172.16..20.23", "ambiente": "Sala Do Italo/Reunião"}	[]	\N	2026-05-08 13:26:06.179599+00	2026-05-08 13:26:06.179599+00
838e1e8c-192e-4a67-9c3a-9e873dbd4252	700654e3-a545-43c7-be27-dc34d810c935	\N	Biometria	ativo	Control Id	Idflex Pro	\N	\N	\N	0	60	\N	\N	Financeiro	\N	\N	{"ip": "172.16..20.24", "ambiente": "Financeiro"}	[]	\N	2026-05-08 13:26:06.31224+00	2026-05-08 13:26:06.31224+00
0ac45a1c-41f8-4615-82b1-3965beba9971	700654e3-a545-43c7-be27-dc34d810c935	\N	Biometria	ativo	Control Id	Idflex Pro	\N	\N	\N	0	60	\N	\N	Sala da Kamila	\N	\N	{"ip": "172.16..20.25", "ambiente": "Sala da Kamila"}	[]	\N	2026-05-08 13:26:06.444794+00	2026-05-08 13:26:06.444794+00
6ec2399c-59b0-430d-8336-33a974589bc9	700654e3-a545-43c7-be27-dc34d810c935	\N	Biometria	ativo	Control Id	Idflex Pro	\N	\N	\N	0	60	\N	\N	Inteligência	\N	\N	{"ip": "172.16..20.26", "ambiente": "Inteligência"}	[]	\N	2026-05-08 13:26:06.577234+00	2026-05-08 13:26:06.577234+00
e7ce87bf-7cfe-459d-bc78-5d07cd9cb65e	700654e3-a545-43c7-be27-dc34d810c935	\N	Biometria	ativo	Control Id	Idflex Pro	\N	\N	\N	0	60	\N	\N	RH	\N	\N	{"ip": "172.16..20.27", "ambiente": "RH"}	[]	\N	2026-05-08 13:26:06.710032+00	2026-05-08 13:26:06.710032+00
c98598d7-72ba-40ff-a0cc-616cb68ec6a2	700654e3-a545-43c7-be27-dc34d810c935	\N	Biometria	ativo	Control Id	Idflex Pro	\N	\N	\N	0	60	\N	\N	Red Hat	\N	\N	{"ip": "172.16..20.28", "ambiente": "Red Hat"}	[]	\N	2026-05-08 13:26:06.842777+00	2026-05-08 13:26:06.842777+00
67f1c20a-15c4-4a26-9474-33417f76abc9	700654e3-a545-43c7-be27-dc34d810c935	\N	Biometria	ativo	Control Id	Idflex Pro	\N	\N	\N	0	60	\N	\N	Sala da produção	\N	\N	{"ip": "Offline", "ambiente": "Sala da produção"}	[]	\N	2026-05-08 13:26:06.975409+00	2026-05-08 13:26:06.975409+00
2702468a-4bf7-42db-8586-faca4683ffaa	700654e3-a545-43c7-be27-dc34d810c935	\N	Biometria	ativo	Control Id	Idflex Pro	\N	\N	\N	0	60	\N	\N	Almoxarifado	\N	\N	{"ip": "Offline", "ambiente": "Almoxarifado"}	[]	\N	2026-05-08 13:26:07.107986+00	2026-05-08 13:26:07.107986+00
66666666-6666-6666-6666-666666666667	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	Monitor	estoque	LG	27UL850	SN-DEMO-002	\N	2024-06-01	1800	\N	\N	\N	Operações TI	\N	\N	\N	\N	\N	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: contratos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contratos (id, org_id, empresa_id, supplier, object, type, status, monthly_cost, cost_center, end_date, created_at, updated_at) FROM stdin;
aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	AWS	Hospedagem workloads	Infraestrutura	Ativo	1200	CC-TI-01	2027-06-30	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: departamentos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departamentos (id, org_id, nome, centro_custo, responsavel, empresa_id, created_at, updated_at) FROM stdin;
44444444-4444-4444-4444-444444444444	22222222-2222-2222-2222-222222222222	Operações TI	CC-TI-01	\N	33333333-3333-3333-3333-333333333333	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: dns_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dns_records (id, org_id, empresa_id, dominio_id, tipo, nome, valor, ttl, prioridade, observacoes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dominios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dominios (id, org_id, empresa_id, nome, registrar, data_vencimento, custo_anual, custo_renovacao, auto_renovacao, dns_provider, hosting_provider, ssl_vencimento, status, observacoes, created_at, updated_at) FROM stdin;
7d7d83df-46b2-46d8-89d4-186e8b92b36f	700654e3-a545-43c7-be27-dc34d810c935	\N	br.hcitis.com	\N	\N	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
b064f32f-a801-42b6-b2d3-7b570ca7645a	700654e3-a545-43c7-be27-dc34d810c935	\N	ecorretores.com	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
98507c8f-9e3c-492b-af5a-e4a587a34e0f	700654e3-a545-43c7-be27-dc34d810c935	\N	gefholding.com.br	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
f198e8dc-0a58-4d2d-9d14-932c59eff439	700654e3-a545-43c7-be27-dc34d810c935	\N	globalfacilities.digital	\N	\N	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
2d24bda5-c76c-41d1-be45-6aafd5da8225	700654e3-a545-43c7-be27-dc34d810c935	\N	globalfacilities.online	\N	\N	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
7f76068f-9e52-4ef6-9444-bc2b149736d1	700654e3-a545-43c7-be27-dc34d810c935	\N	hcitis.com	\N	\N	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
95d4cd76-7ca1-4216-a8f7-a6048efed1db	700654e3-a545-43c7-be27-dc34d810c935	\N	imts.onmicrosoft.com	\N	\N	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
04a193b6-4b29-464d-a56e-752b6f01f2d7	700654e3-a545-43c7-be27-dc34d810c935	\N	meucoworking.com	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
029b1ae9-58d6-4b61-aa44-56a370b97fd0	700654e3-a545-43c7-be27-dc34d810c935	\N	mosecompetence.org	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
1a45b5ba-a0df-449f-b030-242ad229a9e9	700654e3-a545-43c7-be27-dc34d810c935	\N	onni.academy	\N	\N	0	0	t	\N	\N	\N	Ativo	Instalação incompleta	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
bcc17b4e-206c-4afa-bbfa-909854045b7d	700654e3-a545-43c7-be27-dc34d810c935	\N	onni.technology	\N	\N	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
2802e8b9-b188-418a-8c9d-cecab8e00c16	700654e3-a545-43c7-be27-dc34d810c935	\N	performance9x.com	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
36e1db6d-70e3-45f6-96dd-f56fe4dbcbbe	700654e3-a545-43c7-be27-dc34d810c935	\N	predics.online	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
99406f47-626b-4617-8439-d51830639632	700654e3-a545-43c7-be27-dc34d810c935	\N	restricto.me	\N	\N	0	0	t	\N	\N	\N	Ativo	Instalação incompleta	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
f9ca242f-a54e-4b1d-a344-a8295c77dd7d	700654e3-a545-43c7-be27-dc34d810c935	\N	siders.tech	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
a6156968-0074-447d-8cba-c1913c0d0c73	700654e3-a545-43c7-be27-dc34d810c935	\N	suavybbe.com.br	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
757e7360-c691-4e91-81bb-182f7d19571b	700654e3-a545-43c7-be27-dc34d810c935	\N	vycma.education	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
e156990e-fbe5-4a26-acad-9678198a4480	700654e3-a545-43c7-be27-dc34d810c935	\N	vycma.online	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
db7ce091-17f9-42ce-9bc8-af6016454aba	700654e3-a545-43c7-be27-dc34d810c935	\N	vycma.org	\N	\N	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
17b48631-987f-40ee-b76e-6cf7a7815649	700654e3-a545-43c7-be27-dc34d810c935	\N	vycma.tech	\N	\N	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 17:41:27.988869+00
ef47bc0c-3014-405f-8493-29bb110d4dab	700654e3-a545-43c7-be27-dc34d810c935	\N	performance9x.com.br	Registro.br	2026-01-31	0	0	t	\N	\N	\N	Expirando	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
444d29be-7a1c-4ca9-92dc-011cce908103	700654e3-a545-43c7-be27-dc34d810c935	\N	auttis.com.br	Registro.br	2026-06-11	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
6e730d75-3187-4c70-a5df-4613020a6d93	700654e3-a545-43c7-be27-dc34d810c935	\N	hitmia.com.br	Registro.br	2026-06-12	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
e3bcf9be-b9a1-45df-a9c2-0f3674196dd1	700654e3-a545-43c7-be27-dc34d810c935	\N	imts.com.br	Registro.br	2030-03-26	0	0	t	\N	\N	\N	Ativo	Padrão · Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
67f12193-52bf-4d45-9ddf-9adab4738a2a	700654e3-a545-43c7-be27-dc34d810c935	\N	limmk.com.br	Registro.br	2026-08-20	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
8545bf02-09a8-4cf6-9b02-eb567c2bfbb7	700654e3-a545-43c7-be27-dc34d810c935	\N	limmksolucoes.com.br	Registro.br	2026-11-01	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
07008054-db00-47a1-bb5a-832faf17c2aa	700654e3-a545-43c7-be27-dc34d810c935	\N	onniai.com.br	Registro.br	2026-11-19	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
37f15b35-babb-44c1-9684-855de4e4d0e2	700654e3-a545-43c7-be27-dc34d810c935	\N	pmgt.com.br	Registro.br	2026-08-13	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
feb8f64d-0450-4fc1-bbdf-70c02dbcfa59	700654e3-a545-43c7-be27-dc34d810c935	\N	reddi.com.br	Registro.br	2027-05-05	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
eafb7c3f-c1af-4624-9b9f-2cd484e613f5	700654e3-a545-43c7-be27-dc34d810c935	\N	siders.com.br	Registro.br	2027-02-24	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
d695dddb-0102-4a2f-afde-53762181d81f	700654e3-a545-43c7-be27-dc34d810c935	\N	smartts.com.br	Registro.br	2026-08-22	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
1ada31c4-982a-4964-8b1d-345ce85f5a9b	700654e3-a545-43c7-be27-dc34d810c935	\N	t2participacoes.com.br	Registro.br	2026-11-01	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
0fa4d17e-08a6-47ba-ac14-98030bf37934	700654e3-a545-43c7-be27-dc34d810c935	\N	t7investimentos.com.br	Registro.br	2026-11-01	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
8ffe5431-0530-47ff-9b75-74f6f177b4c7	700654e3-a545-43c7-be27-dc34d810c935	\N	visttoriar.com.br	Registro.br	2027-06-12	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:05:42.323958+00
b6dcd80b-cbe6-45d2-ad47-f30748155acd	700654e3-a545-43c7-be27-dc34d810c935	\N	biolumini.com.br	Registro.br	2026-05-04	0	0	f	\N	\N	\N	Expirado	\N	2026-05-05 18:05:42.323958+00	2026-05-05 18:05:42.323958+00
8c00706c-b1bc-4292-bee3-f94c974438cb	700654e3-a545-43c7-be27-dc34d810c935	\N	pullseestrategia.com.br	Registro.br	2027-04-13	0	0	t	\N	\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-05 18:10:50.237564+00
6e38a6c8-f49a-4f74-b78e-604d3c46fc04	700654e3-a545-43c7-be27-dc34d810c935	\N	pulseestrategia.com.br	Registro.br	2027-02-08	0	0	t	\N	\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-05 18:10:50.237564+00
b19770f2-de30-4743-9320-63591cc90a8e	700654e3-a545-43c7-be27-dc34d810c935	\N	biolumine.com.br	Registro.br	2026-05-04	0	0	f	Registro.br	Registro.br	2026-05-04	Expirado	\N	2026-05-05 18:05:42.323958+00	2026-05-05 20:41:21.780553+00
c950ca61-7d01-4188-9bc6-55e97e6d907b	700654e3-a545-43c7-be27-dc34d810c935	\N	gestaoefuturo.com.br	Registro.br	2026-05-13	0	0	f	\N	\N	\N	Expirando	\N	2026-05-05 18:05:42.323958+00	2026-05-05 18:05:42.323958+00
2a02344e-ae0f-4420-ba5a-db4ff25a0fc6	700654e3-a545-43c7-be27-dc34d810c935	\N	mobitheca.com.br	Registro.br	2026-05-15	0	0	f	\N	\N	\N	Expirando	\N	2026-05-05 18:05:42.323958+00	2026-05-05 18:05:42.323958+00
2a534187-8d21-465f-823c-5a837b462280	700654e3-a545-43c7-be27-dc34d810c935	\N	628technology.com.br	Registro.br	2027-02-28	0	0	t	\N	\N	\N	Ativo	\N	2026-05-05 18:05:42.323958+00	2026-05-05 18:05:42.323958+00
2d949f4f-1c16-43b5-b400-2708338a0890	700654e3-a545-43c7-be27-dc34d810c935	\N	italoteofilo.com.br	Registro.br	2026-08-27	0	0	t	\N	\N	\N	Ativo	\N	2026-05-05 18:05:42.323958+00	2026-05-05 18:05:42.323958+00
6e40db94-81bc-4075-98e1-c124d32c3e1f	700654e3-a545-43c7-be27-dc34d810c935	\N	kamillamarques.com.br	Registro.br	2026-10-01	0	0	t	\N	\N	\N	Ativo	\N	2026-05-05 18:05:42.323958+00	2026-05-05 18:05:42.323958+00
041c1e6a-0b31-4012-93a1-b158ef9c59c9	700654e3-a545-43c7-be27-dc34d810c935	\N	pmgts.com.br	Registro.br	2026-07-30	0	0	t	\N	\N	\N	Ativo	\N	2026-05-05 18:05:42.323958+00	2026-05-05 18:05:42.323958+00
63fada8f-92e5-4139-80f0-94b6527fd3ef	700654e3-a545-43c7-be27-dc34d810c935	\N	empreenet.com.br	Registro.br	2027-11-17	0	0	t	\N	\N	\N	Ativo	\N	2026-05-05 18:10:50.237564+00	2026-05-05 18:10:50.237564+00
caf14891-3264-4531-9017-07ae21826488	700654e3-a545-43c7-be27-dc34d810c935	\N	impullseone.com.br	Registro.br	2027-05-01	0	0	t	\N	\N	\N	Ativo	\N	2026-05-05 18:10:50.237564+00	2026-05-05 18:10:50.237564+00
dfb40134-5385-41d1-943b-f17653a7b197	700654e3-a545-43c7-be27-dc34d810c935	\N	impullseonecast.com.br	Registro.br	2027-05-01	0	0	t	\N	\N	\N	Ativo	\N	2026-05-05 18:10:50.237564+00	2026-05-05 18:10:50.237564+00
3f45f90b-ecb5-4422-9a96-c5e65363214a	700654e3-a545-43c7-be27-dc34d810c935	\N	fivo.club	GoDaddy	2026-09-01	0	225	t	\N	\N	\N	Ativo	\N	2026-05-05 18:25:17.056451+00	2026-05-05 18:25:17.056451+00
48db32f6-10c6-4bc4-90e6-5dfeae509507	700654e3-a545-43c7-be27-dc34d810c935	\N	fivo.digital	GoDaddy	2026-09-01	0	229	t	\N	\N	\N	Ativo	\N	2026-05-05 18:25:17.056451+00	2026-05-05 18:25:17.056451+00
691d3a20-beaa-48a5-81a7-beefedfaae77	700654e3-a545-43c7-be27-dc34d810c935	\N	outlier-startups.online	GoDaddy	2027-02-06	0	0	t	\N	\N	\N	Ativo	\N	2026-05-08 13:25:53.711653+00	2026-05-08 13:25:53.711653+00
698ed15d-2c94-42d9-b7e3-2cb31b392d0b	700654e3-a545-43c7-be27-dc34d810c935	\N	outlier-startups.org	GoDaddy	2027-02-05	0	0	t	\N	\N	\N	Ativo	\N	2026-05-08 13:25:53.845105+00	2026-05-08 13:25:53.845105+00
9e09916d-1275-4b3f-a080-2abbd29358f4	700654e3-a545-43c7-be27-dc34d810c935	\N	outilier.com.br	GoDaddy	2026-10-01	0	0	t	\N	\N	\N	Ativo	\N	2026-05-08 13:25:53.976803+00	2026-05-08 13:25:53.976803+00
c9640f16-3d7a-45c9-8b80-ce6f06933784	700654e3-a545-43c7-be27-dc34d810c935	\N	outilier.com	GoDaddy	2026-10-01	0	0	t	\N	\N	\N	Ativo	\N	2026-05-08 13:25:54.108957+00	2026-05-08 13:25:54.108957+00
e6e2f03d-4c3f-4ad5-a860-c445801ec3ae	700654e3-a545-43c7-be27-dc34d810c935	\N	marcasefranquias.com.br	RegistroBR	2024-11-04	0	0	t	\N	\N	\N	Inativo	Não temos mais esse domínio	2026-05-08 13:25:54.2406+00	2026-05-08 13:25:54.2406+00
b70a32bb-2cef-4432-ad35-853957a4a63b	700654e3-a545-43c7-be27-dc34d810c935	\N	fmsouzatech.com.br	Registro.BR	\N	0	40	t		\N	\N	Ativo	Íntegro	2026-05-05 17:41:27.988869+00	2026-05-25 22:26:20.435433+00
045680ef-2ddb-44a2-af12-cc70fc27aff0	700654e3-a545-43c7-be27-dc34d810c935	\N	beeteca.com.br	RegistroBR	2025-07-30	0	0	t	\N	\N	\N	Inativo	Não será renovado	2026-05-08 13:25:54.372526+00	2026-05-08 13:25:54.372526+00
a04f5a40-05d1-48c7-9514-95cc70e276e2	700654e3-a545-43c7-be27-dc34d810c935	\N	beeteka.com.br	RegistroBR	2025-07-30	0	0	t	\N	\N	\N	Inativo	Não será renovado	2026-05-08 13:25:54.504747+00	2026-05-08 13:25:54.504747+00
14a5d0c5-42c8-46fa-8034-e50bd187d61c	700654e3-a545-43c7-be27-dc34d810c935	\N	beetheca.com.br	RegistroBR	2025-07-30	0	0	t	\N	\N	\N	Inativo	Não será renovado	2026-05-08 13:25:54.636501+00	2026-05-08 13:25:54.636501+00
9d29a815-5a04-4d89-95f4-bd27048025b3	700654e3-a545-43c7-be27-dc34d810c935	\N	gestaoefranquias.com.br	RegistroBR	2025-08-21	0	0	t	\N	\N	\N	Inativo	Não será renovado	2026-05-08 13:25:55.030285+00	2026-05-08 13:25:55.030285+00
582d09dc-e792-423e-8418-20de72abaf21	700654e3-a545-43c7-be27-dc34d810c935	\N	kazzaz.com.br	RegistroBR	2025-06-24	0	0	t	\N	\N	\N	Inativo	Não será renovado	2026-05-08 13:25:55.555878+00	2026-05-08 13:25:55.555878+00
3b08f849-9b98-4a2c-928a-5461287e2c7d	700654e3-a545-43c7-be27-dc34d810c935	\N	p9x.com.br	RegistroBR	2025-07-06	0	0	t	\N	\N	\N	Inativo	Não será renovado	2026-05-08 13:25:55.818455+00	2026-05-08 13:25:55.818455+00
2f252605-e47f-4d27-b705-ac63dab171d2	700654e3-a545-43c7-be27-dc34d810c935	\N	pmgt-ceara.com.br	RegistroBR	2025-08-19	0	0	t	\N	\N	\N	Inativo	Não será renovado	2026-05-08 13:25:55.950321+00	2026-05-08 13:25:55.950321+00
bc84ce26-209b-44e4-afe2-b403ab9b2851	700654e3-a545-43c7-be27-dc34d810c935	\N	pmgt-maranhao.com.br	RegistroBR	2025-08-19	0	0	t	\N	\N	\N	Inativo	Não será renovado	2026-05-08 13:25:56.082731+00	2026-05-08 13:25:56.082731+00
5ad6d058-e85f-47f4-b969-b941a65d6751	700654e3-a545-43c7-be27-dc34d810c935	\N	smarttsutilities.com.br	RegistroBR	2025-07-16	0	0	t	\N	\N	\N	Inativo	Não será renovado	2026-05-08 13:25:56.345704+00	2026-05-08 13:25:56.345704+00
e37c649c-311d-4697-9dea-7b51ee479949	700654e3-a545-43c7-be27-dc34d810c935	\N	hcitis.com.br	RegistroBR	2026-07-06	0	0	t	\N	\N	\N	Expirando	\N	2026-05-08 13:25:56.477547+00	2026-05-08 13:25:56.477547+00
1b0121c5-99e8-4311-bc68-4a54aae7d5a0	700654e3-a545-43c7-be27-dc34d810c935	\N	hyperconvergence.com.br	RegistroBR	2026-05-17	0	0	t	\N	\N	\N	Expirando	\N	2026-05-08 13:25:56.609138+00	2026-05-08 13:25:56.609138+00
e42b03f0-6695-427f-abc6-0c0df26c7114	700654e3-a545-43c7-be27-dc34d810c935	\N	tronos-edu.com	GoDaddy	2027-03-03	0	0	t	\N	\N	\N	Ativo	\N	2026-05-08 13:25:57.527673+00	2026-05-08 13:25:57.527673+00
dabedfbd-fa95-480b-8400-82e1ef7dfa5e	700654e3-a545-43c7-be27-dc34d810c935	\N	tronos-edu.com.br	GoDaddy	2027-03-03	0	0	t	\N	\N	\N	Ativo	\N	2026-05-08 13:25:57.659728+00	2026-05-08 13:25:57.659728+00
77777777-7777-7777-7777-777777777777	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	imts-demo.local	Registro.br	2026-08-01	120	120	t	Cloudflare	Vercel	2026-07-15	Ativo	\N	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
eb07b15c-2b5a-4544-a995-b9f64af403d5	700654e3-a545-43c7-be27-dc34d810c935	\N	cetig.com.br		\N	0	40	f		\N	\N	Ativo	Possíveis problemas de serviços	2026-05-05 17:41:27.988869+00	2026-05-21 18:08:48.542533+00
\.


--
-- Data for Name: empresas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.empresas (id, org_id, nome, cnpj, segmento, responsavel, ativo, observacoes, created_at, updated_at) FROM stdin;
fab64eba-0bff-4681-b04d-b13c8d6b2ebd	db815a55-70a8-421e-ba4a-6efade18fc2a	IMTS Holding	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
1ee3904c-34b8-4ac6-84e9-695c88258499	db815a55-70a8-421e-ba4a-6efade18fc2a	Onni.ai	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
614bf401-d4b2-426d-b920-f9941c64ea3f	db815a55-70a8-421e-ba4a-6efade18fc2a	Reach	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
d829c931-c283-4cd5-8f21-5941e6883824	db815a55-70a8-421e-ba4a-6efade18fc2a	Mobcall	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
b2e8d38c-9eca-4202-a8f6-481dd3c66ecd	db815a55-70a8-421e-ba4a-6efade18fc2a	PMGT	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
162201d8-862f-4155-b108-cde3f67653fb	db815a55-70a8-421e-ba4a-6efade18fc2a	Hcitis	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
7419d0e9-8758-4a16-aa2b-22aa2a276d43	db815a55-70a8-421e-ba4a-6efade18fc2a	TRON	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
fac9d1c7-5414-42f2-b79f-6373b463a35d	db815a55-70a8-421e-ba4a-6efade18fc2a	Auttis	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
05740c14-2b5c-4a24-9350-147bf2c83ba1	db815a55-70a8-421e-ba4a-6efade18fc2a	Onni.ai Fortaleza	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
5b7952b9-515f-4b5a-a091-da3a42b541fb	db815a55-70a8-421e-ba4a-6efade18fc2a	Doutor-ai	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
16ab5232-b1fe-4262-ab3b-6a5b83841ec6	db815a55-70a8-421e-ba4a-6efade18fc2a	Siders	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
7e2d3d98-47b5-4f4d-a361-6e6547ad4416	db815a55-70a8-421e-ba4a-6efade18fc2a	Vycma	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
208aefaa-d93a-414c-84b3-c53666914995	db815a55-70a8-421e-ba4a-6efade18fc2a	Visttoriar	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
b647b78e-3e64-4505-9002-c2076f5f4a29	db815a55-70a8-421e-ba4a-6efade18fc2a	Smartts	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
1cda228a-800e-4e26-8b7b-4477ba210985	db815a55-70a8-421e-ba4a-6efade18fc2a	Reddi	\N	\N	\N	t	\N	2026-05-17 21:03:06.401897+00	2026-05-17 21:03:06.401897+00
33333333-3333-3333-3333-333333333333	22222222-2222-2222-2222-222222222222	IMTS Participações	26126033000176	Tecnologia	TI	t	\N	2026-05-17 22:13:02.516+00	2026-05-25 22:24:51.606525+00
\.


--
-- Data for Name: inventario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventario (id, org_id, empresa_id, nome, categoria, quantity, min_quantity, unit, unit_cost, location, supplier, sku, notes, created_at, updated_at) FROM stdin;
5b0ca10c-73f7-4aea-82d7-e1e07f7cf51c	700654e3-a545-43c7-be27-dc34d810c935	\N	Amplificador	Mídia	1	0	un	0	\N	FRAHM	\N	\N	2026-05-08 13:26:08.994811+00	2026-05-08 13:26:08.994811+00
c7b64e5c-8639-4215-bb12-d8a9ef99d70c	700654e3-a545-43c7-be27-dc34d810c935	\N	Mesa de som	Mídia	1	0	un	0	\N	MXT	\N	\N	2026-05-08 13:26:09.12953+00	2026-05-08 13:26:09.12953+00
e91e7dfd-50c2-469e-aae7-b6ba5967958c	700654e3-a545-43c7-be27-dc34d810c935	\N	Mesa de cenários	Mídia	1	0	un	0	\N	NEOiD	\N	\N	2026-05-08 13:26:09.262115+00	2026-05-08 13:26:09.262115+00
ade11641-a8e5-4735-9996-fb9c62b51ba3	700654e3-a545-43c7-be27-dc34d810c935	\N	Caixas de som	Mídia	4	0	un	0	\N	JBL	\N	\N	2026-05-08 13:26:09.659915+00	2026-05-08 13:26:09.659915+00
647f5ff6-3b0e-41cd-a0e1-92b5b1880422	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo RCA para P2	Mídia	3	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:09.792855+00	2026-05-08 13:26:09.792855+00
77de627b-8d36-42fe-8e8b-b86b537e0040	700654e3-a545-43c7-be27-dc34d810c935	\N	Splitter	Mídia	5	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:09.926459+00	2026-05-08 13:26:09.926459+00
19d65876-56ed-4d3f-ad86-80a95668a687	700654e3-a545-43c7-be27-dc34d810c935	\N	Switch	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:10.059085+00	2026-05-08 13:26:10.059085+00
66838e6e-e43f-4759-a162-4b932278fc03	700654e3-a545-43c7-be27-dc34d810c935	\N	Fone de ouvido	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:10.192501+00	2026-05-08 13:26:10.192501+00
71c2e113-3f20-42d7-860f-4809fbeecf88	700654e3-a545-43c7-be27-dc34d810c935	\N	Transmissor	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:10.32527+00	2026-05-08 13:26:10.32527+00
ecf8615b-215a-466d-b866-ae36b71cec16	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo P10 para P2 (estéreo)	Mídia	3	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:10.458049+00	2026-05-08 13:26:10.458049+00
f933df48-9f42-465f-b2a7-75f2ffa92665	700654e3-a545-43c7-be27-dc34d810c935	\N	PC Desktop	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:10.591017+00	2026-05-08 13:26:10.591017+00
45b283a8-97a5-4a98-8cb2-0622e7a7ff70	700654e3-a545-43c7-be27-dc34d810c935	\N	Walkie Talkie	Mídia	4	0	un	0	\N	Crasep	\N	\N	2026-05-08 13:26:10.7239+00	2026-05-08 13:26:10.7239+00
aca8d8f2-3664-4439-a9bc-fcdc1e46958a	700654e3-a545-43c7-be27-dc34d810c935	\N	Placa de captura HDMI x USB	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:10.856418+00	2026-05-08 13:26:10.856418+00
85088bb4-85b0-4c0b-a335-22e3daf7b948	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo DisplayPort	Mídia	2	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:10.989895+00	2026-05-08 13:26:10.989895+00
e9287299-375a-40be-8c1a-730f36eca61d	700654e3-a545-43c7-be27-dc34d810c935	\N	Conjunto de microfone	Mídia	4	0	un	0	\N	Onistek	\N	\N	2026-05-08 13:26:11.124824+00	2026-05-08 13:26:11.124824+00
f9d57c1b-636a-4231-a6ba-2f0620d4fc31	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo  HDMI	Mídia	11	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:11.257831+00	2026-05-08 13:26:11.257831+00
cbd7c58f-c971-473f-a416-17ce4d29bf8c	700654e3-a545-43c7-be27-dc34d810c935	\N	Mini conversor HD para AV	Mídia	2	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:11.390737+00	2026-05-08 13:26:11.390737+00
a940a12f-5ff6-44c1-a0f9-bd9538cb4c6c	700654e3-a545-43c7-be27-dc34d810c935	\N	Receptor de HDMI sem fio	Mídia	6	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:11.52337+00	2026-05-08 13:26:11.52337+00
0d80de67-c1bf-4b03-8522-dae920588cce	700654e3-a545-43c7-be27-dc34d810c935	\N	Placa de captura HDMI x HDMI	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:11.656317+00	2026-05-08 13:26:11.656317+00
35f9aa80-4c7d-407e-b4e8-f50a320b7e91	700654e3-a545-43c7-be27-dc34d810c935	\N	Microfone de lapela USB-C	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:11.789294+00	2026-05-08 13:26:11.789294+00
89b6aa85-1b51-49d8-ac4c-7e733ba12bf7	700654e3-a545-43c7-be27-dc34d810c935	\N	Smartcam UHD 4K	Mídia	1	0	un	0	\N	EMEET	\N	\N	2026-05-08 13:26:11.921972+00	2026-05-08 13:26:11.921972+00
45e401c3-a29f-4e88-b858-b863ed172cf1	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo de audio P2 para P2	Mídia	2	0	un	0	\N	Crasep	\N	\N	2026-05-08 13:26:12.055397+00	2026-05-08 13:26:12.055397+00
4467c52e-93d3-4de0-9045-bc37e9635537	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo USB macho e fêmea	Mídia	4	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:12.188565+00	2026-05-08 13:26:12.188565+00
2234b40f-48c3-4cb7-be95-cc5241220685	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo de audio P10 para P10	Mídia	2	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:12.321569+00	2026-05-08 13:26:12.321569+00
05021482-50ae-41e0-b994-15ba2dca85a3	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo USB-C para USB	Mídia	6	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:12.455898+00	2026-05-08 13:26:12.455898+00
8d28cfeb-a128-438e-81b2-2a31bb66f1b5	700654e3-a545-43c7-be27-dc34d810c935	\N	Adaptador P3 para fone e microfone	Mídia	2	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:12.588723+00	2026-05-08 13:26:12.588723+00
6ed2da89-8d38-4430-bb0e-0e775eb7f2a5	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo USB SS X USB SS	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:12.721679+00	2026-05-08 13:26:12.721679+00
6b128cbe-dd72-43f5-baf1-d4ad6d65026f	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo DisplayPort para HDMI	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:12.854422+00	2026-05-08 13:26:12.854422+00
6f9b4e6c-7977-4f83-87d8-fe541b0acbd7	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo de audio P2 para P2 (pequeno)	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:12.987179+00	2026-05-08 13:26:12.987179+00
4df39111-13e8-4097-badb-a0d8e3289f88	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo USB Mini-A (pequeno)	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:13.12081+00	2026-05-08 13:26:13.12081+00
e27138a8-760b-4e95-b6c4-067e96cd3340	700654e3-a545-43c7-be27-dc34d810c935	\N	Placa de som USB	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:13.253923+00	2026-05-08 13:26:13.253923+00
2164e37e-aeff-4bcc-9adc-d42ed31eb81e	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo USB Tipo-B	Mídia	4	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:13.386653+00	2026-05-08 13:26:13.386653+00
6d7b00b5-ae5a-4a71-bd03-3c9f816299ae	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo RCA (video)	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:13.520174+00	2026-05-08 13:26:13.520174+00
260dbf4c-3fe6-4473-acf0-43bd61c54f40	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo RCA (audio L e R)	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:13.653222+00	2026-05-08 13:26:13.653222+00
ed037ab0-c4bc-4005-b080-370e5c6cd749	700654e3-a545-43c7-be27-dc34d810c935	\N	Adaptador RCA para P2	Mídia	4	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:13.786202+00	2026-05-08 13:26:13.786202+00
30731639-57ef-4026-9f4b-f2d2d56c4f64	700654e3-a545-43c7-be27-dc34d810c935	\N	Adaptador P3 para P10	Mídia	2	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:13.919341+00	2026-05-08 13:26:13.919341+00
daa363b5-c378-4ebf-90bf-a864fb6bacfa	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo XLR	Mídia	2	0	un	0	\N	Santo Angelo	\N	\N	2026-05-08 13:26:14.052416+00	2026-05-08 13:26:14.052416+00
c70558d1-812d-4a1f-8db3-b16547607d25	700654e3-a545-43c7-be27-dc34d810c935	\N	SSD 1 TB	Mídia	1	0	un	0	\N	Sandisk	\N	\N	2026-05-08 13:26:14.185048+00	2026-05-08 13:26:14.185048+00
3bea2868-312f-4795-94f6-f71a486c50c1	700654e3-a545-43c7-be27-dc34d810c935	\N	Câmera PTZ	Mídia	2	0	un	0	\N	FREEWORLD	\N	\N	2026-05-08 13:26:14.317774+00	2026-05-08 13:26:14.317774+00
7f864c82-059a-4f8a-88ca-724a97ade4fe	700654e3-a545-43c7-be27-dc34d810c935	\N	Cabo RCA para P10	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:14.450688+00	2026-05-08 13:26:14.450688+00
613e8a89-bb8d-4454-b9db-07aabd4fc08d	700654e3-a545-43c7-be27-dc34d810c935	\N	Switch 5 portas	Mídia	1	0	un	0	\N	\N	\N	\N	2026-05-08 13:26:14.583365+00	2026-05-08 13:26:14.583365+00
dddddddd-dddd-dddd-dddd-dddddddddddd	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	Cabo rede Cat6 3m	Cabos	120	20	un	12.5	Armazém A	Furukawa	CAT6-3M	\N	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
fa9ca896-13f2-419a-bc9b-9d466ce5e6e6	700654e3-a545-43c7-be27-dc34d810c935	\N	Microfone headset	Áudio	2	0	un	0	\N	JWL Brasil	\N	\N	2026-05-08 13:26:09.527335+00	2026-05-21 18:05:18.009818+00
d3523611-f407-4482-a848-3fbf10f63005	700654e3-a545-43c7-be27-dc34d810c935	\N	Atem Mini Pro ISO Mesa de corte	Mídia	1	0	un	8000	\N	Blackmagicdesign	\N	\N	2026-05-08 13:26:09.394734+00	2026-05-21 18:41:34.335488+00
\.


--
-- Data for Name: inventario_movimentacoes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventario_movimentacoes (id, org_id, empresa_id, item_id, item_name, tipo, data, quantity, unit_cost, destination, reason, responsible, invoice, created_at) FROM stdin;
eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	dddddddd-dddd-dddd-dddd-dddddddddddd	Cabo rede Cat6 3m	Saída	2025-12-01	10	12.5	Operações TI	Reposição de stock	Ana Costa	\N	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: licencas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.licencas (id, org_id, empresa_id, nome, categoria, tipo, total_licencas, qtd_usuarios, custo_unitario, custo_mensal, data_renovacao, fornecedor, chave_ativacao, observacoes, responsavel_id, created_at, updated_at) FROM stdin;
b71b09d0-be73-4688-b83a-bd727b103b5e	700654e3-a545-43c7-be27-dc34d810c935	\N	Microsoft 365 Business Basic	Produtividade	Anual	12	12	32	384	2026-11-12	Scansource Brasil Distribuidora de Tecnologias	\N	Anual, pago mensalmente com desconto	\N	2026-05-05 17:56:56.33853+00	2026-05-05 17:56:56.33853+00
c4acdeae-699b-43f3-812e-362c2de96aea	700654e3-a545-43c7-be27-dc34d810c935	\N	Microsoft 365 Copilot	Produtividade	Anual	1	1	212.15	212.15	2026-07-09	Ingram Micro Brasil Ltda	\N	Anual, pago mensalmente com desconto	\N	2026-05-05 17:56:56.33853+00	2026-05-05 17:56:56.33853+00
b0c2caf0-1542-4a61-91f7-fef3bd698646	700654e3-a545-43c7-be27-dc34d810c935	\N	Microsoft 365 Business Standard	Produtividade	Mensal	70	69	72	4968	2026-05-14	Ingram Micro Brasil Ltda	\N	Renovação Mensal	\N	2026-05-05 17:56:56.33853+00	2026-05-05 17:57:35.090012+00
03ebe8e9-8af4-4690-9ce2-492c97db79ba	700654e3-a545-43c7-be27-dc34d810c935	\N	Office 365 E3 (no Teams)	Produtividade	Mensal	2	2	133.9	267.8	2026-05-15	Ingram Micro Brasil Ltda	\N	\N	\N	2026-05-05 18:01:22.642728+00	2026-05-05 18:01:22.642728+00
9dba8c92-d56b-4e92-8790-64d10ef3ca35	700654e3-a545-43c7-be27-dc34d810c935	\N	Microsoft Teams Enterprise	Produtividade	Mensal	2	2	33.92	67.84	2026-05-16	Ingram Micro Brasil Ltda	\N	\N	\N	2026-05-05 18:01:22.642728+00	2026-05-05 18:01:22.642728+00
5ed1012c-4359-4240-b872-fc01fdaa1893	700654e3-a545-43c7-be27-dc34d810c935	\N	Microsoft 365 Business Basic	Produtividade	Mensal	35	34	35	1190	2026-05-18	Scansource Brasil Distribuidora de Tecnologias	\N	Renovação Mensal	\N	2026-05-05 17:56:56.33853+00	2026-05-05 22:52:49.944338+00
5432a7c5-ff15-4573-a938-f309899f7926	700654e3-a545-43c7-be27-dc34d810c935	\N	CursorAI	Desenvolvimento	Mensal	9	9	200	1800	2026-05-09	Cursor	\N	\N	\N	2026-05-05 22:54:44.998758+00	2026-05-05 22:54:44.998758+00
cd390dcf-d45d-43a9-8f03-c2961dd44e65	700654e3-a545-43c7-be27-dc34d810c935	\N	ClickSign	Infraestrutura	Mensal	1	1	179	179	2026-05-11	ClickSign	\N	\N	\N	2026-05-05 23:42:20.612188+00	2026-05-05 23:42:20.612188+00
2dc58156-2cbb-49e1-824b-dbae76eeecc6	700654e3-a545-43c7-be27-dc34d810c935	\N	Adobe Acrobat Pro	Produtividade	Mensal	1	1	95	95	2026-05-07	Adobe	\N	\N	\N	2026-05-08 13:25:34.503959+00	2026-05-08 13:25:34.503959+00
3393a17a-1fdf-4cb4-abd9-da287fe343ac	700654e3-a545-43c7-be27-dc34d810c935	\N	Adobe Acrobat	Produtividade	Mensal	1	1	80	80	2026-05-13	Adobe	\N	\N	\N	2026-05-08 13:25:34.503959+00	2026-05-08 13:25:34.503959+00
977f102b-23c0-4b56-a78f-1c7d0afe5b23	700654e3-a545-43c7-be27-dc34d810c935	\N	Adobe Creative Cloud	Produtividade	Mensal	2	2	214	428	2026-05-10	Adobe	\N	\N	\N	2026-05-08 13:25:34.503959+00	2026-05-08 13:25:34.503959+00
\.


--
-- Data for Name: manutencoes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manutencoes (id, org_id, empresa_id, ativo_id, tipo, status, data_abertura, data_conclusao, custo, fornecedor, descricao, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: movimentacoes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movimentacoes (id, org_id, empresa_id, ativo_id, ativo_label, tipo, data, from_department, to_department, from_user, to_user, responsible, recipient, reason, notes, value, term_generated, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: orcamentos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orcamentos (id, org_id, empresa_id, year, category, cost_center, annual_budget, notes, created_at, updated_at) FROM stdin;
ffdf3dc8-c871-40a6-8414-dd63670f23a4	700654e3-a545-43c7-be27-dc34d810c935	\N	2026	Desenvolvimento	CC-120 TI Corporativo	30000	\N	2026-05-08 13:20:13.719686+00	2026-05-08 13:20:13.719686+00
9641d709-b34c-44e3-a62c-c141d2d5b130	700654e3-a545-43c7-be27-dc34d810c935	\N	2026	Design	CC-120 TI Corporativo	24000	\N	2026-05-08 13:20:39.334054+00	2026-05-08 13:20:39.334054+00
41c68205-bca4-4827-9d9c-f144cad8e298	700654e3-a545-43c7-be27-dc34d810c935	\N	2026	Segurança	CC-120 TI Corporativo	20000	\N	2026-05-08 13:23:38.945699+00	2026-05-08 13:23:38.945699+00
4c91ffb1-f986-4643-912a-5b20203f38cc	700654e3-a545-43c7-be27-dc34d810c935	\N	2026	Hardware	CC-120 TI Corporativo	30000	\N	2026-05-08 13:23:49.691261+00	2026-05-08 13:23:49.691261+00
e909f294-83da-4052-a9e2-650ec82141ca	700654e3-a545-43c7-be27-dc34d810c935	\N	2026	Domínios	CC-120 TI Corporativo	6000	\N	2026-05-08 13:24:17.694075+00	2026-05-08 13:24:17.694075+00
ba9c7c08-8f5e-4b74-a06f-420bf9bf9621	700654e3-a545-43c7-be27-dc34d810c935	\N	2026	Produtividade	CC-120 TI Corporativo	72000	\N	2026-05-08 13:25:35.633633+00	2026-05-08 13:25:35.633633+00
05270842-b467-41e1-a11b-da33a34e6a63	700654e3-a545-43c7-be27-dc34d810c935	\N	2026	Infraestrutura	CC-120 TI Corporativo	70000		2026-05-05 23:43:52.050795+00	2026-05-21 18:18:57.78818+00
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organizations (id, nome, cnpj, plano, created_at, updated_at) FROM stdin;
700654e3-a545-43c7-be27-dc34d810c935	IMTS Group	\N	free	2026-05-04 13:16:59.648682+00	2026-05-04 13:16:59.648682+00
db815a55-70a8-421e-ba4a-6efade18fc2a	adm	\N	standard	2026-05-17 21:03:06.208123+00	2026-05-17 21:03:06.208123+00
22222222-2222-2222-2222-222222222222	IMTS Holding Demo	00.000.000/0001-00	local	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: pagamentos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pagamentos (id, org_id, empresa_id, nome, categoria, competencia, valor, status, vencimento, data_pagamento, fornecedor, observacoes, referencia_id, created_at, updated_at) FROM stdin;
50505050-5050-5050-5050-505050505050	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	Fatura AWS Nov/25	servidor	2025-11	1180.50	pago	2025-11-10	2025-11-08	AWS	\N	\N	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
50505050-5050-5050-5050-505050505051	22222222-2222-2222-2222-222222222222	\N	Renovação domínio	dominio	2026-01	120	pago	2026-01-28	2026-05-18	Registro.br	\N	\N	2026-05-17 22:13:02.516082+00	2026-05-18 00:38:24.387144+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, user_id, org_id, email, nome, avatar_url, created_at, updated_at) FROM stdin;
9e7496db-4502-4c7b-846f-358562ded469	2006d9f9-72ef-48ad-8769-72ba07d459d1	700654e3-a545-43c7-be27-dc34d810c935	felipe.miranda@imts.com.br	João Felipe	\N	2026-05-04 13:16:59.648682+00	2026-05-04 13:16:59.648682+00
5279c524-e0ba-4c53-aa47-f94b52f1aae3	abf82c2e-d0a0-40d9-9067-264ad3fa904a	db815a55-70a8-421e-ba4a-6efade18fc2a	adm@adm.com	adm	\N	2026-05-17 21:03:06.208123+00	2026-05-17 21:03:06.208123+00
aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa	11111111-1111-1111-1111-111111111111	22222222-2222-2222-2222-222222222222	dev@local.imts	Utilizador Demo	\N	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: registros_acesso; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.registros_acesso (id, org_id, empresa_id, usuario_id, user_label, sistema, recurso, recurso_tipo, nivel_acesso, data_concessao, ultimo_acesso, data_revogacao, ativo, created_at, updated_at) FROM stdin;
30303030-3030-3030-3030-303030303030	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	55555555-5555-5555-5555-555555555555	Ana Costa	ERP	Módulo financeiro	módulo	Leitura	2025-01-10	2025-12-01	\N	t	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: riscos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.riscos (id, org_id, empresa_id, title, severity, owner, mitigation, created_at, updated_at) FROM stdin;
40404040-4040-4040-4040-404040404040	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	Chave API exposta em repositório	Alta	Segurança	Rotação de chaves + scan de segredos	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: servidores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.servidores (id, org_id, empresa_id, nome, provedor, tipo, regiao, ambiente, ip_publico, sistema_operacional, cpu, ram, armazenamento, status, uptime_pct, custo_mensal, finalidade, equipe_responsavel, contrato_fim, ultimo_backup, url_monitoramento, ssl_vencimento, observacoes, created_at, updated_at) FROM stdin;
612dc8e8-97ea-42c9-9a5f-aece779bcddb	700654e3-a545-43c7-be27-dc34d810c935	\N	ava-pmf-2026	AWS	Cloud Instance	sa-east-1 (São Paulo)	producao	\N	AWS S3	\N	\N	\N	Online	99.99	25	Armazenamento de objetos - Bucket S3	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | ARN: arn:aws:s3:::ava-pmf-2026 | Criação: 23/04/2026 | Região: sa-east-1	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
10995507-b489-4d99-83d7-646b16ab7b3c	700654e3-a545-43c7-be27-dc34d810c935	\N	vpc-0504e72d601b87634	AWS	Cloud Instance	us-east-2 (Ohio)	producao	172.31.0.0/16	AWS VPC	\N	\N	\N	Online	99.99	0	VPC padrão - Rede virtual isolada	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | VPC padrão | CIDR: 172.31.0.0/16 | State: available	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
36431181-fcc0-4ee4-8a15-ce2b54129f2e	700654e3-a545-43c7-be27-dc34d810c935	\N	Servidor VPS - Servidor VPS - SSD NVMe 5	Outro	Cloud Instance	RS	producao	149.56.245.10	Ubuntu 24.04.2 LTS	4 vCore	5GB	25GB SSD	Online	99.9	89.9	DB	Infra TI IMTS	2026-06-18	\N	https://www.avirahost.com.br/clientarea.php?action=productdetails&id=80945	\N	\N	2026-05-05 23:30:45.556826+00	2026-05-05 23:40:03.431164+00
9525ac02-9679-4887-98be-6693bec98bb1	700654e3-a545-43c7-be27-dc34d810c935	\N	Servidor VPS - Servidor VPS - SSD NVMe 5	Outro	VPS	RS	producao	51.222.150.107	Ubuntu 24.04.2 LTS	4 vCore	5GB	25GB SSD	Online	99.9	89.9	Backend	Infra TI IMTS	2026-06-18	\N	https://www.avirahost.com.br/clientarea.php?action=productdetails&id=80942	\N	\N	2026-05-05 23:23:47.284519+00	2026-05-05 23:40:30.938339+00
26a9b5eb-e5b1-4603-bfbd-e1b677c8018b	700654e3-a545-43c7-be27-dc34d810c935	\N	subnet-04230510a8e9362d6	AWS	Cloud Instance	us-east-2 (Ohio)	producao	172.31.32.0/20	AWS Subnet	\N	\N	\N	Online	99.99	0	Sub-rede VPC - Zona de disponibilidade us-east-2c	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | VPC: vpc-0504e72d601b87634 | AZ: us-east-2c | ARN: arn:aws:ec2:us-east-2:854408056639:subnet/subnet-04230510a8e9362d6	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
cc203bf5-dd38-4e57-bb33-aa63b6eca270	700654e3-a545-43c7-be27-dc34d810c935	\N	Servidor VPS - Servidor VPS - SSD NVMe 5	Outro	VPS	RS	producao	66.70.141.126	Ubuntu 24.04 LTS	4 vCore	5GB	25GB SSD	Online	99.9	89.9	IMTS	Infra TI	2026-06-11	2026-01-01	https://www.avirahost.com.br/clientarea.php?action=productdetails&id=80929	\N	\N	2026-05-05 23:17:25.482086+00	2026-05-05 23:40:53.500736+00
5b02ca1d-b5eb-4795-b461-a0aec4ac61dd	700654e3-a545-43c7-be27-dc34d810c935	\N	ava-fortaleza-2026	AWS	Cloud Instance	sa-east-1 (São Paulo)	producao	\N	AWS S3	\N	\N	S3 Standard	Online	99.99	25	Bucket S3 - Projeto AVA Fortaleza 2026	Infra TI	\N	\N	\N	\N	ARN: arn:aws:s3:::ava-fortaleza-2026 | Criado em 01/01/2026	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
990572b7-b75b-4461-94d6-9e63f1ee2eee	700654e3-a545-43c7-be27-dc34d810c935	\N	global-facilities-2025	AWS	Cloud Instance	us-east-1 (N. Virginia)	producao	\N	AWS S3	\N	\N	S3 Standard	Online	99.99	20	Bucket S3 - Global Facilities	Infra TI	\N	\N	\N	\N	ARN: arn:aws:s3:::global-facilities-2025 | Criado em 20/05/2025	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
9ca72fb0-9932-4bcd-bb7c-d4d151f575c8	700654e3-a545-43c7-be27-dc34d810c935	\N	hitmia-2026	AWS	Cloud Instance	us-east-1 (N. Virginia)	producao	\N	AWS S3	\N	\N	S3 Standard	Online	99.99	30	Bucket S3 - Projeto HITMIA 2026	Infra TI	\N	\N	\N	\N	ARN: arn:aws:s3:::hitmia-2026 | Criado em 16/01/2026	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
6279dfed-d3a5-4f64-bae8-add51be53940	700654e3-a545-43c7-be27-dc34d810c935	\N	imts-metodo-tron-backup-2025	AWS	Cloud Instance	us-east-1 (N. Virginia)	producao	\N	AWS S3	\N	\N	S3 Standard-IA	Online	99.99	35	Bucket S3 - Backup Método Tron	Infra TI	\N	\N	\N	\N	ARN: arn:aws:s3:::imts-metodo-tron-backup-2025 | Criado em 20/08/2025	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
0aeb9aca-0ced-4c3d-87ed-71dce44016a9	700654e3-a545-43c7-be27-dc34d810c935	\N	imts-metodo-tron-storage-2025	AWS	Cloud Instance	us-east-1 (N. Virginia)	producao	\N	AWS S3	\N	\N	S3 Standard	Online	99.99	40	Bucket S3 - Storage Método Tron	Infra TI	\N	\N	\N	\N	ARN: arn:aws:s3:::imts-metodo-tron-storage-2025 | Criado em 15/08/2025	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
7c3dfe5a-6413-4089-88af-4a42168f5e4f	700654e3-a545-43c7-be27-dc34d810c935	\N	subnet-0609a226c7829eb73	AWS	Cloud Instance	us-east-2 (Ohio)	producao	172.31.16.0/20	AWS Subnet	\N	\N	\N	Online	99.99	0	Sub-rede VPC - Zona de disponibilidade us-east-2b	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | VPC: vpc-0504e72d601b87634 | AZ: us-east-2b | ARN: arn:aws:ec2:us-east-2:854408056639:subnet/subnet-0609a226c7829eb73	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
206d1396-0603-49f6-bcb6-95417bfbadf1	700654e3-a545-43c7-be27-dc34d810c935	\N	Servidor VPS - Servidor VPS - SSD NVMe 5	Outro	VPS	RS	producao	51.222.135.169	Ubuntu 24.04 LTS	4 vCore	5GB	25GB SSD	Online	99.9	89.9	Dev	Infra TI IMTS	2026-06-11	\N	https://www.avirahost.com.br/clientarea.php?action=productdetails&id=80928	\N	\N	2026-05-05 23:12:12.70837+00	2026-05-05 23:20:14.942553+00
1e295455-1598-41b8-82a1-dc256d9f7519	700654e3-a545-43c7-be27-dc34d810c935	\N	Servidor VPS - Servidor VPS - SSD NVMe 16	Outro	VPS	RS	producao	192.99.110.190	Ubuntu 24.04.4 LTS	6 vCore	16GB	80GB SSD	Online	99.9	289.9	Prod	Infra TI IMTS	2026-06-19	2026-01-01	https://vps81016.cloudpublic.com.br/	\N	\N	2026-05-05 23:07:04.342791+00	2026-05-05 23:20:24.987815+00
7bf95cd2-d119-4570-b314-4012797728ef	700654e3-a545-43c7-be27-dc34d810c935	\N	Servidor VPS - Servidor VPS - SSD NVMe 16	Outro	VPS	RS	producao	144.217.217.170	Ubuntu Server 24.04 LTS	6 vCore	16GB	80GB	Online	99.9	289.9	Hitmia	Infra TI IMTS	2026-06-18	2026-01-01	https://www.avirahost.com.br/clientarea.php?action=productdetails&id=80943	2026-01-01	\N	2026-05-05 23:00:11.594026+00	2026-05-05 23:20:40.97746+00
988d6539-5fa4-4ab0-b2c5-9a0d4f5a741a	700654e3-a545-43c7-be27-dc34d810c935	\N	Servidor VPS - Servidor VPS - SSD NVMe 5	Outro	VPS	RS	producao	51.222.135.171	Ubuntu 24.04.2 LTS	4 vCore	5GB	25GB SSD	Online	99.9	89.9	Backend	Infra TI IMTS	2026-06-11	\N	https://www.avirahost.com.br/clientarea.php?action=productdetails&id=80942	\N	\N	2026-05-05 23:23:46.976306+00	2026-05-05 23:23:46.976306+00
5d3e9070-8713-4eb9-a0b4-8bf37d147686	700654e3-a545-43c7-be27-dc34d810c935	\N	subnet-09a42949306850b7c	AWS	Cloud Instance	us-east-2 (Ohio)	producao	172.31.0.0/20	AWS Subnet	\N	\N	\N	Online	99.99	0	Sub-rede VPC - Zona de disponibilidade us-east-2a	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | VPC: vpc-0504e72d601b87634 | AZ: us-east-2a | ARN: arn:aws:ec2:us-east-2:854408056639:subnet/subnet-09a42949306850b7c	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
6d1063de-b495-4ca1-856b-8d4a5bc4146e	700654e3-a545-43c7-be27-dc34d810c935	\N	imts-sig-backup-2025	AWS	Cloud Instance	us-east-1 (N. Virginia)	producao	\N	AWS S3	\N	\N	S3 Standard-IA	Online	99.99	35	Bucket S3 - Backup SIG	Infra TI	\N	\N	\N	\N	ARN: arn:aws:s3:::imts-sig-backup-2025 | Criado em 06/03/2025	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
93515259-9429-4a63-aea9-68aff8d39e57	700654e3-a545-43c7-be27-dc34d810c935	\N	imts-sig-storage-2025	AWS	Cloud Instance	us-east-1 (N. Virginia)	producao	\N	AWS S3	\N	\N	S3 Standard	Online	99.99	40	Bucket S3 - Storage SIG	Infra TI	\N	\N	\N	\N	ARN: arn:aws:s3:::imts-sig-storage-2025 | Criado em 06/03/2025	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
c29b239d-13cb-4bed-821e-5a096ceb74d6	700654e3-a545-43c7-be27-dc34d810c935	\N	metodo-tron-dev	AWS	Cloud Instance	us-east-1 (N. Virginia)	dev	\N	AWS S3	\N	\N	S3 Standard	Online	99.99	15	Bucket S3 - Ambiente DEV Método Tron	Desenvolvimento	\N	\N	\N	\N	ARN: arn:aws:s3:::metodo-tron-dev | Criado em 12/09/2025	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
59117744-041e-44df-8133-57ba89a4513d	700654e3-a545-43c7-be27-dc34d810c935	\N	s3-hitmia-2026	AWS	Cloud Instance	us-east-1 (N. Virginia)	producao	\N	AWS S3	\N	\N	S3 Standard	Online	99.99	30	Bucket S3 - HITMIA secundário	Infra TI	\N	\N	\N	\N	ARN: arn:aws:s3:::s3-hitmia-2026 | Criado em 17/01/2026	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
9dea2351-f8df-4a79-bf0a-5f06c7a3c05f	700654e3-a545-43c7-be27-dc34d810c935	\N	sig-dev-storage	AWS	Cloud Instance	us-east-1 (N. Virginia)	dev	\N	AWS S3	\N	\N	S3 Standard	Online	99.99	15	Bucket S3 - Storage DEV SIG	Desenvolvimento	\N	\N	\N	\N	ARN: arn:aws:s3:::sig-dev-storage | Criado em 25/04/2025	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
c105af2b-6958-425f-81dd-431505c755f6	700654e3-a545-43c7-be27-dc34d810c935	\N	vpc-default-us-east-1	AWS	Cloud Instance	us-east-1 (N. Virginia)	producao	172.31.0.0/16	AWS VPC	\N	\N	\N	Online	100	0	VPC Default - Rede Virtual Padrão	Infra TI	\N	\N	\N	\N	VPC ID: vpc-06c8bd49011c3f42d | CIDR: 172.31.0.0/16 | Default: true | State: available	2026-05-07 18:23:25.890569+00	2026-05-07 18:23:25.890569+00
2f9d95a6-6ee6-4a27-b0b1-081a339b1039	700654e3-a545-43c7-be27-dc34d810c935	\N	sg-05cf92bb49879d197	AWS	Cloud Instance	us-east-2 (Ohio)	producao	\N	AWS Security Group	\N	\N	\N	Online	99.99	0	Security Group padrão da VPC	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | VPC: vpc-0504e72d601b87634 | Nome: default | Descrição: default VPC security group	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
f37c29dd-9cea-4d9d-94f5-f8774f5228dd	700654e3-a545-43c7-be27-dc34d810c935	\N	igw-098297033d7f2554a	AWS	Cloud Instance	us-east-2 (Ohio)	producao	\N	AWS Internet Gateway	\N	\N	\N	Online	99.99	0	Gateway de internet anexado à VPC padrão	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | VPC anexada: vpc-0504e72d601b87634 | State: available	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
d2f2e949-adfe-46f3-af31-a4b0e2c2c03a	700654e3-a545-43c7-be27-dc34d810c935	\N	rtb-0669d89419c3ff78b	AWS	Cloud Instance	us-east-2 (Ohio)	producao	\N	AWS Route Table	\N	\N	\N	Online	99.99	0	Tabela de rotas principal da VPC	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | VPC: vpc-0504e72d601b87634 | Is Main: true	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
5f672b13-f37c-4fc5-89ed-083758011b16	700654e3-a545-43c7-be27-dc34d810c935	\N	AWSServiceRoleForResourceExplorer	AWS	Cloud Instance	Global	producao	\N	AWS IAM Role	\N	\N	\N	Online	99.99	0	Role IAM de serviço - Resource Explorer	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | ARN: arn:aws:iam::854408056639:role/aws-service-role/resource-explorer-2.amazonaws.com/AWSServiceRoleForResourceExplorer | Criação: 10/01/2026	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
1933b38d-54d2-47b5-b258-611bd75d7b4d	700654e3-a545-43c7-be27-dc34d810c935	\N	AWSServiceRoleForSupport	AWS	Cloud Instance	Global	producao	\N	AWS IAM Role	\N	\N	\N	Online	99.99	0	Role IAM de serviço - Support (billing, admin, support)	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | ARN: arn:aws:iam::854408056639:role/aws-service-role/support.amazonaws.com/AWSServiceRoleForSupport | Criação: 10/01/2026	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
d69b2896-16ec-4329-a936-028b047c55ea	700654e3-a545-43c7-be27-dc34d810c935	\N	AWSServiceRoleForTrustedAdvisor	AWS	Cloud Instance	Global	producao	\N	AWS IAM Role	\N	\N	\N	Online	99.99	0	Role IAM de serviço - Trusted Advisor	VYCMA TECH	\N	\N	\N	\N	Conta AWS: 854408056639 | ARN: arn:aws:iam::854408056639:role/aws-service-role/trustedadvisor.amazonaws.com/AWSServiceRoleForTrustedAdvisor | Criação: 10/01/2026	2026-05-07 18:54:41.14206+00	2026-05-07 18:54:41.14206+00
99999999-9999-9999-9999-999999999999	22222222-2222-2222-2222-222222222222	33333333-3333-3333-3333-333333333333	api-demo-01	AWS	t3.medium	sa-east-1	\N	203.0.113.10	Ubuntu 22.04	2 vCPU	4 GB	80 GB SSD	Online	99.9	320	API interna	\N	2026-12-31	\N	\N	2026-11-01	\N	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: termos_responsabilidade; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.termos_responsabilidade (id, org_id, empresa_id, ativo_id, usuario_id, data_assinatura, data_devolucao, pdf_url, observacoes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (id, user_id, org_id, role, created_at) FROM stdin;
8a6d579a-0144-443e-90cd-31d5ec23b36a	2006d9f9-72ef-48ad-8769-72ba07d459d1	700654e3-a545-43c7-be27-dc34d810c935	admin	2026-05-04 13:16:59.648682+00
f035cdff-285f-4bd5-bfba-3765147e35b0	abf82c2e-d0a0-40d9-9067-264ad3fa904a	db815a55-70a8-421e-ba4a-6efade18fc2a	admin	2026-05-17 21:03:06.208123+00
7eb46d44-a7da-48a4-b658-e8e5949a1975	11111111-1111-1111-1111-111111111111	22222222-2222-2222-2222-222222222222	admin	2026-05-17 22:13:02.516082+00
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, org_id, departamento_id, nome, email, cargo, ativo, empresa_id, created_at, updated_at) FROM stdin;
55555555-5555-5555-5555-555555555555	22222222-2222-2222-2222-222222222222	44444444-4444-4444-4444-444444444444	Ana Costa	ana.costa@local.imts	Analista	t	33333333-3333-3333-3333-333333333333	2026-05-17 22:13:02.516082+00	2026-05-17 22:13:02.516082+00
\.


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: acoes_economista acoes_economista_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoes_economista
    ADD CONSTRAINT acoes_economista_pkey PRIMARY KEY (id);


--
-- Name: alertas alertas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_pkey PRIMARY KEY (id);


--
-- Name: ativos ativos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ativos
    ADD CONSTRAINT ativos_pkey PRIMARY KEY (id);


--
-- Name: contratos contratos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_pkey PRIMARY KEY (id);


--
-- Name: departamentos departamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (id);


--
-- Name: dns_records dns_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_records
    ADD CONSTRAINT dns_records_pkey PRIMARY KEY (id);


--
-- Name: dominios dominios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dominios
    ADD CONSTRAINT dominios_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: inventario_movimentacoes inventario_movimentacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimentacoes
    ADD CONSTRAINT inventario_movimentacoes_pkey PRIMARY KEY (id);


--
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);


--
-- Name: licencas licencas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licencas
    ADD CONSTRAINT licencas_pkey PRIMARY KEY (id);


--
-- Name: manutencoes manutencoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes
    ADD CONSTRAINT manutencoes_pkey PRIMARY KEY (id);


--
-- Name: movimentacoes movimentacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentacoes
    ADD CONSTRAINT movimentacoes_pkey PRIMARY KEY (id);


--
-- Name: orcamentos orcamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orcamentos
    ADD CONSTRAINT orcamentos_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: pagamentos pagamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: registros_acesso registros_acesso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_acesso
    ADD CONSTRAINT registros_acesso_pkey PRIMARY KEY (id);


--
-- Name: riscos riscos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riscos
    ADD CONSTRAINT riscos_pkey PRIMARY KEY (id);


--
-- Name: servidores servidores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servidores
    ADD CONSTRAINT servidores_pkey PRIMARY KEY (id);


--
-- Name: termos_responsabilidade termos_responsabilidade_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.termos_responsabilidade
    ADD CONSTRAINT termos_responsabilidade_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_ativos_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ativos_empresa ON public.ativos USING btree (empresa_id);


--
-- Name: idx_ativos_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ativos_org ON public.ativos USING btree (org_id);


--
-- Name: idx_dominios_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dominios_empresa ON public.dominios USING btree (empresa_id);


--
-- Name: idx_dominios_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dominios_org ON public.dominios USING btree (org_id);


--
-- Name: idx_empresas_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresas_org ON public.empresas USING btree (org_id);


--
-- Name: idx_licencas_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licencas_empresa ON public.licencas USING btree (empresa_id);


--
-- Name: idx_licencas_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licencas_org ON public.licencas USING btree (org_id);


--
-- Name: idx_manutencoes_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manutencoes_empresa ON public.manutencoes USING btree (empresa_id);


--
-- Name: idx_manutencoes_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manutencoes_org ON public.manutencoes USING btree (org_id);


--
-- Name: idx_pagamentos_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_empresa ON public.pagamentos USING btree (empresa_id);


--
-- Name: idx_pagamentos_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_org ON public.pagamentos USING btree (org_id);


--
-- Name: idx_servidores_empresa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_servidores_empresa ON public.servidores USING btree (empresa_id);


--
-- Name: idx_servidores_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_servidores_org ON public.servidores USING btree (org_id);


--
-- Name: acoes_economista trg_acoes_economista_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_acoes_economista_updated_at BEFORE UPDATE ON public.acoes_economista FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ativos trg_ativos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ativos_updated_at BEFORE UPDATE ON public.ativos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contratos trg_contratos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departamentos trg_departamentos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_departamentos_updated_at BEFORE UPDATE ON public.departamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dns_records trg_dns_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dns_records_updated_at BEFORE UPDATE ON public.dns_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dominios trg_dominios_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dominios_updated_at BEFORE UPDATE ON public.dominios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: empresas trg_empresas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventario trg_inventario_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inventario_updated_at BEFORE UPDATE ON public.inventario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: licencas trg_licencas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_licencas_updated_at BEFORE UPDATE ON public.licencas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: manutencoes trg_manutencoes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_manutencoes_updated_at BEFORE UPDATE ON public.manutencoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: movimentacoes trg_movimentacoes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_movimentacoes_updated_at BEFORE UPDATE ON public.movimentacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orcamentos trg_orcamentos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_orcamentos_updated_at BEFORE UPDATE ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations trg_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pagamentos trg_pagamentos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pagamentos_updated_at BEFORE UPDATE ON public.pagamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: registros_acesso trg_registros_acesso_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_registros_acesso_updated_at BEFORE UPDATE ON public.registros_acesso FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: riscos trg_riscos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_riscos_updated_at BEFORE UPDATE ON public.riscos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: servidores trg_servidores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_servidores_updated_at BEFORE UPDATE ON public.servidores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: termos_responsabilidade trg_termos_responsabilidade_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_termos_responsabilidade_updated_at BEFORE UPDATE ON public.termos_responsabilidade FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: usuarios trg_usuarios_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: acoes_economista acoes_economista_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoes_economista
    ADD CONSTRAINT acoes_economista_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: acoes_economista acoes_economista_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoes_economista
    ADD CONSTRAINT acoes_economista_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: alertas alertas_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: alertas alertas_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ativos ativos_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ativos
    ADD CONSTRAINT ativos_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE SET NULL;


--
-- Name: ativos ativos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ativos
    ADD CONSTRAINT ativos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: ativos ativos_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ativos
    ADD CONSTRAINT ativos_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ativos ativos_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ativos
    ADD CONSTRAINT ativos_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: contratos contratos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: contratos contratos_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos
    ADD CONSTRAINT contratos_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: departamentos departamentos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: departamentos departamentos_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: dns_records dns_records_dominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_records
    ADD CONSTRAINT dns_records_dominio_id_fkey FOREIGN KEY (dominio_id) REFERENCES public.dominios(id) ON DELETE CASCADE;


--
-- Name: dns_records dns_records_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_records
    ADD CONSTRAINT dns_records_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: dns_records dns_records_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dns_records
    ADD CONSTRAINT dns_records_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: dominios dominios_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dominios
    ADD CONSTRAINT dominios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: dominios dominios_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dominios
    ADD CONSTRAINT dominios_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: empresas empresas_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: inventario inventario_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: inventario_movimentacoes inventario_movimentacoes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimentacoes
    ADD CONSTRAINT inventario_movimentacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: inventario_movimentacoes inventario_movimentacoes_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimentacoes
    ADD CONSTRAINT inventario_movimentacoes_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventario(id) ON DELETE CASCADE;


--
-- Name: inventario_movimentacoes inventario_movimentacoes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimentacoes
    ADD CONSTRAINT inventario_movimentacoes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: inventario inventario_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: licencas licencas_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licencas
    ADD CONSTRAINT licencas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: licencas licencas_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licencas
    ADD CONSTRAINT licencas_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: licencas licencas_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licencas
    ADD CONSTRAINT licencas_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: manutencoes manutencoes_ativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes
    ADD CONSTRAINT manutencoes_ativo_id_fkey FOREIGN KEY (ativo_id) REFERENCES public.ativos(id) ON DELETE CASCADE;


--
-- Name: manutencoes manutencoes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes
    ADD CONSTRAINT manutencoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: manutencoes manutencoes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes
    ADD CONSTRAINT manutencoes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: movimentacoes movimentacoes_ativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentacoes
    ADD CONSTRAINT movimentacoes_ativo_id_fkey FOREIGN KEY (ativo_id) REFERENCES public.ativos(id) ON DELETE CASCADE;


--
-- Name: movimentacoes movimentacoes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentacoes
    ADD CONSTRAINT movimentacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: movimentacoes movimentacoes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentacoes
    ADD CONSTRAINT movimentacoes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: orcamentos orcamentos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orcamentos
    ADD CONSTRAINT orcamentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: orcamentos orcamentos_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orcamentos
    ADD CONSTRAINT orcamentos_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: pagamentos pagamentos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: pagamentos pagamentos_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: registros_acesso registros_acesso_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_acesso
    ADD CONSTRAINT registros_acesso_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: registros_acesso registros_acesso_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_acesso
    ADD CONSTRAINT registros_acesso_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: registros_acesso registros_acesso_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_acesso
    ADD CONSTRAINT registros_acesso_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: riscos riscos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riscos
    ADD CONSTRAINT riscos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: riscos riscos_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riscos
    ADD CONSTRAINT riscos_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: servidores servidores_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servidores
    ADD CONSTRAINT servidores_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: servidores servidores_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servidores
    ADD CONSTRAINT servidores_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: termos_responsabilidade termos_responsabilidade_ativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.termos_responsabilidade
    ADD CONSTRAINT termos_responsabilidade_ativo_id_fkey FOREIGN KEY (ativo_id) REFERENCES public.ativos(id) ON DELETE CASCADE;


--
-- Name: termos_responsabilidade termos_responsabilidade_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.termos_responsabilidade
    ADD CONSTRAINT termos_responsabilidade_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: termos_responsabilidade termos_responsabilidade_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.termos_responsabilidade
    ADD CONSTRAINT termos_responsabilidade_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: termos_responsabilidade termos_responsabilidade_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.termos_responsabilidade
    ADD CONSTRAINT termos_responsabilidade_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE SET NULL;


--
-- Name: usuarios usuarios_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL;


--
-- Name: usuarios usuarios_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 4gDBpUFfX7hcnChdKJ9kuhOIBCFXGPvcW6KDZGRCUGD8crQdAkb0vXwTo6bJxOR

