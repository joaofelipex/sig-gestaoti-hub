CREATE TABLE public.dns_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  dominio_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'A',
  nome TEXT NOT NULL DEFAULT '@',
  valor TEXT NOT NULL,
  ttl INTEGER NOT NULL DEFAULT 3600,
  prioridade INTEGER,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_dns_records_dominio ON public.dns_records(dominio_id);
CREATE INDEX idx_dns_records_org ON public.dns_records(org_id);

ALTER TABLE public.dns_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read dns_records" ON public.dns_records FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org members insert dns_records" ON public.dns_records FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members update dns_records" ON public.dns_records FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org members delete dns_records" ON public.dns_records FOR DELETE TO authenticated USING (org_id = current_org_id());

CREATE TRIGGER update_dns_records_updated_at BEFORE UPDATE ON public.dns_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();