#!/usr/bin/env bash
#
# Seed idempotente do "Checklist padrão — Escola e ILPI" no Supabase DEV.
# Use quando só este modelo estiver faltando (sem rodar todas as migrações).
#
# Requer: psql + SUPABASE_DB_URL_DEV (mesma config de push-migrations-dev.sh).
#
# Uso:
#   ./scripts/database/apply-checklist-escola-ilpi-dev.sh
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

if [ -z "$DB_URL" ]; then
  echo "Erro: defina SUPABASE_DB_URL_DEV." >&2
  exit 1
fi

command -v psql >/dev/null 2>&1 || {
  echo "Erro: psql não encontrado. Instale: brew install libpq" >&2
  exit 1
}

MIGRATIONS=(
  "20260715103000_checklist_template_escola_ilpi_padrao.sql"
  "20260723154500_escola_ilpi_sync_official_operational.sql"
  "20260828150000_checklist_escola_ilpi_prefix_items_1_8.sql"
)

for file in "${MIGRATIONS[@]}"; do
  path="${PROJECT_ROOT}/supabase/migrations/${file}"
  if [ ! -f "$path" ]; then
    echo "Erro: migração não encontrada: ${path}" >&2
    exit 1
  fi
  echo "→ ${file}"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$path"
done

echo "Checklist Escola/ILPI aplicado no DEV."
