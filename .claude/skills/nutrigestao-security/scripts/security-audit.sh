#!/bin/bash
# =========================================================
# NutriGestão Security Audit Script v2.0
# Cobre: OWASP Top 10 2025 | CWE Top 25 (2024) | CVEs Stack
# =========================================================
# Uso: bash .claude/skills/nutrigestao-security/scripts/security-audit.sh [path]
#
# Exit codes:
#   0 = tudo OK
#   1 = encontrou problemas críticos
#   2 = encontrou warnings (sem críticos)
# =========================================================

set -euo pipefail

PROJECT_DIR="${1:-.}"
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

CRITICAL=0
WARNINGS=0
PASSED=0

section()  { echo -e "\n${BLUE}${BOLD}═══ $1 ═══${NC}"; }
cve_check(){ echo -e "\n${CYAN}${BOLD}── CVE/CWE: $1 ──${NC}"; }
pass()     { echo -e "  ${GREEN}✅ $1${NC}"; PASSED=$((PASSED + 1)); }
fail()     { echo -e "  ${RED}❌ CRÍTICO: $1${NC}"; CRITICAL=$((CRITICAL + 1)); }
warn()     { echo -e "  ${YELLOW}⚠️  WARNING: $1${NC}"; WARNINGS=$((WARNINGS + 1)); }
info()     { echo -e "  ${BLUE}ℹ️  $1${NC}"; }

cd "$PROJECT_DIR"

echo -e "${BOLD}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  NutriGestão Security Audit v2.0 — Paranoid Mode 🔒      ║"
echo "║  OWASP Top 10 2025 | CWE Top 25 | CVE Stack Tracking     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "Projeto: $(pwd)"
echo "Data: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Node.js: $(node --version 2>/dev/null || echo 'não encontrado')"

# =========================================================
section "1. CVE TRACKING — Versões Críticas do Stack"
# =========================================================

cve_check "CVE-2025-29927 + CVE-2025-34351 | Next.js Middleware Bypass + Cache Poisoning"
if [ -f "node_modules/next/package.json" ]; then
  NEXT_VERSION=$(node -e "console.log(require('./node_modules/next/package.json').version)" 2>/dev/null || echo "unknown")
  info "Next.js versão instalada: $NEXT_VERSION"

  MAJOR=$(echo "$NEXT_VERSION" | cut -d. -f1)
  MINOR=$(echo "$NEXT_VERSION" | cut -d. -f2)
  PATCH=$(echo "$NEXT_VERSION" | cut -d. -f3 | cut -d- -f1)

  # Deve ser >= 15.3.1 para cobrir ambos CVE-2025-29927 e CVE-2025-34351
  if [ "$MAJOR" -ge 16 ]; then
    pass "Next.js $NEXT_VERSION >= 16 (CVE-2025-29927 e CVE-2025-34351 corrigidos)"
  elif [ "$MAJOR" -eq 15 ] && [ "$MINOR" -ge 4 ]; then
    pass "Next.js $NEXT_VERSION (CVE-2025-29927 e CVE-2025-34351 corrigidos)"
  elif [ "$MAJOR" -eq 15 ] && [ "$MINOR" -eq 3 ] && [ "$PATCH" -ge 1 ]; then
    pass "Next.js $NEXT_VERSION >= 15.3.1 (CVE-2025-29927 e CVE-2025-34351 corrigidos)"
  elif [ "$MAJOR" -eq 15 ] && [ "$MINOR" -eq 2 ] && [ "$PATCH" -ge 3 ]; then
    warn "Next.js $NEXT_VERSION cobre CVE-2025-29927 mas NÃO CVE-2025-34351 — atualizar para >= 15.3.1"
  else
    fail "Next.js $NEXT_VERSION vulnerável! CVE-2025-29927 (middleware bypass CRÍTICO) — atualizar para >= 15.3.1"
  fi
else
  warn "next/package.json não encontrado — verificar instalação"
fi

cve_check "CVE-2025-21620 | @supabase/realtime-js Prototype Pollution (CWE-1321)"
if [ -f "node_modules/@supabase/realtime-js/package.json" ]; then
  RT_VERSION=$(node -e "console.log(require('./node_modules/@supabase/realtime-js/package.json').version)" 2>/dev/null || echo "unknown")
  info "@supabase/realtime-js: $RT_VERSION"

  RT_MAJOR=$(echo "$RT_VERSION" | cut -d. -f1)
  RT_MINOR=$(echo "$RT_VERSION" | cut -d. -f2)
  RT_PATCH=$(echo "$RT_VERSION" | cut -d. -f3 | cut -d- -f1)

  if [ "$RT_MAJOR" -gt 2 ] || { [ "$RT_MAJOR" -eq 2 ] && [ "$RT_MINOR" -gt 11 ]; } || { [ "$RT_MAJOR" -eq 2 ] && [ "$RT_MINOR" -eq 11 ] && [ "$RT_PATCH" -ge 2 ]; }; then
    pass "@supabase/realtime-js $RT_VERSION >= 2.11.2 (CVE-2025-21620 corrigido)"
  else
    fail "@supabase/realtime-js $RT_VERSION vulnerável ao CVE-2025-21620 (Prototype Pollution)!"
  fi
else
  info "@supabase/realtime-js não encontrado (pode ser dep transitiva)"
fi

# Node.js version check
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//' || echo "0.0.0")
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -ge 22 ]; then
  pass "Node.js $NODE_VERSION (LTS atual)"
elif [ "$NODE_MAJOR" -ge 20 ]; then
  warn "Node.js $NODE_VERSION (LTS mas não o mais recente — verificar CVEs)"
elif [ "$NODE_MAJOR" -ge 18 ]; then
  warn "Node.js $NODE_VERSION (próximo do fim do suporte LTS)"
else
  fail "Node.js $NODE_VERSION (sem suporte ativo — atualizar urgente)"
fi

# =========================================================
section "2. RLS COVERAGE — Multi-Tenant Isolation (OWASP A01 / CWE-284, CWE-639)"
# =========================================================

MIGRATIONS_DIR="supabase/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
  # Contagem real de CREATE TABLE (soma de todos os ficheiros)
  TABLE_COUNT=$(grep -rih "CREATE TABLE" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | grep -iv "^\s*--" | wc -l | tr -d ' ')
  RLS_COUNT=$(grep -rih "ENABLE ROW LEVEL SECURITY" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
  POLICY_COUNT=$(grep -rih "CREATE POLICY" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')

  info "Tabelas criadas: $TABLE_COUNT | RLS ativado: $RLS_COUNT | Policies: $POLICY_COUNT"

  if [ "$TABLE_COUNT" -eq 0 ]; then
    info "Nenhuma migration SQL encontrada"
  elif [ "$TABLE_COUNT" -le "$RLS_COUNT" ]; then
    pass "RLS ativado em todas (ou mais) tabelas — OK"
  else
    MISSING=$((TABLE_COUNT - RLS_COUNT))
    fail "$MISSING tabela(s) SEM RLS! Risco de vazamento cross-tenant (CWE-639)"
  fi

  # Policies UPDATE com WITH CHECK (CWE-915 — prevents user_id change)
  UPDATE_POLICIES=$(grep -rih "FOR UPDATE" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
  WITH_CHECK_COUNT=$(grep -rih "WITH CHECK" "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
  if [ "$UPDATE_POLICIES" -gt 0 ] && [ "$WITH_CHECK_COUNT" -eq 0 ]; then
    warn "Policies UPDATE sem WITH CHECK — possível mudança de user_id (CWE-915)"
  elif [ "$WITH_CHECK_COUNT" -gt 0 ]; then
    pass "WITH CHECK presente em $WITH_CHECK_COUNT policy(ies) UPDATE"
  fi

  # SECURITY DEFINER (bypass RLS) — cada um exige justificativa
  # Excluir linhas de comentário SQL (-- ...) que apenas mencionam o termo
  SEC_DEFINER_LINES=$(grep -rin "SECURITY DEFINER" "$MIGRATIONS_DIR"/*.sql 2>/dev/null \
    | grep -v ":\s*--" || true)
  SEC_DEFINER=$(echo "$SEC_DEFINER_LINES" | grep -c "." 2>/dev/null || echo 0)
  if [ "$SEC_DEFINER" -gt 0 ]; then
    warn "$SEC_DEFINER função(ões) SECURITY DEFINER (bypass RLS) — verificar se TODAS são justificadas"
    echo "$SEC_DEFINER_LINES" | head -8 | while read -r line; do
      echo -e "    ${YELLOW}  → $line${NC}"
    done
    [ "$SEC_DEFINER" -gt 8 ] && echo -e "    ${YELLOW}  ... e mais $((SEC_DEFINER - 8)) ocorrência(s) — revisar manualmente${NC}"
  else
    pass "Nenhuma função SECURITY DEFINER ativa (bypass RLS)"
  fi

  # EXECUTE dinâmico (CWE-89 — SQL Injection em funções PL/pgSQL)
  # Padrões SEGUROS (excluídos):
  #   EXECUTE FUNCTION / EXECUTE PROCEDURE  → sintaxe de CREATE TRIGGER
  #   FOR EACH ROW EXECUTE                  → sintaxe de CREATE TRIGGER
  #   GRANT EXECUTE ON FUNCTION             → DDL de permissão
  #   EXECUTE FORMAT('%I', ...)             → FORMAT com %I é quoting seguro
  # Padrão PERIGOSO: EXECUTE 'sql' || variavel (concatenação de string no PL/pgSQL)
  EXEC_SQL=$(grep -rih "EXECUTE\s" "$MIGRATIONS_DIR"/*.sql 2>/dev/null \
    | grep -iv "execute function\|execute procedure\|for each row execute\|grant execute\|execute format(" \
    | grep -v "^\s*--" \
    | grep -v "EXECUTE\s\+format\s*(" || true)
  if [ -n "$EXEC_SQL" ]; then
    EXEC_COUNT=$(echo "$EXEC_SQL" | grep -c "." || echo 0)
    fail "$EXEC_COUNT EXECUTE dinâmico(s) com possível SQL injection (CWE-89)!"
    echo "$EXEC_SQL" | head -10 | while read -r line; do
      echo -e "    ${RED}  → $line${NC}"
    done
  else
    pass "Nenhum EXECUTE dinâmico perigoso em funções PL/pgSQL"
  fi

else
  warn "Diretório $MIGRATIONS_DIR não encontrado"
fi

# =========================================================
section "3. SERVICE ROLE KEY EXPOSURE (CWE-522, CWE-798)"
# =========================================================

# O perigo real: service_role em Client Components ("use client")
# Ficheiros server-only são seguros: API routes (app/api/), "use server", lib/supabase/service-role.ts
CLIENT_SR_EXPOSED=0

# 1. Verificar Client Components ("use client") que importem service_role
while IFS= read -r file; do
  if grep -q '"use client"' "$file" 2>/dev/null; then
    if grep -q "SUPABASE_SERVICE_ROLE\|createServiceRoleClient\|service_role" "$file" 2>/dev/null; then
      fail "service_role em Client Component — exposto ao browser! (CWE-522): $file"
      CLIENT_SR_EXPOSED=1
    fi
  fi
done < <(find app/ components/ lib/ -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v node_modules)

# 2. Verificar componentes em components/ sem diretiva explícita (ambíguo)
AMBIGUOUS_SR=$(grep -rln "createServiceRoleClient" --include="*.tsx" components/ 2>/dev/null \
  | xargs -I{} grep -L '"use server"\|"use client"' {} 2>/dev/null || true)
if [ -n "$AMBIGUOUS_SR" ]; then
  warn "createServiceRoleClient em componente sem diretiva explícita — verificar:"
  echo "$AMBIGUOUS_SR" | while read -r f; do echo -e "    ${YELLOW}  → $f${NC}"; done
fi

[ "$CLIENT_SR_EXPOSED" -eq 0 ] && pass "service_role não encontrado em Client Components"

# NEXT_PUBLIC com service role = CRÍTICO (expõe ao browser)
NEXT_PUBLIC_SR=$(grep -rn "NEXT_PUBLIC.*SERVICE_ROLE\|NEXT_PUBLIC.*service_role" \
  --include="*.ts" --include="*.tsx" --include="*.env*" . 2>/dev/null | grep -v node_modules || true)
if [ -n "$NEXT_PUBLIC_SR" ]; then
  fail "NEXT_PUBLIC_ com service_role! Key totalmente exposta ao browser — CRÍTICO!"
  echo "$NEXT_PUBLIC_SR"
else
  pass "Nenhuma NEXT_PUBLIC_ com service_role"
fi

# =========================================================
section "4. SECRETS E CREDENCIAIS NO CÓDIGO (CWE-798, CWE-312)"
# =========================================================

# .env no .gitignore
if [ -f ".gitignore" ]; then
  if grep -q "\.env" .gitignore; then
    pass ".env está no .gitignore"
  else
    fail ".env NÃO está no .gitignore — secrets podem ser commitados! (CWE-312)"
  fi
fi

# .env.example existe
if [ -f ".env.example" ] || [ -f ".env.local.example" ]; then
  pass ".env.example existe"
else
  warn "Falta .env.example — dificulta setup seguro"
fi

# Padrões de secrets hardcoded
HARDCODED=$(grep -rn \
  -e "eyJ[a-zA-Z0-9_-]\{50,\}" \
  -e "sk_live_[a-zA-Z0-9]\{24,\}" \
  -e "pk_live_[a-zA-Z0-9]\{24,\}" \
  -e "ghp_[a-zA-Z0-9]\{36,\}" \
  -e "gho_[a-zA-Z0-9]\{36,\}" \
  -e "AKIA[A-Z0-9]\{16\}" \
  -e "rk_live_[a-zA-Z0-9]\{24,\}" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  app/ lib/ components/ 2>/dev/null \
  | grep -v "node_modules\|\.d\.ts\|test\|spec\|mock\|\.example" || true)

if [ -n "$HARDCODED" ]; then
  fail "Possíveis secrets hardcoded! (CWE-798)"
  echo "$HARDCODED" | head -5
else
  pass "Nenhum padrão de secret hardcoded detectado"
fi

# Verificar histórico git
GIT_SECRETS=$(git log --all --diff-filter=A --name-only -- '*.env' '*.pem' '*.key' 2>/dev/null | grep -v "^commit\|^Author\|^Date\|^$" | head -5 || true)
if [ -n "$GIT_SECRETS" ]; then
  warn "Arquivos sensíveis no histórico git: $GIT_SECRETS — verificar se contêm secrets reais"
else
  pass "Nenhum arquivo sensível em histórico git"
fi

# console.log com dados possivelmente sensíveis
SENSITIVE_LOGS=$(grep -rn "console\.log" --include="*.ts" --include="*.tsx" \
  app/ lib/ components/ 2>/dev/null \
  | grep -iv "error\|debug\|warn\|\[dev\]\|\[test\]" \
  | grep -v "node_modules" || true)
LOG_COUNT=$(echo "$SENSITIVE_LOGS" | grep -c "." || echo 0)

if [ "$LOG_COUNT" -gt 15 ]; then
  warn "$LOG_COUNT console.log em produção — alto risco de exposição de dados (CWE-312)"
elif [ "$LOG_COUNT" -gt 0 ]; then
  info "$LOG_COUNT console.log encontrados — revisar se expõem dados sensíveis"
else
  pass "Nenhum console.log desnecessário detectado"
fi

# =========================================================
section "5. NEXT.JS SECURITY (OWASP A02, A06, A07)"
# =========================================================

# Security headers em next.config
CONFIG_FILE=$(ls next.config.ts next.config.js next.config.mjs 2>/dev/null | head -1 || echo "")
if [ -n "$CONFIG_FILE" ]; then
  info "Verificando $CONFIG_FILE"

  grep -q "Content-Security-Policy\|contentSecurityPolicy" "$CONFIG_FILE" 2>/dev/null \
    && pass "CSP configurado" \
    || fail "Content-Security-Policy AUSENTE (CWE-16) — XSS sem mitigação!"

  grep -q "Strict-Transport-Security\|strictTransportSecurity" "$CONFIG_FILE" 2>/dev/null \
    && pass "HSTS configurado" \
    || warn "Strict-Transport-Security não configurado"

  grep -q "X-Frame-Options\|xFrameOptions\|frame-ancestors" "$CONFIG_FILE" 2>/dev/null \
    && pass "Proteção contra Clickjacking (X-Frame-Options / CSP frame-ancestors)" \
    || warn "X-Frame-Options não configurado — risco de clickjacking (CWE-1021)"

  grep -q "X-Content-Type-Options\|nosniff" "$CONFIG_FILE" 2>/dev/null \
    && pass "X-Content-Type-Options: nosniff configurado" \
    || warn "X-Content-Type-Options não configurado (CWE-430)"

  grep -q "Permissions-Policy\|permissionsPolicy" "$CONFIG_FILE" 2>/dev/null \
    && pass "Permissions-Policy configurado" \
    || warn "Permissions-Policy não configurado"

  grep -q "productionBrowserSourceMaps.*false\|productionBrowserSourceMaps: false" "$CONFIG_FILE" 2>/dev/null \
    && pass "Source maps desabilitados em produção" \
    || warn "Source maps podem estar expostos em produção"

  # CSP sem unsafe-eval (prototype pollution + XSS defense)
  if grep -q "Content-Security-Policy" "$CONFIG_FILE" 2>/dev/null; then
    grep -q "unsafe-eval" "$CONFIG_FILE" 2>/dev/null \
      && warn "CSP contém 'unsafe-eval' — enfraquece defesa contra XSS e prototype pollution" \
      || pass "CSP sem 'unsafe-eval'"
  fi
else
  fail "next.config não encontrado — sem security headers!"
fi

# dangerouslySetInnerHTML (CWE-79 — XSS) — excluir linhas de comentário
DANGEROUS_HTML=$(grep -rn "dangerouslySetInnerHTML" --include="*.tsx" app/ components/ 2>/dev/null \
  | grep -v "node_modules" \
  | grep -v "^\S*:\s*\*\|^\S*:\s*\/\/" || true)
if [ -n "$DANGEROUS_HTML" ]; then
  DHTML_COUNT=$(echo "$DANGEROUS_HTML" | grep -c "." || echo 0)
  warn "$DHTML_COUNT dangerouslySetInnerHTML em código ativo — verificar sanitização com DOMPurify (CWE-79)"
  echo "$DANGEROUS_HTML" | while read -r line; do
    echo -e "    ${YELLOW}  → $line${NC}"
  done
else
  pass "Nenhum dangerouslySetInnerHTML em código ativo"
fi

# eval() e new Function() (CWE-94 — Code Injection)
EVAL_USAGE=$(grep -rn "eval(\|new Function(" --include="*.ts" --include="*.tsx" \
  app/ lib/ components/ 2>/dev/null | grep -v "node_modules\|\.d\.ts\|test\|spec" || true)
if [ -n "$EVAL_USAGE" ]; then
  fail "eval() ou new Function() encontrado — vetor de code injection! (CWE-94)"
  echo "$EVAL_USAGE"
else
  pass "Nenhum eval() ou new Function() no código de aplicação"
fi

# getSession() em Server Components (CWE-287 — Improper Authentication)
GET_SESSION=$(grep -rn "getSession()" --include="*.ts" --include="*.tsx" \
  app/ lib/ 2>/dev/null | grep -v "test\|spec\|node_modules" || true)
if [ -n "$GET_SESSION" ]; then
  SESS_COUNT=$(echo "$GET_SESSION" | wc -l | tr -d ' ')
  fail "$SESS_COUNT uso(s) de getSession() — deve usar getUser() em Server Components (CWE-287)!"
  echo "$GET_SESSION" | head -5 | while read -r line; do
    echo -e "    ${RED}  → $line${NC}"
  done
else
  pass "getSession() não encontrado — usando getUser() (correto)"
fi

# =========================================================
section "6. AUTH VALIDATION EM SERVER ACTIONS (OWASP A07 / CWE-862)"
# =========================================================

SERVER_ACTION_FILES=$(grep -rl "'use server'" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null || true)
if [ -n "$SERVER_ACTION_FILES" ]; then
  TOTAL_ACTIONS=$(echo "$SERVER_ACTION_FILES" | wc -l | tr -d ' ')
  ACTIONS_WITH_AUTH=0
  ACTIONS_WITHOUT_AUTH=""

  while IFS= read -r file; do
    if grep -q "auth\.getUser\|getUser()\|requireAdmin\|requireSuperAdmin" "$file" 2>/dev/null; then
      ACTIONS_WITH_AUTH=$((ACTIONS_WITH_AUTH + 1))
    else
      ACTIONS_WITHOUT_AUTH="$ACTIONS_WITHOUT_AUTH\n    ${YELLOW}→ $file${NC}"
    fi
  done <<< "$SERVER_ACTION_FILES"

  info "Server Actions: $TOTAL_ACTIONS | Com auth check: $ACTIONS_WITH_AUTH"

  if [ "$ACTIONS_WITH_AUTH" -eq "$TOTAL_ACTIONS" ]; then
    pass "Todas as Server Actions verificam autenticação"
  else
    MISSING_AUTH=$((TOTAL_ACTIONS - ACTIONS_WITH_AUTH))
    warn "$MISSING_AUTH Server Action(s) possivelmente sem verificação de auth (CWE-862):"
    echo -e "$ACTIONS_WITHOUT_AUTH"
    info "→ Verificar manualmente se são intencionalmente públicas"
  fi
else
  info "Nenhuma Server Action encontrada"
fi

# Mass Assignment (CWE-915)
MASS_ASSIGN=$(grep -rn "Object.fromEntries(formData)" --include="*.ts" --include="*.tsx" \
  app/ lib/ 2>/dev/null | grep -v "test\|spec" || true)
if [ -n "$MASS_ASSIGN" ]; then
  warn "Object.fromEntries(formData) encontrado — verificar mass assignment (CWE-915)"
  echo "$MASS_ASSIGN" | head -5 | while read -r line; do
    echo -e "    ${YELLOW}  → $line${NC}"
  done
else
  pass "Sem padrão óbvio de mass assignment"
fi

# Open Redirect (CWE-601)
OPEN_REDIRECT=$(grep -rn "redirect(" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null \
  | grep -E "searchParams\.get|formData\.get|params\." \
  | grep -v "redirect('/" \
  | grep -v "redirect(\`/" \
  | grep -v "safeNextPath\|safeRedirect" \
  | grep -v "node_modules\|test\|spec" || true)
if [ -n "$OPEN_REDIRECT" ]; then
  warn "Possível open redirect com input externo (CWE-601) — verificar uso de safeNextPath():"
  echo "$OPEN_REDIRECT" | head -5 | while read -r line; do
    echo -e "    ${YELLOW}  → $line${NC}"
  done
else
  pass "Nenhum redirect direto com input externo detectado"
fi

# =========================================================
section "7. RATE LIMITING E PROTEÇÃO DDOS (OWASP A04 / CWE-307, CWE-400)"
# =========================================================

# Pacote de rate limiting instalado
RATELIMIT_PKG=$(grep -E '"@upstash/ratelimit"|"rate-limit"|"express-rate-limit"' package.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$RATELIMIT_PKG" -gt 0 ]; then
  pass "Pacote de rate limiting encontrado em package.json"
else
  fail "Nenhum pacote de rate limiting! Endpoints vulneráveis a DDoS (CWE-400)"
fi

# Rate limiter implementado em código
RATELIMIT_CODE=$(grep -rl "ratelimit\|rateLimiter\|RateLimit\|checkAuthRateLimit\|checkApiRateLimit" \
  --include="*.ts" --include="*.tsx" lib/ app/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$RATELIMIT_CODE" -gt 0 ]; then
  pass "Rate limiting implementado em $RATELIMIT_CODE arquivo(s)"
else
  fail "Rate limiting não encontrado no código (CWE-307)"
fi

# CRÍTICO: Verificar fail-open vs fail-closed
if [ -f "lib/rate-limit.ts" ]; then
  FAIL_OPEN=$(grep -A5 "catch" lib/rate-limit.ts 2>/dev/null | { grep "success: true" || true; } | wc -l | tr -d ' ')
  if [ "$FAIL_OPEN" -gt 0 ]; then
    fail "Rate limiter FAIL-OPEN! catch retorna success: true — Redis indisponível = sem proteção!"
    { grep -n "success: true" lib/rate-limit.ts 2>/dev/null || true; } | while read -r line; do
      echo -e "    ${RED}  → $line${NC}"
    done
  else
    pass "Rate limiter fail-closed (catch não retorna success: true)"
  fi

  # Verificar se há rateLimitUnavailable ou similar
  FAIL_CLOSED=$(grep -c "success: false\|rateLimitUnavailable\|fail.*closed" lib/rate-limit.ts 2>/dev/null || echo 0)
  [ "$FAIL_CLOSED" -gt 0 ] && pass "Padrão fail-closed identificado em lib/rate-limit.ts" \
    || warn "Verificar manualmente o comportamento no catch de lib/rate-limit.ts"
fi

# Queries sem LIMIT (CWE-400 — Resource Exhaustion)
UNLIMITED_QUERIES=$(grep -rn "\.select(" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null \
  | { grep -v "\.limit\|\.range\|\.single\|maybeSingle\|count.*head.*true\|count.*exact" || true; } \
  | { grep -v "node_modules\|test\|spec\|\.d\.ts" || true; } \
  | wc -l | tr -d ' ')
if [ "$UNLIMITED_QUERIES" -gt 100 ]; then
  # Threshold alto: .range()/.limit() podem estar em linha seguinte; este grep é orientativo
  info "$UNLIMITED_QUERIES linhas com .select() sem LIMIT/range/single na mesma linha — verificar paginação em listagens públicas"
elif [ "$UNLIMITED_QUERIES" -gt 0 ]; then
  info "$UNLIMITED_QUERIES queries sem LIMIT aparente — confirmar manualmente que listagens têm paginação"
else
  pass "Queries com LIMIT/range/single detectados em todos os casos"
fi

# =========================================================
section "8. MIDDLEWARE E PROTEÇÃO DE ROTAS (OWASP A01)"
# =========================================================

MW_FILE=""
for f in middleware.ts src/middleware.ts app/middleware.ts; do
  [ -f "$f" ] && MW_FILE="$f" && break
done

if [ -n "$MW_FILE" ]; then
  pass "middleware.ts encontrado: $MW_FILE"

  grep -q "getUser\|auth\|session\|refreshSession\|updateSession" "$MW_FILE" 2>/dev/null \
    && pass "Middleware verifica/atualiza sessão de autenticação" \
    || fail "Middleware pode não verificar autenticação! (CWE-306)"

  grep -q "matcher\|config.*export" "$MW_FILE" 2>/dev/null \
    && pass "Middleware tem matcher configurado" \
    || warn "Middleware sem matcher explícito — cobertura de rotas indefinida"

  grep -q "ratelimit\|rateLimiter\|checkAuthRateLimit" "$MW_FILE" 2>/dev/null \
    && pass "Rate limiting no middleware" \
    || info "Rate limiting não detectado no middleware (pode estar nas actions)"
else
  fail "middleware.ts NÃO encontrado — rotas desprotegidas! (CWE-306)"
fi

# =========================================================
section "9. DEPENDÊNCIAS E SUPPLY CHAIN (OWASP A03 / CWE-1357)"
# =========================================================

# Lockfile
if [ -f "package-lock.json" ]; then
  pass "package-lock.json encontrado"
elif [ -f "pnpm-lock.yaml" ]; then
  pass "pnpm-lock.yaml encontrado"
elif [ -f "yarn.lock" ]; then
  pass "yarn.lock encontrado"
else
  fail "Nenhum lockfile! Versões de dependências não são determinísticas (CWE-1357)"
fi

# npm audit
if command -v npm &> /dev/null && [ -f "package.json" ]; then
  info "Executando npm audit (aguarde)..."
  AUDIT_OUTPUT=$(npm audit --omit=dev 2>&1 || true)

  AUDIT_CRITICAL=$(echo "$AUDIT_OUTPUT" | awk '/critical/{c++} END{print c+0}')
  AUDIT_HIGH=$(echo "$AUDIT_OUTPUT" | awk '/ high/{c++} END{print c+0}')
  AUDIT_MODERATE=$(echo "$AUDIT_OUTPUT" | awk '/moderate/{c++} END{print c+0}')

  if [ "$AUDIT_CRITICAL" -gt 0 ]; then
    fail "npm audit: $AUDIT_CRITICAL vulnerabilidade(s) CRÍTICA(S) em dependências!"
    echo "$AUDIT_OUTPUT" | grep -A3 "critical" | head -20
  elif [ "$AUDIT_HIGH" -gt 0 ]; then
    warn "npm audit: $AUDIT_HIGH vulnerabilidade(s) alta(s) — corrigir em 48h"
    echo "$AUDIT_OUTPUT" | grep -A2 " high" | head -10
  elif [ "$AUDIT_MODERATE" -gt 0 ]; then
    info "npm audit: $AUDIT_MODERATE vulnerabilidade(s) moderada(s) — planejar correção"
    pass "npm audit: sem vulnerabilidades altas ou críticas"
  else
    pass "npm audit: sem vulnerabilidades altas ou críticas"
  fi
fi

# =========================================================
section "10. VALIDAÇÃO DE INPUT (OWASP A04 / CWE-20)"
# =========================================================

ZOD_INSTALLED=$(grep '"zod"' package.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$ZOD_INSTALLED" -gt 0 ]; then
  pass "Zod instalado"

  ZOD_USAGE=$(grep -rl "z\.object\|z\.string\|z\.number\|z\.enum\|\.safeParse\|\.parse(" \
    --include="*.ts" --include="*.tsx" lib/ app/ 2>/dev/null | wc -l | tr -d ' ')
  info "Arquivos usando Zod: $ZOD_USAGE"

  [ "$ZOD_USAGE" -lt 3 ] \
    && warn "Poucos arquivos com Zod — validação server-side pode estar ausente (CWE-20)" \
    || pass "Zod usado em $ZOD_USAGE arquivo(s)"
else
  fail "Zod não instalado — sem validação de schema padronizada (CWE-20)"
fi

# =========================================================
section "11. PROTOTYPE POLLUTION E INJECTION (CWE-1321, CWE-94)"
# =========================================================

# Prototype pollution patterns
PROTO_POLLUTION=$(grep -rn "__proto__\|constructor\[.prototype.\]\|Object\.setPrototypeOf" \
  --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>/dev/null | grep -v "node_modules\|\.d\.ts" || true)
if [ -n "$PROTO_POLLUTION" ]; then
  warn "Padrões potenciais de prototype pollution encontrados (CWE-1321)"
  echo "$PROTO_POLLUTION" | head -5
else
  pass "Nenhum padrão óbvio de prototype pollution"
fi

# JSON.parse sem validação (CWE-502)
JSON_PARSE=$(grep -rn "JSON\.parse(" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null \
  | grep -v "node_modules\|test\|spec\|\.d\.ts" || true)
if [ -n "$JSON_PARSE" ]; then
  JP_COUNT=$(echo "$JSON_PARSE" | wc -l | tr -d ' ')
  info "$JP_COUNT JSON.parse() encontrados — verificar se têm validação Zod após o parse"
else
  pass "Nenhum JSON.parse() detectado em código de aplicação"
fi

# SSRF (CWE-918)
SSRF=$(grep -rn "fetch(" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null \
  | grep -v "node_modules\|test\|spec\|localhost\|127\.\|supabase\.co\|vercel\." \
  | grep -E "formData\.|searchParams\.|userInput|params\." || true)
if [ -n "$SSRF" ]; then
  warn "Possível SSRF — fetch() com URL potencialmente controlada pelo usuário (CWE-918):"
  echo "$SSRF" | head -5 | while read -r line; do
    echo -e "    ${YELLOW}  → $line${NC}"
  done
else
  pass "Nenhum padrão óbvio de SSRF detectado"
fi

# =========================================================
section "RESULTADO FINAL"
# =========================================================

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║         RESULTADO DA AUDITORIA v2.0                ║${NC}"
echo -e "${BOLD}╠════════════════════════════════════════════════════╣${NC}"
printf "${BOLD}║${NC}  ${GREEN}✅ Passou:   %3d${NC}\n" "$PASSED"
printf "${BOLD}║${NC}  ${YELLOW}⚠️  Warnings: %3d${NC}\n" "$WARNINGS"
printf "${BOLD}║${NC}  ${RED}❌ Críticos: %3d${NC}\n" "$CRITICAL"
echo -e "${BOLD}╠════════════════════════════════════════════════════╣${NC}"

TOTAL=$((PASSED + WARNINGS + CRITICAL))
if [ "$TOTAL" -gt 0 ]; then
  SCORE=$(( (PASSED * 100) / TOTAL ))
else
  SCORE=0
fi

if [ "$CRITICAL" -gt 0 ]; then
  echo -e "${BOLD}║${NC}  ${RED}VEREDICTO: ❌ NÃO APROVADO PARA PRODUÇÃO${NC}"
  echo -e "${BOLD}║${NC}  ${RED}Score: $SCORE/100 — $CRITICAL item(ns) crítico(s) BLOQUEIAM deploy${NC}"
  EXIT_CODE=1
elif [ "$WARNINGS" -gt 5 ]; then
  echo -e "${BOLD}║${NC}  ${YELLOW}VEREDICTO: ⚠️  APROVADO COM RESSALVAS${NC}"
  echo -e "${BOLD}║${NC}  ${YELLOW}Score: $SCORE/100 — Resolver $WARNINGS warning(s) antes do lançamento${NC}"
  EXIT_CODE=2
else
  echo -e "${BOLD}║${NC}  ${GREEN}VEREDICTO: ✅ APROVADO${NC}"
  echo -e "${BOLD}║${NC}  ${GREEN}Score: $SCORE/100 — $WARNINGS warning(s) menores${NC}"
  EXIT_CODE=0
fi

echo -e "${BOLD}╠════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  Cobertura: OWASP Top 10 2025 | CWE Top 25 (2024)   ${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  CVEs: Next.js | Supabase | Node.js stack            ${BOLD}║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Relatório gerado em: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Próximo passo: atualizar revisao_seguranca.md na raiz do projeto"
echo ""

exit $EXIT_CODE
