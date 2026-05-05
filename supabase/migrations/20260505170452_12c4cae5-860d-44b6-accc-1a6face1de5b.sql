
-- Servidores: adicionar campos faltantes
ALTER TABLE public.servidores
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS regiao TEXT,
  ADD COLUMN IF NOT EXISTS sistema_operacional TEXT,
  ADD COLUMN IF NOT EXISTS cpu TEXT,
  ADD COLUMN IF NOT EXISTS ram TEXT,
  ADD COLUMN IF NOT EXISTS armazenamento TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Online',
  ADD COLUMN IF NOT EXISTS finalidade TEXT,
  ADD COLUMN IF NOT EXISTS equipe_responsavel TEXT,
  ADD COLUMN IF NOT EXISTS contrato_fim DATE,
  ADD COLUMN IF NOT EXISTS ultimo_backup DATE,
  ADD COLUMN IF NOT EXISTS ssl_vencimento DATE,
  ADD COLUMN IF NOT EXISTS url_monitoramento TEXT;

-- Domínios: adicionar campos faltantes
ALTER TABLE public.dominios
  ADD COLUMN IF NOT EXISTS dns_provider TEXT,
  ADD COLUMN IF NOT EXISTS hosting_provider TEXT,
  ADD COLUMN IF NOT EXISTS custo_renovacao NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_renovacao BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Ativo';

-- Licenças: adicionar campos faltantes
ALTER TABLE public.licencas
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'Produtividade',
  ADD COLUMN IF NOT EXISTS total_licencas INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS chave_ativacao TEXT,
  ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC NOT NULL DEFAULT 0;
