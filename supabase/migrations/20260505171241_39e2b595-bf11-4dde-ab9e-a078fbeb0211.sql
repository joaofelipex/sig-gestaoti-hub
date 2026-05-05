
ALTER TABLE public.ativos 
  ADD COLUMN IF NOT EXISTS warranty_end date,
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS department_nome text,
  ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS maintenance_log jsonb DEFAULT '[]'::jsonb;
