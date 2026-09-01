#!/usr/bin/env bash
# Gate de regressão do plano de limites/retenção/billing.
# Uso: ./scripts/qa/baseline.sh [--with-rls] [--with-e2e]
# Ver docs/plano-limites-tenant-e-billing-TAREFAS.md §3
set -uo pipefail
cd "$(dirname "$0")/../.."

FAIL=0
step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
check() { if [ "$1" -ne 0 ]; then printf '\033[31m✗ %s\033[0m\n' "$2"; FAIL=1; else printf '\033[32m✓ %s\033[0m\n' "$2"; fi; }

step "lint";        npm run lint --silent;  check $? "lint (0 erros desde a T0.2b)"
step "typecheck";   npx tsc --noEmit;       check $? "tsc --noEmit"
step "unit";        npm run test --silent;  check $? "vitest (esperado: >= 888 testes)"

if [ "${1:-}" = "--with-rls" ] || [ "${2:-}" = "--with-rls" ]; then
  step "rls"; npm run test:rls --silent; check $? "vitest RLS (exige: npx supabase start)"
fi

step "build"; npm run build --silent; check $? "next build"

if [ "${1:-}" = "--with-e2e" ] || [ "${2:-}" = "--with-e2e" ]; then
  step "e2e"; npm run test:e2e --silent; check $? "playwright"
fi

printf '\n'
if [ "$FAIL" -eq 0 ]; then printf '\033[32mGate verde.\033[0m\n'; else printf '\033[31mGate vermelho — nao prosseguir.\033[0m\n'; fi
exit "$FAIL"
