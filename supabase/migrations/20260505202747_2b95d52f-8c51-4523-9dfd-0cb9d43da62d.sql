
-- Tabela de orçamentos da Visão Economista
CREATE TABLE public.orcamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  cost_center TEXT NOT NULL,
  annual_budget NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read orcamentos" ON public.orcamentos FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org members insert orcamentos" ON public.orcamentos FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members update orcamentos" ON public.orcamentos FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members delete orcamentos" ON public.orcamentos FOR DELETE TO authenticated USING (org_id = current_org_id());
CREATE TRIGGER trg_orcamentos_updated BEFORE UPDATE ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de plano de ação
CREATE TABLE public.acoes_economista (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Licenças',
  priority TEXT NOT NULL DEFAULT 'Média',
  effort TEXT NOT NULL DEFAULT 'Médio',
  estimated_savings NUMERIC NOT NULL DEFAULT 0,
  owner TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.acoes_economista ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read acoes" ON public.acoes_economista FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org members insert acoes" ON public.acoes_economista FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members update acoes" ON public.acoes_economista FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members delete acoes" ON public.acoes_economista FOR DELETE TO authenticated USING (org_id = current_org_id());
CREATE TRIGGER trg_acoes_updated BEFORE UPDATE ON public.acoes_economista FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de riscos de governança
CREATE TABLE public.riscos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Média',
  owner TEXT,
  mitigation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.riscos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read riscos" ON public.riscos FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org members insert riscos" ON public.riscos FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members update riscos" ON public.riscos FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members delete riscos" ON public.riscos FOR DELETE TO authenticated USING (org_id = current_org_id());
CREATE TRIGGER trg_riscos_updated BEFORE UPDATE ON public.riscos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
