
CREATE TYPE public.pagamento_status AS ENUM ('pendente', 'pago', 'atrasado');
CREATE TYPE public.pagamento_categoria AS ENUM ('servidor', 'licenca', 'dominio', 'contrato', 'outro');

CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  categoria public.pagamento_categoria NOT NULL,
  referencia_id UUID,
  nome TEXT NOT NULL,
  fornecedor TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  competencia DATE NOT NULL,
  vencimento DATE,
  data_pagamento DATE,
  status public.pagamento_status NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagamentos_org_competencia ON public.pagamentos(org_id, competencia);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read pagamentos" ON public.pagamentos
  FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org members insert pagamentos" ON public.pagamentos
  FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members update pagamentos" ON public.pagamentos
  FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members delete pagamentos" ON public.pagamentos
  FOR DELETE TO authenticated USING (org_id = current_org_id());

CREATE TRIGGER pagamentos_updated_at
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
