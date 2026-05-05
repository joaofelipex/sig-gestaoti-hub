
-- MOVIMENTACOES
CREATE TABLE IF NOT EXISTS public.movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  ativo_id uuid NOT NULL,
  ativo_label text,
  tipo text NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  from_user text,
  from_department text,
  to_user text,
  to_department text,
  reason text,
  responsible text,
  value numeric DEFAULT 0,
  recipient text,
  term_generated boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read movimentacoes" ON public.movimentacoes FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org members insert movimentacoes" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members update movimentacoes" ON public.movimentacoes FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members delete movimentacoes" ON public.movimentacoes FOR DELETE TO authenticated USING (org_id = current_org_id());

-- INVENTARIO
CREATE TABLE IF NOT EXISTS public.inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'Outros',
  sku text,
  unit text NOT NULL DEFAULT 'un',
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  location text,
  supplier text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read inventario" ON public.inventario FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org members insert inventario" ON public.inventario FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members update inventario" ON public.inventario FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members delete inventario" ON public.inventario FOR DELETE TO authenticated USING (org_id = current_org_id());

-- INVENTARIO MOVIMENTACOES
CREATE TABLE IF NOT EXISTS public.inventario_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  item_id uuid NOT NULL,
  item_name text,
  tipo text NOT NULL,
  quantity integer NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  responsible text,
  destination text,
  reason text,
  invoice text,
  unit_cost numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventario_movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read inv_mov" ON public.inventario_movimentacoes FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org members insert inv_mov" ON public.inventario_movimentacoes FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members update inv_mov" ON public.inventario_movimentacoes FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members delete inv_mov" ON public.inventario_movimentacoes FOR DELETE TO authenticated USING (org_id = current_org_id());

-- CONTRATOS
CREATE TABLE IF NOT EXISTS public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  supplier text NOT NULL,
  object text NOT NULL,
  type text NOT NULL DEFAULT 'OPEX',
  cost_center text,
  monthly_cost numeric NOT NULL DEFAULT 0,
  end_date date,
  status text NOT NULL DEFAULT 'Ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read contratos" ON public.contratos FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org members insert contratos" ON public.contratos FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members update contratos" ON public.contratos FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members delete contratos" ON public.contratos FOR DELETE TO authenticated USING (org_id = current_org_id());

-- REGISTROS_ACESSO: campos auxiliares texto livre
ALTER TABLE public.registros_acesso
  ADD COLUMN IF NOT EXISTS user_label text,
  ADD COLUMN IF NOT EXISTS recurso text,
  ADD COLUMN IF NOT EXISTS recurso_tipo text,
  ADD COLUMN IF NOT EXISTS ultimo_acesso date;

-- usuario_id deve ser opcional para acessos avulsos
ALTER TABLE public.registros_acesso ALTER COLUMN usuario_id DROP NOT NULL;
