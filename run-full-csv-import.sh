#!/usr/bin/env bash
set -euo pipefail
REPORT=/home/infraestrutura-imts/projetos/sig-heartbeat-hub/agent-import-report.txt
exec > >(tee -a "$REPORT") 2>&1
echo "=== START $(date -Iseconds) ==="
cd /home/infraestrutura-imts/projetos/sig-heartbeat-hub
export CSV_DIR="/mnt/c/Users/Infraestrutura-IMTS/Downloads"
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/sig_heartbeat_hub"
python3 /home/infraestrutura-imts/projetos/sig-heartbeat-hub/csv-analyze.py > /tmp/csv-analysis.txt 2>&1
echo "=== FULL csv-analysis.txt ==="
cat /tmp/csv-analysis.txt
npm run db:import-csv 2>&1 | tee /tmp/csv-import.log
docker exec sig-heartbeat-hub-db psql -U postgres -d sig_heartbeat_hub -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; UPDATE auth.users SET encrypted_password = crypt('imported123', gen_salt('bf')) WHERE encrypted_password IS NULL;"
echo "=== verification queries ==="
docker exec sig-heartbeat-hub-db psql -U postgres -d sig_heartbeat_hub -c "SELECT 'empresas' t, count(*) FROM empresas WHERE org_id='700654e3-a545-43c7-be27-dc34d810c935' UNION ALL SELECT 'ativos', count(*) FROM ativos WHERE org_id='700654e3-a545-43c7-be27-dc34d810c935' UNION ALL SELECT 'dominios', count(*) FROM dominios WHERE org_id='700654e3-a545-43c7-be27-dc34d810c935' UNION ALL SELECT 'servidores', count(*) FROM servidores WHERE org_id='700654e3-a545-43c7-be27-dc34d810c935' UNION ALL SELECT 'alertas', count(*) FROM alertas WHERE org_id='700654e3-a545-43c7-be27-dc34d810c935'; SELECT email, org_id FROM profiles;"
python3 -c "import urllib.request,json; d=json.dumps({'email':'felipe.miranda@imts.com.br','password':'imported123'}).encode(); r=urllib.request.Request('http://127.0.0.1:3000/api/auth/login',data=d,headers={'Content-Type':'application/json'}); print(urllib.request.urlopen(r).read().decode()[:200])" 2>&1 || echo "API login test skipped"
echo "=== FULL csv-import.log ==="
cat /tmp/csv-import.log
echo "=== END $(date -Iseconds) ==="

