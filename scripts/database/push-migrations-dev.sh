#!/usr/bin/env bash
#
# Aplica migrações pendentes no Postgres do Supabase DEV (self-hosted).
# O `supabase db push` padrão usa o projeto cloud linkado — este script
# aponta explicitamente para o banco DEV.
#
# Credenciais (ordem de prioridade):
#   1. SUPABASE_DB_URL_DEV na linha de comando
#   2. scripts/database/.env.dev (gitignored)
#   3. .env.dev na raiz do repositório (gitignored)
#
# Obtenha a URL em: Supabase Studio DEV → Connect → URI (Session pooler ou direct).
# Ex.: postgresql://postgres:PASSWORD@HOST:5432/postgres
#
# Uso:
#   ./scripts/database/push-migrations-dev.sh
#   SUPABASE_DB_URL_DEV='postgresql://...' ./scripts/database/push-migrations-dev.sh
#   ./scripts/database/push-migrations-dev.sh --dry-run
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

for env_file in "${SCRIPT_DIR}/.env.dev" "${PROJECT_ROOT}/.env.dev"; do
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
    break
  fi
done

DB_URL="${SUPABASE_DB_URL_DEV:-}"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

if [ -z "$DB_URL" ]; then
  echo "Erro: defina SUPABASE_DB_URL_DEV (variável ou scripts/database/.env.dev)." >&2
  exit 1
fi

command -v supabase >/dev/null 2>&1 || {
  echo "Erro: Supabase CLI não encontrado. Instale: https://supabase.com/docs/guides/cli" >&2
  exit 1
}

SAFE_URL="$(printf '%s' "$DB_URL" | sed -E 's#(://[^:]+:)[^@]+@#\1********@#')"
echo "Destino DEV: ${SAFE_URL}"

cd "$PROJECT_ROOT"

if [ "$DRY_RUN" = true ]; then
  supabase db push --db-url "$DB_URL" --dry-run
else
  supabase db push --db-url "$DB_URL" --yes
fi

echo "Migrações DEV aplicadas."
