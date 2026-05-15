/**
 * Gera `database/migrations/20260101000000_baseline_public_schema.sql` a partir de
 * `database/init/01_schema.sql` (exclui o bloco mínimo de auth.users em 01).
 * O rodapé define `current_org_id()` como stub (igual ao init Docker), sem `auth.uid()`.
 *
 * Uso: npm run db:gen-baseline
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'database', 'init', '01_schema.sql');
const dest = path.join(root, 'database', 'migrations', '20260101000000_baseline_public_schema.sql');

if (!fs.existsSync(src)) {
  console.error('Em falta:', src);
  process.exit(1);
}

const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const out = [];
for (let i = 15; i <= 30 && i < lines.length; i++) out.push(lines[i]);
for (let i = 41; i < lines.length; i++) out.push(lines[i]);

const header = `-- Baseline público (gerado). Fonte: database/init/01_schema.sql
-- Não editar à mão: altera 01_schema.sql e corre npm run db:gen-baseline
-- O Docker continua a usar só database/init/*.sql na primeira subida; este ficheiro serve de referência / APPLY_BASELINE.

`;

const footer = `
-- Alinhado com o stub em database/init/01_schema.sql (stack API + Postgres local).
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULL::uuid;
$$;
`;

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, header + out.join('\n') + footer, 'utf8');
console.log('OK:', path.relative(root, dest), '(' + fs.statSync(dest).size + ' bytes)');
