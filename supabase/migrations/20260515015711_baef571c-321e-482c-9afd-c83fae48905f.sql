-- Tabela central de Empresas da holding
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cnpj TEXT,
  segmento TEXT,
  responsavel TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read empresas" ON public.empresas FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org members insert empresas" ON public.empresas FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members update empresas" ON public.empresas FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members delete empresas" ON public.empresas FOR DELETE TO authenticated USING (org_id = current_org_id());

CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar empresa_id a todos os módulos
ALTER TABLE public.ativos                  ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.licencas                ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.dominios                ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.servidores              ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.manutencoes             ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.movimentacoes           ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.pagamentos              ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.contratos               ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.inventario              ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.inventario_movimentacoes ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.registros_acesso        ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.riscos                  ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.orcamentos              ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.acoes_economista        ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.termos_responsabilidade ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.usuarios                ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.departamentos           ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.dns_records             ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.alertas                 ADD COLUMN IF NOT EXISTS empresa_id UUID;

-- Índices para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_ativos_empresa     ON public.ativos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_licencas_empresa   ON public.licencas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dominios_empresa   ON public.dominios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_servidores_empresa ON public.servidores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa ON public.pagamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_empresa ON public.manutencoes(empresa_id);