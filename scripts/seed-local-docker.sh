#!/usr/bin/env bash
# Aplica dados de demonstração (database/init/02_seed.sql) ao Postgres do Docker (porta HOST_PG_PORT).
set -eu
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_PG_PORT="${HOST_PG_PORT:-5433}"
export PGPASSWORD="${LOCAL_POSTGRES_PASSWORD:-postgres}"
SQL="$ROOT/database/init/02_seed.sql"

if [ ! -f "$SQL" ]; then
  echo "Ficheiro em falta: $SQL" >&2
  exit 1
fi

echo ">> A aplicar seed em 127.0.0.1:${HOST_PG_PORT}/sig_heartbeat_hub ..."
psql "postgresql://postgres@127.0.0.1:${HOST_PG_PORT}/sig_heartbeat_hub" -v ON_ERROR_STOP=1 -f "$SQL"
echo ">> Seed concluído. Utilizador demo: dev@local.imts (criar sessão no Auth local ou usar este user_id em testes)."
