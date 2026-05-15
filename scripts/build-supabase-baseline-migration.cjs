/**
 * Gera supabase/migrations/20260101000000_baseline_public_schema.sql a partir de
 * database/init/01_schema.sql (sem recriar auth.users — o GoTrue do Supabase gere isso).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'database', 'init', '01_schema.sql');
const dest = path.join(
  root,
  'supabase',
  'migrations',
  '20260101000000_baseline_public_schema.sql'
);

const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const out = [];
// Linhas 16–31 (1-based): enums + update_updated_at
for (let i = 15; i <= 30 && i < lines.length; i++) out.push(lines[i]);
// Linhas 42–524: a partir de "-- Core" (omitir stub current_org_id linhas 33–40)
for (let i = 41; i < lines.length; i++) out.push(lines[i]);

const footer = `
-- RLS em empresas (migração posterior) usa org do perfil do utilizador autenticado.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.org_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;
`;

const header = `-- Baseline schema public (SIG Heartbeat Hub). auth.users pertence ao GoTrue; não recriar aqui.
-- Gerado por scripts/build-supabase-baseline-migration.cjs — editar 01_schema.sql e voltar a gerar.

`;

fs.writeFileSync(dest, header + out.join('\n') + footer, 'utf8');
console.log('Wrote', path.relative(root, dest));
