CREATE INDEX IF NOT EXISTS idx_contratos_org ON public.contratos (org_id);
CREATE INDEX IF NOT EXISTS idx_contratos_empresa ON public.contratos (empresa_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_org ON public.movimentacoes (org_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_empresa ON public.movimentacoes (empresa_id);

CREATE INDEX IF NOT EXISTS idx_inventario_org ON public.inventario (org_id);
CREATE INDEX IF NOT EXISTS idx_inventario_empresa ON public.inventario (empresa_id);

CREATE INDEX IF NOT EXISTS idx_alertas_org ON public.alertas (org_id);
CREATE INDEX IF NOT EXISTS idx_alertas_empresa ON public.alertas (empresa_id);

CREATE INDEX IF NOT EXISTS idx_orcamentos_org ON public.orcamentos (org_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_empresa ON public.orcamentos (empresa_id);

CREATE INDEX IF NOT EXISTS idx_acoes_economista_org ON public.acoes_economista (org_id);
CREATE INDEX IF NOT EXISTS idx_acoes_economista_empresa ON public.acoes_economista (empresa_id);

CREATE INDEX IF NOT EXISTS idx_registros_acesso_org ON public.registros_acesso (org_id);
CREATE INDEX IF NOT EXISTS idx_registros_acesso_empresa ON public.registros_acesso (empresa_id);

CREATE INDEX IF NOT EXISTS idx_riscos_org ON public.riscos (org_id);
CREATE INDEX IF NOT EXISTS idx_riscos_empresa ON public.riscos (empresa_id);