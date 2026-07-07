#!/usr/bin/env bash
# Aplica dados de demonstração (database/init/02_seed.sql) ao Postgres do Docker (porta HOST_PG_PORT).
set -eu
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_PG_PORT="${HOST_PG_PORT:-5432}"
export PGPASSWORD="${LOCAL_POSTGRES_PASSWORD:-postgres}"
SQL="$ROOT/database/init/02_seed.sql"

if [ ! -f "$SQL" ]; then
  echo "Ficheiro em falta: $SQL" >&2
  exit 1
fi

AUTH_SQL="$ROOT/database/init/03_api_auth.sql"
echo ">> A aplicar seed em 127.0.0.1:${HOST_PG_PORT}/sig_gestao_ti ..."
psql "postgresql://postgres@127.0.0.1:${HOST_PG_PORT}/sig_gestao_ti" -v ON_ERROR_STOP=1 -f "$SQL"
if [ -f "$AUTH_SQL" ]; then
  psql "postgresql://postgres@127.0.0.1:${HOST_PG_PORT}/sig_gestao_ti" -v ON_ERROR_STOP=1 -f "$AUTH_SQL"
fi
echo ">> Seed concluído. Login: dev@local.imts / demo123456"
