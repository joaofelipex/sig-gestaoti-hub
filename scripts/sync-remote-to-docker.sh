#!/usr/bin/env bash
# Copia dados de um Postgres remoto (URI em REMOTE_DATABASE_URL) para o Postgres local no Docker (porta HOST_PG_PORT).
#
# Pré-requisitos:
#   - Cliente Postgres: pg_dump, pg_restore, psql (ex.: sudo apt install postgresql-client)
#   - Postgres local a correr: npm run db:up
#   - Schema local alinhado ao remoto (recomendado: npm run db:reset antes)
#
# Variáveis (ficheiro .env na raiz do repo ou export manual):
#   REMOTE_DATABASE_URL  — URI do Postgres remoto (sslmode=require se for na nuvem)
#
# Opcional:
#   HOST_PG_PORT=5433
#   FULL_PUBLIC_SCHEMA=1  — em vez de só dados, faz dump+restore do schema public completo
#
set -eu
set -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
fi

REMOTE="${REMOTE_DATABASE_URL:-}"
if [ -z "${REMOTE:-}" ]; then
  echo "Erro: defina REMOTE_DATABASE_URL no ficheiro .env na raiz (ver .env.example)." >&2
  exit 1
fi

for cmd in pg_dump pg_restore psql; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Erro: o comando '$cmd' não está instalado. Em Ubuntu/WSL: sudo apt install -y postgresql-client" >&2
    exit 1
  }
done

HOST_PG_PORT="${HOST_PG_PORT:-5433}"
LOCAL_URL="postgresql://postgres:${LOCAL_POSTGRES_PASSWORD:-postgres}@127.0.0.1:${HOST_PG_PORT}/sig_gestao_ti?sslmode=disable"
export PGPASSWORD="${LOCAL_POSTGRES_PASSWORD:-postgres}"

echo ">> A verificar Postgres local (127.0.0.1:${HOST_PG_PORT})..."
if ! psql "$LOCAL_URL" -v ON_ERROR_STOP=1 -qAtc "SELECT 1" >/dev/null 2>&1; then
  echo "Erro: não foi possível ligar ao Postgres local. Corre primeiro: npm run db:up" >&2
  exit 1
fi

TMPDIR="${TMPDIR:-/tmp}"
DUMP_DATA="${TMPDIR}/sig-hb-public-data-$$.dump"
DUMP_FULL="${TMPDIR}/sig-hb-public-full-$$.dump"

cleanup() {
  rm -f "$DUMP_DATA" "$DUMP_FULL" 2>/dev/null || true
}
trap cleanup EXIT

if [ "${FULL_PUBLIC_SCHEMA:-0}" = "1" ]; then
  echo ">> Modo FULL_PUBLIC_SCHEMA: dump do schema public (estrutura + dados) a partir do remoto..."
  echo ">> A copiar auth.users (id, email, created_at) antes do restore public..."
  psql "$LOCAL_URL" -v ON_ERROR_STOP=1 -qX -c "TRUNCATE auth.users CASCADE" >/dev/null || true
  if ! psql "$REMOTE" -v ON_ERROR_STOP=1 -qX -c "COPY (SELECT id, email, created_at FROM auth.users) TO STDOUT" \
    | psql "$LOCAL_URL" -v ON_ERROR_STOP=1 -qX -c "COPY auth.users (id, email, created_at) FROM STDIN"; then
    echo "Aviso: cópia de auth.users falhou; o restore public pode falhar em FKs para auth.users." >&2
  fi

  pg_dump "$REMOTE" \
    --schema=public \
    --no-owner \
    --no-acl \
    --no-publications \
    --no-subscriptions \
    -Fc \
    -f "$DUMP_FULL"

  echo ">> A restaurar no local ( --clean apaga objetos public existentes no dump )..."
  set +e
  pg_restore -h 127.0.0.1 -p "$HOST_PG_PORT" -U postgres -d sig_gestao_ti \
    --clean --if-exists --no-owner --no-acl --verbose "$DUMP_FULL" 2>&1
  RC=$?
  set -e
  if [ "$RC" -gt 1 ]; then
    echo "pg_restore terminou com código $RC (1 = avisos frequentes)." >&2
    exit "$RC"
  fi
else
  echo ">> 1/4 A limpar auth.users no local (CASCADE remove linhas dependentes, ex. profiles)..."
  psql "$LOCAL_URL" -v ON_ERROR_STOP=1 -qX -c "TRUNCATE auth.users CASCADE" >/dev/null

  echo ">> 2/4 A copiar auth.users (id, email, created_at) do remoto → local..."
  if ! psql "$REMOTE" -v ON_ERROR_STOP=1 -qX -c "COPY (SELECT id, email, created_at FROM auth.users) TO STDOUT" \
    | psql "$LOCAL_URL" -v ON_ERROR_STOP=1 -qX -c "COPY auth.users (id, email, created_at) FROM STDIN"; then
    echo "Aviso: falhou a cópia de auth.users (permissões ou schema). Continua com dados public..." >&2
  fi

  echo ">> 3/4 pg_dump --data-only --schema=public (remoto)..."
  pg_dump "$REMOTE" \
    --data-only \
    --schema=public \
    --no-owner \
    --no-acl \
    -Fc \
    -f "$DUMP_DATA"

  echo ">> 4/4 pg_restore --data-only --disable-triggers (local)..."
  set +e
  pg_restore -h 127.0.0.1 -p "$HOST_PG_PORT" -U postgres -d sig_gestao_ti \
    --data-only \
    --disable-triggers \
    --no-owner \
    --no-acl \
    --verbose \
    "$DUMP_DATA" 2>&1
  RC=$?
  set -e
  if [ "$RC" -gt 1 ]; then
    echo "pg_restore terminou com código $RC." >&2
    echo "Se o erro for de colunas/tabelas em falta, tenta schema completo: FULL_PUBLIC_SCHEMA=1 npm run db:sync-remote" >&2
    exit "$RC"
  fi
fi

echo ""
echo ">> Concluído."
echo "    psql:  postgresql://postgres:postgres@127.0.0.1:${HOST_PG_PORT}/sig_gestao_ti"
echo "    DBeaver: host 127.0.0.1, porta ${HOST_PG_PORT}, base sig_gestao_ti, user postgres, password postgres"
