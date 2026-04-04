#!/bin/bash
# =========================================================
# NutriGestão Security Audit Script (Automated Checks)
# =========================================================
# Executa verificações automáticas de segurança no codebase.
# Uso: bash .claude/skills/nutrigestao-security/scripts/security-audit.sh [path-to-project]
#
# Exit codes:
#   0 = tudo OK
#   1 = encontrou problemas críticos
#   2 = encontrou warnings
# =========================================================

set -euo pipefail

PROJECT_DIR="${1:-.}"
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

CRITICAL=0
WARNINGS=0
PASSED=0

section() { echo -e "\n${BLUE}${BOLD}═══ $1 ═══${NC}"; }
pass()    { echo -e "  ${GREEN}✅ $1${NC}"; PASSED=$((PASSED + 1)); }
fail()    { echo -e "  ${RED}❌ CRÍTICO: $1${NC}"; CRITICAL=$((CRITICAL + 1)); }
warn()    { echo -e "  ${YELLOW}⚠️  WARNING: $1${NC}"; WARNINGS=$((WARNINGS + 1)); }
info()    { echo -e "  ${BLUE}ℹ️  $1${NC}"; }

cd "$PROJECT_DIR"

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║   NutriGestão Security Audit — Paranoid Mode 🔒    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "Projeto: $(pwd)"
echo "Data: $(date '+%Y-%m-%d %H:%M:%S')"

# =========================================================
section "1. RLS COVERAGE (Multi-Tenant Isolation)"
# =========================================================

MIGRATIONS_DIR="supabase/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
  TABLE_COUNT=$(grep -il "CREATE TABLE" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
  RLS_COUNT=$(grep -il "ENABLE ROW LEVEL SECURITY\|enable row level security" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')

  info "Tabelas criadas: $TABLE_COUNT"
  info "Tabelas com RLS: $RLS_COUNT"

  if [ "$TABLE_COUNT" -eq "$RLS_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    pass "Todas as $TABLE_COUNT tabelas têm RLS ativado"
  elif [ "$TABLE_COUNT" -gt "$RLS_COUNT" ]; then
    MISSING=$((TABLE_COUNT - RLS_COUNT))
    fail "$MISSING tabela(s) SEM RLS! Risco de vazamento cross-tenant"

    echo -e "    ${RED}Tabelas sem RLS:${NC}"
    for file in "$MIGRATIONS_DIR"/*.sql; do
      tables_in_file=$(grep -ioP 'create table\s+(?:if not exists\s+)?(?:public\.)?(\w+)' "$file" | awk '{print $NF}' 2>/dev/null || true)
      for table in $tables_in_file; do
        if ! grep -iq "enable row level security" "$file" 2>/dev/null; then
          echo -e "    ${RED}  → $table (em $(basename "$file"))${NC}"
        fi
      done
    done
  else
    info "Nenhuma migração encontrada"
  fi

  # Verificar policies de UPDATE com WITH CHECK
  UPDATE_POLICIES=$(grep -i "FOR UPDATE" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
  WITH_CHECK=$(grep -i "WITH CHECK" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
  if [ "$UPDATE_POLICIES" -gt 0 ]; then
    info "Policies UPDATE: $UPDATE_POLICIES | WITH CHECK: $WITH_CHECK"
  fi

  # Verificar SECURITY DEFINER (bypass RLS)
  SEC_DEFINER=$(grep -i "SECURITY DEFINER" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
  if [ "$SEC_DEFINER" -gt 0 ]; then
    warn "$SEC_DEFINER função(ões) com SECURITY DEFINER (bypass RLS) — verificar se justificado"
    grep -in "SECURITY DEFINER" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | while read -r line; do
      echo -e "    ${YELLOW}  → $line${NC}"
    done
  else
    pass "Nenhuma função com SECURITY DEFINER"
  fi
else
  warn "Diretório $MIGRATIONS_DIR não encontrado"
fi

# =========================================================
section "2. SERVICE ROLE KEY EXPOSURE"
# =========================================================

CLIENT_DIRS="app components lib"
EXPOSED=0

for dir in $CLIENT_DIRS; do
  if [ -d "$dir" ]; then
    HITS=$(grep -rn "SUPABASE_SERVICE_ROLE\|service_role" --include="*.ts" --include="*.tsx" "$dir" 2>/dev/null | grep -v "\.d\.ts" | grep -v "node_modules" || true)
    if [ -n "$HITS" ]; then
      fail "service_role encontrado em código client-side ($dir/)"
      echo "$HITS" | while read -r line; do
        echo -e "    ${RED}  → $line${NC}"
      done
      EXPOSED=1
    fi
  fi
done

if [ "$EXPOSED" -eq 0 ]; then
  pass "service_role não exposto em código client-side"
fi

# Verificar NEXT_PUBLIC com service role
NEXT_PUBLIC_SR=$(grep -rn "NEXT_PUBLIC.*SERVICE_ROLE\|NEXT_PUBLIC.*service_role" --include="*.ts" --include="*.tsx" --include="*.env*" . 2>/dev/null | grep -v node_modules || true)
if [ -n "$NEXT_PUBLIC_SR" ]; then
  fail "NEXT_PUBLIC_ com service_role! Key exposta ao browser!"
  echo "$NEXT_PUBLIC_SR"
else
  pass "Nenhuma NEXT_PUBLIC_ com service_role"
fi

# =========================================================
section "3. SECRETS E DADOS SENSÍVEIS NO CÓDIGO"
# =========================================================

# .env no .gitignore
if [ -f ".gitignore" ]; then
  if grep -q "\.env" .gitignore; then
    pass ".env está no .gitignore"
  else
    fail ".env NÃO está no .gitignore — secrets podem ser commitados!"
  fi
fi

# .env.example existe
if [ -f ".env.example" ] || [ -f ".env.local.example" ]; then
  pass ".env.example existe para documentação"
else
  warn "Falta .env.example — dificulta setup seguro para novos devs"
fi

# Buscar padrões de secrets hardcoded
HARDCODED=$(grep -rn "eyJ[a-zA-Z0-9_-]\{20,\}\|sk_live_\|pk_live_\|ghp_\|gho_\|AKIA[A-Z0-9]" --include="*.ts" --include="*.tsx" --include="*.js" app/ lib/ components/ 2>/dev/null | grep -v node_modules | grep -v ".d.ts" || true)
if [ -n "$HARDCODED" ]; then
  fail "Possíveis secrets hardcoded encontrados!"
  echo "$HARDCODED" | head -5
else
  pass "Nenhum secret hardcoded detectado"
fi

# console.log suspeitos
SENSITIVE_LOGS=$(grep -rn "console\.log" --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>/dev/null | grep -v node_modules | grep -vi "error\|warn\|debug" || true)
LOG_COUNT=0
if [ -n "$SENSITIVE_LOGS" ]; then
  LOG_COUNT=$(echo "$SENSITIVE_LOGS" | wc -l | tr -d ' ')
fi
if [ "$LOG_COUNT" -gt 10 ]; then
  warn "$LOG_COUNT console.log encontrados — revisar se expõem dados sensíveis"
elif [ "$LOG_COUNT" -gt 0 ]; then
  info "$LOG_COUNT console.log encontrados (verificar manualmente)"
else
  pass "Nenhum console.log em código de produção"
fi

# =========================================================
section "4. NEXT.JS SECURITY"
# =========================================================

# Versão do Next.js (CVE-2025-29927)
if [ -f "node_modules/next/package.json" ]; then
  NEXT_VERSION=$(node -e "console.log(require('./node_modules/next/package.json').version)" 2>/dev/null || echo "unknown")
  info "Next.js versão: $NEXT_VERSION"

  MAJOR=$(echo "$NEXT_VERSION" | cut -d. -f1)
  MINOR=$(echo "$NEXT_VERSION" | cut -d. -f2)
  PATCH=$(echo "$NEXT_VERSION" | cut -d. -f3)

  if [ "$MAJOR" -ge 15 ] && [ "$MINOR" -ge 2 ] && [ "$PATCH" -ge 3 ]; then
    pass "Next.js >= 15.2.3 (CVE-2025-29927 corrigido)"
  elif [ "$MAJOR" -ge 16 ]; then
    pass "Next.js $NEXT_VERSION (CVE-2025-29927 corrigido)"
  else
    fail "Next.js $NEXT_VERSION vulnerável ao CVE-2025-29927 (middleware bypass)!"
  fi
fi

# Security headers em next.config
if [ -f "next.config.ts" ] || [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
  CONFIG_FILE=$(ls next.config.* 2>/dev/null | head -1)
  if grep -q "Content-Security-Policy\|contentSecurityPolicy" "$CONFIG_FILE" 2>/dev/null; then
    pass "CSP configurado em $CONFIG_FILE"
  else
    fail "Content-Security-Policy NÃO configurado em $CONFIG_FILE"
  fi

  if grep -q "Strict-Transport-Security\|strictTransportSecurity" "$CONFIG_FILE" 2>/dev/null; then
    pass "HSTS configurado"
  else
    warn "Strict-Transport-Security não encontrado em $CONFIG_FILE"
  fi

  if grep -q "X-Frame-Options\|xFrameOptions" "$CONFIG_FILE" 2>/dev/null; then
    pass "X-Frame-Options configurado"
  else
    warn "X-Frame-Options não configurado"
  fi

  if grep -q "productionBrowserSourceMaps.*false\|productionBrowserSourceMaps: false" "$CONFIG_FILE" 2>/dev/null; then
    pass "Source maps desabilitados em produção"
  else
    warn "Source maps podem estar habilitados em produção"
  fi
else
  warn "next.config não encontrado"
fi

# dangerouslySetInnerHTML
DANGEROUS_HTML=$(grep -rn "dangerouslySetInnerHTML" --include="*.tsx" --include="*.ts" app/ components/ 2>/dev/null | grep -v node_modules || true)
if [ -n "$DANGEROUS_HTML" ]; then
  warn "dangerouslySetInnerHTML encontrado — verificar se input é sanitizado!"
  echo "$DANGEROUS_HTML" | while read -r line; do
    echo -e "    ${YELLOW}  → $line${NC}"
  done
else
  pass "Nenhum dangerouslySetInnerHTML encontrado"
fi

# eval() e Function()
EVAL_USAGE=$(grep -rn "eval(\|new Function(" --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>/dev/null | grep -v node_modules | grep -v ".d.ts" || true)
if [ -n "$EVAL_USAGE" ]; then
  fail "eval() ou new Function() encontrado — vetor de code injection!"
  echo "$EVAL_USAGE"
else
  pass "Nenhum eval() ou new Function() encontrado"
fi

# =========================================================
section "5. AUTH VALIDATION EM SERVER ACTIONS"
# =========================================================

SERVER_ACTIONS=$(grep -rln "'use server'" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null || true)
if [ -n "$SERVER_ACTIONS" ]; then
  TOTAL_ACTIONS=$(echo "$SERVER_ACTIONS" | wc -l | tr -d ' ')
  ACTIONS_WITH_AUTH=0
  ACTIONS_WITHOUT_AUTH=""

  while IFS= read -r file; do
    if grep -q "auth.getUser\|getUser()" "$file" 2>/dev/null; then
      ACTIONS_WITH_AUTH=$((ACTIONS_WITH_AUTH + 1))
    else
      ACTIONS_WITHOUT_AUTH="$ACTIONS_WITHOUT_AUTH\n    → $file"
    fi
  done <<< "$SERVER_ACTIONS"

  info "Server Actions: $TOTAL_ACTIONS | Com auth check: $ACTIONS_WITH_AUTH"

  if [ "$ACTIONS_WITH_AUTH" -eq "$TOTAL_ACTIONS" ]; then
    pass "Todas as Server Actions verificam autenticação"
  else
    MISSING_AUTH=$((TOTAL_ACTIONS - ACTIONS_WITH_AUTH))
    warn "$MISSING_AUTH Server Action(s) possivelmente sem verificação de auth:"
    echo -e "$ACTIONS_WITHOUT_AUTH"
  fi
else
  info "Nenhuma Server Action encontrada"
fi

# =========================================================
section "6. DEPENDÊNCIAS E SUPPLY CHAIN"
# =========================================================

# Lockfile existe
if [ -f "package-lock.json" ] || [ -f "pnpm-lock.yaml" ] || [ -f "yarn.lock" ]; then
  pass "Lockfile encontrado"
else
  fail "Nenhum lockfile encontrado — versões de dependências não são determinísticas!"
fi

# npm audit
if command -v npm &> /dev/null && [ -f "package.json" ]; then
  info "Executando npm audit..."
  AUDIT_OUTPUT=$(npm audit --omit=dev 2>&1 || true)
  AUDIT_CRITICAL=$(echo "$AUDIT_OUTPUT" | grep "critical" | wc -l | tr -d ' ')
  AUDIT_HIGH=$(echo "$AUDIT_OUTPUT" | grep " high" | wc -l | tr -d ' ')

  if [ "$AUDIT_CRITICAL" -gt 0 ]; then
    fail "npm audit: $AUDIT_CRITICAL vulnerabilidade(s) CRÍTICA(S)!"
  elif [ "$AUDIT_HIGH" -gt 0 ]; then
    warn "npm audit: $AUDIT_HIGH vulnerabilidade(s) alta(s)"
  else
    pass "npm audit: sem vulnerabilidades altas ou críticas"
  fi
fi

# =========================================================
section "7. VALIDAÇÃO (ZOD/SCHEMA)"
# =========================================================

ZOD_INSTALLED=$(grep '"zod"' package.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$ZOD_INSTALLED" -gt 0 ]; then
  pass "Zod instalado para validação de input"

  ZOD_USAGE=$(grep -rl "z\.object\|z\.string\|z\.number\|safeParse" --include="*.ts" --include="*.tsx" lib/ app/ 2>/dev/null | wc -l | tr -d ' ')
  info "Arquivos usando Zod: $ZOD_USAGE"

  if [ "$ZOD_USAGE" -lt 3 ]; then
    warn "Poucos arquivos usando Zod — verificar se todas as entradas são validadas server-side"
  fi
else
  warn "Zod não encontrado em dependencies — validação server-side pode estar ausente"
fi

# =========================================================
section "8. RATE LIMITING"
# =========================================================

RATELIMIT_INSTALLED=$(grep -E "@upstash/ratelimit|rate-limit|ratelimit" package.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$RATELIMIT_INSTALLED" -gt 0 ]; then
  pass "Pacote de rate limiting encontrado"
else
  warn "Nenhum pacote de rate limiting instalado (recomendado: @upstash/ratelimit)"
fi

RATELIMIT_USAGE=$(grep -rl "ratelimit\|rateLimiter\|RateLimit" --include="*.ts" --include="*.tsx" lib/ app/ middleware.ts 2>/dev/null | wc -l | tr -d ' ')
if [ "$RATELIMIT_USAGE" -gt 0 ]; then
  pass "Rate limiting implementado em $RATELIMIT_USAGE arquivo(s)"
else
  warn "Rate limiting não encontrado no código — endpoints vulneráveis a abuso"
fi

# =========================================================
section "9. MIDDLEWARE E PROTEÇÃO DE ROTAS"
# =========================================================

if [ -f "middleware.ts" ] || [ -f "src/middleware.ts" ]; then
  pass "middleware.ts encontrado"

  MW_FILE=$(ls middleware.ts src/middleware.ts 2>/dev/null | head -1)

  if grep -q "auth\|session\|getUser" "$MW_FILE" 2>/dev/null; then
    pass "Middleware verifica autenticação"
  else
    warn "Middleware pode não estar verificando autenticação"
  fi

  if grep -q "matcher\|config" "$MW_FILE" 2>/dev/null; then
    pass "Middleware tem matcher configurado"
  else
    warn "Middleware sem matcher — pode não cobrir todas as rotas"
  fi
else
  fail "middleware.ts NÃO encontrado — rotas não estão protegidas!"
fi

# =========================================================
section "RESULTADO FINAL"
# =========================================================

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║           RESULTADO DA AUDITORIA             ║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}✅ Passou:    $PASSED${NC}"
echo -e "${BOLD}║${NC}  ${YELLOW}⚠️  Warnings:  $WARNINGS${NC}"
echo -e "${BOLD}║${NC}  ${RED}❌ Críticos:  $CRITICAL${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════╣${NC}"

TOTAL=$((PASSED + WARNINGS + CRITICAL))
if [ "$TOTAL" -gt 0 ]; then
  SCORE=$(( (PASSED * 100) / TOTAL ))
else
  SCORE=0
fi

if [ "$CRITICAL" -gt 0 ]; then
  echo -e "${BOLD}║${NC}  ${RED}VEREDICTO: NÃO APROVADO PARA PRODUÇÃO${NC}"
  echo -e "${BOLD}║${NC}  ${RED}Score: $SCORE/100 — Corrigir $CRITICAL item(ns) crítico(s)${NC}"
  EXIT_CODE=1
elif [ "$WARNINGS" -gt 5 ]; then
  echo -e "${BOLD}║${NC}  ${YELLOW}VEREDICTO: APROVADO COM RESSALVAS${NC}"
  echo -e "${BOLD}║${NC}  ${YELLOW}Score: $SCORE/100 — Resolver warnings antes do lançamento${NC}"
  EXIT_CODE=2
else
  echo -e "${BOLD}║${NC}  ${GREEN}VEREDICTO: APROVADO${NC}"
  echo -e "${BOLD}║${NC}  ${GREEN}Score: $SCORE/100${NC}"
  EXIT_CODE=0
fi

echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "Relatório gerado em: $(date '+%Y-%m-%d %H:%M:%S')"

exit $EXIT_CODE
