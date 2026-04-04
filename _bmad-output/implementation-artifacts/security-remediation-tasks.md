# Tasks — correções de segurança (pós-auditoria NutriGestão)

**Origem:** auditoria estática (OWASP, RLS, Next.js, LGPD).  
**Objetivo:** fechar gaps antes de exposição pública relevante.

**Implementado no código (2026-04-03):** SEC-01, SEC-02 (migração), SEC-03, SEC-05, SEC-06 (UI + nota `.env.example`), SEC-07 (`loadPatientById` + Zod em import), SEC-08, SEC-10 (CI + Dependabot).  
**Pendente:** SEC-04 (rate limiting), SEC-09 (auditoria estruturada), SEC-11 (LGPD operacional). Migração SQL: aplicar com `supabase db push` / pipeline. Dashboard Supabase: política de password ≥12.

---

## Legenda

- **Bloqueante:** deve estar feito antes de produção pública.
- **Alta:** na mesma sprint que o go-live ou imediatamente a seguir.
- **Média:** próxima sprint.
- **Contínua:** processo / backlog.

---

## TASK-SEC-01 — Open redirect no login (`next`)

| Campo | Valor |
|--------|--------|
| Prioridade | Bloqueante |
| OWASP | A01 / phishing |

**Descrição:** Validar o parâmetro `next` no fluxo de login (e 2FA) como em `app/auth/callback/route.ts`: apenas path relativo seguro (`/` + não `//`), fallback `/inicio`.

**Ficheiros prováveis:** `components/auth/login-form.tsx`; extrair helper partilhado (ex.: `lib/auth/safe-next-path.ts`) usado por callback e login.

**Critérios de aceitação:**

- [ ] `/login?next=https://evil.com` após autenticação com sucesso não redireciona para domínio externo.
- [ ] `/login?next=//evil.com` rejeitado.
- [ ] `/login?next=/visitas` continua a funcionar.
- [ ] Mesma regra aplicada após verificação MFA (`window.location.assign` / navegação).

---

## TASK-SEC-02 — RLS `scheduled_visits`: UPDATE alinhado ao INSERT

| Campo | Valor |
|--------|--------|
| Prioridade | Bloqueante |
| OWASP | A01 (controlo de acesso / integridade) |

**Descrição:** Nova migração SQL que substitui ou complementa a policy `scheduled_visits_update_own` para que o `WITH CHECK` exija as mesmas condições de `establishment_id` / `patient_id` / `target_type` que o `INSERT` (pertencer ao `owner` via `clients`).

**Ficheiros prováveis:** `supabase/migrations/YYYYMMDDHHMMSS_scheduled_visits_update_policy.sql`

**Critérios de aceitação:**

- [ ] Utilizador A não consegue `UPDATE` uma visita própria para `patient_id` ou `establishment_id` de tenant B (teste manual ou teste SQL com dois `auth.uid()` simulados se existir harness).
- [ ] `user_id` continua imutável em relação a outro utilizador (`WITH CHECK` mantém `user_id = auth.uid()`).
- [ ] Fluxos UI existentes (editar visita, alterar alvo dentro do mesmo tenant) continuam a funcionar.

---

## TASK-SEC-03 — Headers de segurança (Next.js)

| Campo | Valor |
|--------|--------|
| Prioridade | Bloqueante |
| OWASP | A02 / A08 |

**Descrição:** Configurar `headers` em `next.config.ts` (ou equivalente suportado pela versão em uso): `Strict-Transport-Security` (apenas em produção), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva. CSP: fase 1 permissiva com `upgrade-insecure-requests` + regras para `self` e domínios Supabase; evoluir para nonces quando viável.

**Ficheiros prováveis:** `next.config.ts`

**Critérios de aceitação:**

- [ ] Respostas HTML da app incluem os headers acima (verificar com `curl -I` ou DevTools).
- [ ] Login, callback Supabase e assets `_next` não ficam quebrados (ajustar CSP iterativamente).
- [ ] HSTS não ativo em `development` local HTTP (evitar bloquear devs).

---

## TASK-SEC-04 — Rate limiting (borda + rotas sensíveis)

| Campo | Valor |
|--------|--------|
| Prioridade | Alta |
| OWASP | A04 / A07 |

**Descrição:** Implementar limitação de taxa alinhada ao PRD/NFR: login/signup/recuperação, API routes relevantes, Server Actions pesadas (import). Opções: Upstash Redis + `@upstash/ratelimit`, ou Vercel Edge Config + KV, ou Cloudflare Rules (documentar onde vive a política).

**Ficheiros prováveis:** `middleware.ts` (ou wrappers por rota), `.env.example`, documentação de variáveis.

**Critérios de aceitação:**

- [ ] Limite aplicado a tentativas de login por IP (ex.: 5/min — ajustar ao PRD).
- [ ] Limite para `forgot-password` / fluxo de email (ex.: 3/hora por IP ou por email conforme desenho).
- [ ] Import / uploads com limite por utilizador autenticado (ex.: NFR13 escrita/upload).
- [ ] Resposta `429` clara, sem vazar estado interno.
- [ ] Variáveis de ambiente documentadas em `.env.example`.

---

## TASK-SEC-05 — Middleware: todas as rotas `(app)` protegidas

| Campo | Valor |
|--------|--------|
| Prioridade | Alta |
| OWASP | A01 |

**Descrição:** Incluir em `PROTECTED_PREFIXES` todos os prefixos da área autenticada hoje em falta: `/pacientes`, `/checklists`, `/importar`, `/equipe` (e qualquer novo prefixo sob `app/(app)/`).

**Ficheiros prováveis:** `lib/auth-paths.ts`

**Critérios de aceitação:**

- [ ] Acesso anónimo a `/pacientes`, `/checklists`, `/importar`, `/equipe` redireciona para `/login?next=...`.
- [ ] Rotas públicas (`/`, `/login`, `/register`, `/forgot-password`, `/auth/*`) inalteradas.
- [ ] Comentário no ficheiro: ao adicionar nova rota em `(app)`, atualizar lista ou migrar para estratégia “default deny” para segmento `(app)`.

---

## TASK-SEC-06 — Política de palavras-passe e enumeração no registo

| Campo | Valor |
|--------|--------|
| Prioridade | Média |
| OWASP | A07 |

**Descrição:** (1) Aumentar mínimo da palavra-passe no UI para **12** caracteres (alinhar OWASP/skill); espelhar política no **Supabase Dashboard** (Authentication → Password). (2) Registo: mensagem genérica para email já existente (mesmo texto que “email disponível — confirme caixa de entrada”), sem revelar se o email está registado.

**Ficheiros prováveis:** `components/auth/register-form.tsx`; nota em `.env.example` ou doc interna sobre Dashboard.

**Critérios de aceitação:**

- [ ] Registo com palavra-passe &lt; 12 caracteres rejeitado no cliente com mensagem clara.
- [ ] Supabase rejeita palavras-passe abaixo do mínimo configurado (confirmar após alterar Dashboard).
- [ ] Tentativa de registo com email duplicado não mostra “já está registado” de forma distinta do fluxo de sucesso genérico.

---

## TASK-SEC-07 — Defesa em profundidade nas Server Actions (auth + validação)

| Campo | Valor |
|--------|--------|
| Prioridade | Média |
| OWASP | A04 / A08 |

**Descrição:** (1) `loadPatientById` (e loaders similares sem `getUser`): chamar `getUser()` e retornar vazio/redirect consistente. (2) Plano incremental: introduzir **Zod** nas actions de maior risco (import, pacientes, clientes, visitas) com schemas partilhados em `lib/validators/` ou similar.

**Ficheiros prováveis:** `lib/actions/patients.ts`, outras actions identificadas por grep `createClient` sem `getUser` imediato.

**Critérios de aceitação:**

- [ ] `loadPatientById` não devolve dados sem sessão autenticada (comportamento explícito, não só RLS).
- [ ] Pelo menos **uma** action de escrita de alto risco validada com Zod (definir qual na implementação).
- [ ] Lista curta no PR de outras actions candidatas a Zod na sprint seguinte.

---

## TASK-SEC-08 — MFA: eliminar `dangerouslySetInnerHTML` no QR

| Campo | Valor |
|--------|--------|
| Prioridade | Média |
| OWASP | A03 / XSS |

**Descrição:** Garantir que o QR TOTP é sempre renderizado via `data:` URL (`<img>`) ou SVG inline seguro; remover ramo `dangerouslySetInnerHTML` ou sanitizar com biblioteca adequada se a API exigir HTML.

**Ficheiros prováveis:** `components/mfa-settings.tsx`

**Critérios de aceitação:**

- [ ] Sem `dangerouslySetInnerHTML` para conteúdo derivado de API, ou sanitização auditável.
- [ ] Fluxo “Ativar 2FA” continua funcional.

---

## TASK-SEC-09 — Logging e auditoria (fase 1)

| Campo | Valor |
|--------|--------|
| Prioridade | Média |
| OWASP | A09 / LGPD |

**Descrição:** Substituir `console.error` solto em paths sensíveis por logger estruturado (nível, código, `requestId` quando existir). Definir eventos mínimos de auditoria para mutações em dados de paciente (quem, quando, recurso, ação) — tabela `audit_log` ou serviço externo; FR62.

**Ficheiros prováveis:** `lib/actions/import.ts`, novos `lib/audit/*`, migração se persistir em BD.

**Critérios de aceitação:**

- [ ] Logs de servidor não incluem PII em claro (CPF, notas clínicas); mascarar ou omitir.
- [ ] Documento ou comentário de retenção alinhado a NFR15 (12 meses) — implementação completa pode ser TASK-SEC-09b.

---

## TASK-SEC-10 — CI e Dependabot

| Campo | Valor |
|--------|--------|
| Prioridade | Média |
| OWASP | A03 / A06 |

**Descrição:** Workflow GitHub Actions: `npm ci`, `npm run lint`, `npm audit` (falha em high/critical configurável). Ativar **Dependabot** para `npm` (e opcionalmente GitHub Security advisories).

**Ficheiros prováveis:** `.github/workflows/ci.yml`, `.github/dependabot.yml`

**Critérios de aceitação:**

- [ ] PRs bloqueados ou alertados conforme política de vulnerabilidades.
- [ ] `npm run build` opcional no CI se o tempo for aceitável.

---

## TASK-SEC-11 — LGPD operacional (backlog produto + legal)

| Campo | Valor |
|--------|--------|
| Prioridade | Contínua |
| OWASP / LGPD | A09 + Art. 11 |

**Descrição:** Itens não só código: consentimento explícito dados de saúde, DPO, plano de incidente (72h ANPD), exportação/portabilidade/exclusão de conta (FR64–FR69), retenção 5 anos pós-contrato (NFR27). Mapear cada FR a story/epic existente ou criar novas.

**Critérios de aceitação:**

- [ ] Matriz FR ↔ implementação ↔ responsável.
- [ ] “Definition of Done” de produção inclui checklist LGPD mínimo.

---

## Ordem sugerida de execução

1. TASK-SEC-01, TASK-SEC-02, TASK-SEC-03 (bloqueantes rápidos de alto impacto).  
2. TASK-SEC-05, TASK-SEC-04 (superfície de ataque e abuso).  
3. TASK-SEC-06, TASK-SEC-07, TASK-SEC-08.  
4. TASK-SEC-09, TASK-SEC-10 em paralelo.  
5. TASK-SEC-11 contínuo com PM/legal.

---

## Após conclusão

- [ ] Reexecutar checklist da skill `nutrigestao-security` (fases 1–4 mínimo).  
- [ ] Agendar pentest externo antes de lançamento com dados reais de pacientes.
