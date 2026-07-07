#!/usr/bin/env bash
# Sobe/desce Postgres do projeto. Ordem de preferência:
#   1) docker compose (plugin V2)
#   2) docker-compose (V1)
#   3) podman compose
#   4) docker run (sem Compose — mesmo que docker-compose.yml)
#
# Se aparecer "unknown shorthand flag: 'd'", normalmente é falta do plugin
# ou uso de sudo sem o plugin para root. Instalar:
#   sudo apt-get install docker-compose-plugin
set -eu
set -o pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CONTAINER_NAME="sig-gestao-ti-db"
VOLUME_NAME="sig_gestao_ti_pgdata"
# Porta no teu PC (evita outro Postgres que já use 5432). Dentro do contentor continua 5432.
HOST_PG_PORT="${HOST_PG_PORT:-5432}"

compose_plugin() {
  docker compose version >/dev/null 2>&1
}

compose_v1() {
  command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1
}

podman_compose() {
  command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1
}

compose() {
  if compose_plugin; then
    docker compose "$@"
    return
  fi
  if compose_v1; then
    docker-compose "$@"
    return
  fi
  if podman_compose; then
    podman compose "$@"
    return
  fi
  return 1
}

plain_docker_up() {
  command -v docker >/dev/null 2>&1 || {
    echo "Erro: 'docker' não está no PATH." >&2
    exit 1
  }
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER_NAME"; then
    pub=$(docker port "$CONTAINER_NAME" 5432/tcp 2>/dev/null | awk -F: '{print $NF}' | head -1 || true)
    if [ "$pub" != "$HOST_PG_PORT" ]; then
      echo "A recriar contentor (mapeamento antigo na porta ${pub:-?} -> localhost:${HOST_PG_PORT})..."
      docker rm -f "$CONTAINER_NAME"
    elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER_NAME"; then
      echo "Postgres já está a correr ($CONTAINER_NAME). DBeaver/psql: localhost:${HOST_PG_PORT}"
      return 0
    else
      echo "A iniciar contentor existente $CONTAINER_NAME..."
      docker start "$CONTAINER_NAME"
      echo "Postgres em localhost:${HOST_PG_PORT} (postgres / postgres, DB sig_gestao_ti)"
      return 0
    fi
  fi
  docker volume create "$VOLUME_NAME" >/dev/null 2>&1 || true
  echo "Compose não encontrado — a subir Postgres com 'docker run' (sem plugin)..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=sig_gestao_ti \
    -p "${HOST_PG_PORT}:5432" \
    -v "$VOLUME_NAME:/var/lib/postgresql/data" \
    -v "$ROOT/database/init:/docker-entrypoint-initdb.d:ro" \
    postgres:16-alpine
  echo "Postgres em localhost:${HOST_PG_PORT} (postgres / postgres, DB sig_gestao_ti)"
}

plain_docker_down() {
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
}

plain_docker_reset() {
  plain_docker_down
  docker volume rm "$VOLUME_NAME" 2>/dev/null || true
  plain_docker_up
}

run_up() {
  if compose_plugin || compose_v1 || podman_compose; then
    compose up --detach
    return 0
  fi
  plain_docker_up
}

run_down() {
  if compose_plugin || compose_v1 || podman_compose; then
    compose down || true
  fi
  # Contentor com o mesmo nome pode ter sido criado pelo fallback "docker run"
  plain_docker_down
}

run_reset() {
  if compose_plugin || compose_v1 || podman_compose; then
    compose down --volumes || true
    plain_docker_down
    compose up --detach
    return 0
  fi
  plain_docker_reset
}

case "${1:-}" in
  up)    run_up ;;
  down)  run_down ;;
  reset) run_reset ;;
  *)
    echo "Uso: $0 up | down | reset" >&2
    exit 1
    ;;
esac
