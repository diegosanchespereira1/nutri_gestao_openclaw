# Revisão de Segurança — NutriGestão

> Documento vivo. Atualizar a cada ciclo de revisão.
> Última revisão: 2026-05-29

---

## Metodologia

A revisão cobre as seguintes categorias (baseada em OWASP Top 10 + contexto SaaS multitenant):

- Injeção (SQL, command)
- Autenticação e gestão de sessão
- Controlo de acesso / IDOR
- Configuração de segurança
- Rate limiting / DoS
- Redirecionamentos abertos
- Exposição de dados sensíveis
- RLS (Row Level Security) do Supabase
- Service role desnecessário

---

## Itens corrigidos ✅

### 1. Open Redirect no callback de autenticação

- **Ficheiro:** `app/api/auth/callback/route.ts`
- **Risco:** Um atacante poderia forjar um link `?next=https://site-malicioso.com` e redirecionar vítimas após login OAuth/magic link.
- **Correção:** Criada função `safeNextPath` em `lib/auth/safe-next-path.ts` que valida que o destino é sempre um path relativo interno (começa com `/`, não começa com `//`, não contém `:` ou `\`). O callback agora usa `const next = safeNextPath(searchParams.get("next"))`.
- **Verificado em:** 2026-05-29

---

### 2. Rate limiters "fail-open" (Redis indisponível)

- **Ficheiro:** `lib/rate-limit.ts`
- **Risco:** Se o Redis/Upstash ficasse indisponível, todos os rate limiters retornavam `success: true` — permitindo ataques de força bruta sem restrição.
- **Correção:** Criado helper `rateLimitUnavailable(retryAfterSeconds)` que retorna `success: false, remaining: 0`. Todos os 3 `catch` agora usam este helper (fail-closed):
  - `checkAuthRateLimit` → `rateLimitUnavailable(60)`
  - `checkPasswordResetRateLimit` → `rateLimitUnavailable(3600)`
  - `checkApiRateLimit` → `rateLimitUnavailable(60)`
- **Verificado em:** 2026-05-29

---

### 3. IDOR no endpoint de download de PDF (checklist dossier)

- **Ficheiro:** `app/api/checklists/dossier-pdf/[jobId]/route.ts`
- **Risco:** Qualquer utilizador autenticado podia aceder ao PDF de qualquer outro tenant bastando conhecer/adivinhar um `jobId` (UUID previsível via sequência ou enumeração).
- **Correção:** Após autenticar o utilizador, o endpoint verifica a cadeia de propriedade: `pdf_export → fill_session → establishment → client → owner_user_id` e confronta com `workspaceOwnerId` do utilizador. Se não coincidir, retorna 403.
- **Verificado em:** 2026-05-29

---

### 4. Service Role desnecessário em `loadPlatformMetrics`

- **Ficheiro:** `lib/actions/admin-platform.ts` — função `loadPlatformMetrics`
- **Risco:** A função obtinha um client de service role (bypass total de RLS) desnecessariamente, pois a view `admin_platform_metrics` já estava protegida por RLS e `requireSuperAdmin()` já devolvia um client autenticado.
- **Correção:** `loadPlatformMetrics` agora usa `const { supabase } = await requireSuperAdmin()` em vez de `createServiceRoleClient()`. O service role continua a ser usado apenas em `createTenantAsAdminAction` (criação de utilizadores via `auth.admin.createUser` — caso legítimo).
- **Verificado em:** 2026-05-29

---

### 5. RLS de avaliações nutricionais excluía pacientes independentes

- **Ficheiro:** Migration `20260725100003_fix_assessment_rls_for_independent_patients.sql`
- **Risco:** A política RLS da tabela `patient_nutrition_assessments` fazia JOIN via `clients` para verificar propriedade. Pacientes sem `client_id` (independentes) nunca passavam a verificação → inserções e leituras falhavam silenciosamente.
- **Correção:** Política reescrita para verificar `patient.user_id` diretamente via `workspace_account_owner_id()`, sem depender da existência de `client_id`.
- **Verificado em:** 2026-05-29

---

## Itens monitorizados — sem ação imediata necessária

| # | Área | Descrição | Estado |
|---|------|-----------|--------|
| A | SQL Injection | Todas as queries usam o cliente Supabase com placeholders parametrizados. Nenhum `.rpc()` ou `.sql()` raw com interpolação de string encontrado. | OK |
| B | Autenticação | `supabase.auth.getUser()` (verifica JWT no servidor) usado consistentemente. Nunca `getSession()` em Server Actions. | OK |
| C | Isolamento multitenant | `workspace_account_owner_id()` usada na maioria das RLS policies. | OK |
| D | Tokens API | `api_tokens` com `revoked_at` e `last_used_at`. Sem expiração automática configurada — adicionar `expires_at` é recomendado no futuro. | A melhorar |
| E | CSP / Headers | Verificar se `next.config` tem `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`. | A verificar |
| F | LGPD / Deleção de dados | `account-deletion` action existe. Verificar se cobre todas as tabelas com dados pessoais. | A verificar |

---

## Próximos itens a avaliar (backlog)

- [ ] Adicionar `expires_at` aos `api_tokens` e invalidar automaticamente tokens expirados
- [ ] Auditar CSP headers em `next.config.ts` / `middleware.ts`
- [ ] Rever política RLS de `checklist_fill_sessions` — confirmar que tenants não acedem a sessões de outros
- [ ] Verificar se uploads de foto (`fill-session-photo/route.ts`) validam tipo MIME e tamanho máximo
- [ ] Adicionar audit log para ações de admin (suspensão, mudança de plano) — actualmente só em `subscription_events`, sem integridade garantida
- [ ] Rever `admin_platform_metrics` — confirmar que é uma VIEW e não uma tabela editável por tenants

---

## Como executar a próxima revisão

1. Ler este ficheiro para entender o estado atual
2. Fazer `grep -r "createServiceRoleClient" lib/ app/ --include="*.ts"` — confirmar que só aparece onde é legítimo
3. Fazer `grep -r "getSession()" lib/ app/ --include="*.ts"` — deve retornar vazio (deve usar `getUser()`)
4. Rever migrations novas desde a última revisão
5. Verificar se novos endpoints de API têm verificação de propriedade (IDOR check)
6. Atualizar a secção "Verificado em" de cada item e adicionar novos itens encontrados
