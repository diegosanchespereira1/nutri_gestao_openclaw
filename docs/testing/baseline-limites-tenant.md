# Baseline de regressão — plano de limites/retenção/billing

Medido em **2026-08-31**, antes das alterações de comportamento do plano
`docs/plano-limites-tenant-e-billing.md`. Reproduzir com `./scripts/qa/baseline.sh`.

## Estado atual (após Fase 0, T1, T2, T3, T4 e T5)

| Verificação | Comando | Antes da T0.2 | Agora |
|---|---|---|---|
| Testes unitários | `npm run test` | 113 arquivos, **888 testes**, 0 falhas | 121 arquivos, **1005 testes**, 0 falhas ✅ |
| Typecheck | `npx tsc --noEmit` | **16 erros** em 5 arquivos | **0 erros** ✅ |
| Lint | `npm run lint` | **5 erros + 15 avisos** (exit 1) | **0 erros + 15 avisos** (exit 0) ✅ |
| RLS multi-tenant | `npm run test:rls` | 3 arquivos; exige `npx supabase start` | idem |
| E2E | `npm run test:e2e` | 11 specs; `auth-*` pulados sem os secrets `E2E_*` | idem |

## Lint: o que foi corrigido na T0.2b

`npm run lint` saía com **exit 1** e 5 erros, todos em código já commitado — não vieram deste plano:

| Arquivo | Erro | Correção |
|---|---|---|
| `components/checklists/workspace-checklist-builder.tsx:160` | ref escrito durante o render | movido para `useEffect` — o ref só é lido em callbacks assíncronos (`runAutosave`), depois do commit |
| `components/clientes/client-form.tsx:338` | setState síncrono em effect | `eslint-disable` com justificativa: o reset do watchdog **precisa** ser síncrono ao sair de "salvando" |
| `components/clientes/establishment-type-select.tsx:72` | setState síncrono em effect | `eslint-disable` com justificativa: reflete a prop de imediato, senão o select pisca vazio ao trocar de categoria |
| `components/clientes/client-available-checklists-list.tsx:123` (×2) | aspas sem escape | `&quot;` |

Os dois `eslint-disable` seguem o padrão já estabelecido no projeto (mesma regra é desativada com
justificativa em `patient-form.tsx`, `create-tenant-wizard.tsx`, `mobile-bottom-nav.tsx` e outros).
Refatorar esses dois efeitos de verdade mexeria em lógica de formulário sensível — fica fora do escopo
de uma tarefa cujo objetivo é tornar o gate confiável.

Restam **15 avisos** (não bloqueiam). O gate agora exige **lint exit 0**.

## Typecheck: o que foi corrigido na T0.2

Os 16 erros eram todos em arquivos de teste/seed, com fixtures que ficaram para trás dos tipos:

- `tests/rls/admin-template-write.test.ts` (7) — `PostgrestFilterBuilder` é *thenable*, não `Promise`;
  o parâmetro do helper virou `PromiseLike`.
- `lib/visits/agenda-access.test.ts` (4) — papel `"member"` não existe em `ProfileRole`; trocado por
  `"user"`, que cai no mesmo ramo de `canAccessAdminArea` (comportamento idêntico, 14 testes seguem verdes).
- `lib/utils/nutrition-assessment-display.test.ts` (3) — fixtures com colunas que o tipo não tem
  (`user_id`, `nutritional_diagnosis`, `created_at`, `updated_at`, nenhuma lida pelo módulo) e faltando
  `goals`.
- `lib/checklists/filter-templates.test.ts` (1) — fixture parcial; cast via `unknown`, padrão já usado em
  `save-batch.test.ts`.
- `scripts/database/seed-tenant4-assessments-dev.spec.ts` (1) — 4 parâmetros WHO adicionados a
  `ChildAssessmentInput` depois do seed; passados como `null`.

`npx tsc --noEmit` entrou no job `check` do `.github/workflows/ci.yml` — antes o CI não rodava typecheck,
que é como esses 16 erros passaram despercebidos.


## T0.4 — o que já foi extraído

| Módulo novo | Origem | Testes |
|---|---|---|
| `lib/clientes/parse-client-fields.ts` | `lib/actions/clients.ts` — `parseKind`, `parseDocument`, `sanitizeSearchWildcards`, `escapeIlikeValue` | 13 |
| `lib/team/parse-team-member-fields.ts` | `lib/actions/team-members.ts` — `parseProfessionalArea`, `hasSpecialCharacter`, `mapCreateAuthErrorToParam`, `mapCreateAuthErrorReason` | 12 |

Refactor puro: as Server Actions passaram a importar dos novos módulos e as definições locais foram
removidas (`clients.ts` −23 linhas, `team-members.ts` −46). Nenhuma expectativa de teste existente mudou.

Falta extrair: parsers de `lib/actions/patients.ts` e a decisão de exclusão
(`lib/patients/delete-patient-decision.ts`), que só faz sentido junto com a T9c.


## T0.5 — E2E dos fluxos que a T2/T3/T9c alteram

`e2e/auth-cadastros-basicos.spec.ts`, 4 testes:

1. cliente PF — criar → aparecer na lista → eliminar (cobre `createClientAction` pf + `deleteClientAction`)
2. paciente independente — criar → aparecer na lista → eliminar (cobre `createPatientAction` + `deletePatientAction`)
3. formulário de cliente mantém os campos e o botão **habilitado** (linha de base para a T5, que passa a desabilitar no limite)
4. idem para o formulário de paciente

Cada teste usa sufixo único por execução (`E2E-<base36>`) e limpa o que cria. Os botões de exclusão usam
`window.confirm`, aceito automaticamente via `page.on("dialog")`.

**Fora do escopo, de propósito:** cliente PJ com estabelecimento (categoria, tipo, UF, validação contra
`enabled_modules` — quebra por motivos que nada têm a ver com limites) e criação de membro de equipe
(cria um usuário real no Auth, difícil de limpar). O limite de equipe é coberto na suíte RLS, onde
seed e teardown são controlados.

> ⚠️ **Ainda não executada contra ambiente real.** A spec compila (`tsc` 0 erros) e o Playwright a lista,
> mas a VM onde este trabalho correu não tem os browsers do Playwright nem espaço em disco para instalá-los.
> Rodar antes de começar a T1:
> ```bash
> npm run test:e2e -- e2e/auth-cadastros-basicos.spec.ts
> ```
> Se algum seletor estiver errado, corrigir **agora** — o valor da rede está em ela ser verde antes das
> mudanças, não depois.


## T1–T3 — o que entrou

**Migrations** (nenhuma aplicada ainda):

| Arquivo | Conteúdo |
|---|---|
| `20261001120000_profiles_tenant_document.sql` | CPF/CNPJ do tenant, único global |
| `20261001121000_tenant_limits.sql` | tabela, RLS, trigger de criação, backfill desligado |
| `20261001122000_subscription_events_limit_types.sql` | novos event_type |
| `20261001123000_tenant_scoped_document_uniqueness.sql` | únicos de paciente + membro em um só workspace |
| `20261003120000_profiles_document_grants.sql` | grant de UPDATE + trigger `profiles_document_guard` (T6) |
| ~~`20261001124000_clients_document_uniqueness.sql`~~ | **removida** — CNPJ repetido em clientes é legítimo (unidades da mesma empresa); virou aviso no formulário |
| `20261002120000_tenant_limits_enforcement.sql` | trigger de limite + `tenant_has_free_patient_slot` |

**Testes RLS novos** (exigem `npx supabase start`): `tenant-limits.test.ts` (8) e
`tenant-limits-enforcement.test.ts` (12) — matriz completa de limites, equipe desabilitada, ilimitado,
membro inativo não ocupa assento, e a reativação bloqueada.

**Camada TypeScript**: `lib/limits/tenant-limits.ts` com a decisão pura (`decideTenantLimit`,
`tenantLimitMessage`, `mapPgLimitError`, `remainingSlots`) coberta por **22 testes**, e a parte de I/O
(`loadTenantLimits`, `countTenantUsage`, `checkTenantLimit`).

**Integração**: pré-checagem + tradução do erro do trigger em `createClientAction`,
`createPatientAction`, `createTeamMemberAction` e `onboarding.ts`.
Em `createTeamMemberAction` a pré-checagem vem **antes** de criar o usuário no Auth — senão cada tentativa
sem assento livre deixaria um usuário órfão no GoTrue.

**T4 (completa)**: card "Limites e assentos" na ficha do tenant (uso atual, avisos quando o limite fica
abaixo do uso, formulário), `updateTenantLimitsAction` + `loadTenantLimitsWithUsage` com evento
`limits_changed`, chips `C 18/25 · P 40/∞ · E 3/5` + documento na lista, e a etapa **Limites** no
`CreateTenantWizard` (agora 5 etapas), refletida no diálogo de confirmação e gravada por
`createTenantAsAdminAction`.

Módulos puros e seus testes: `tenant-limits-form.ts` (16), `tenant-limits-summary.ts` (9),
`tenant-limits-defaults.ts` (3 — **lê o SQL da migration e compara**, para wizard e banco não divergirem),
`readLimitsSummary` (4).

> A verificação em navegador do wizard ainda não foi feita — não há como rodar E2E neste ambiente.

**T5**: `LimitUsageBadge` (`18/25 clientes`, âmbar quando faltam ≤3, vermelho no limite) e
`NewRecordButton` (desabilita com o motivo no `title`) nas páginas de clientes, pacientes e equipe.
`/equipe` mostra um estado explicativo quando o cadastro não está habilitado — em vez de redirecionar
para o dashboard sem contexto — e as rotas internas (`/equipe/nova`, `/equipe/[id]/editar`) voltam
para lá. `buildLimitUiState` é pura, com 7 testes.

**Bug corrigido no caminho**: `getClientIp` mutilava IPv6 antes de gravar em coluna `inet`
(ver `bug-getclientip-ipv6` na memória do projeto). Consolidado em `lib/ip/client-ip-utils.ts`, +13 testes.

## Lacunas conhecidas na cobertura

`vitest.config.ts` inclui apenas `lib/**/*.test.ts` e a cobertura exclui `lib/actions/**`.
As Server Actions alteradas pelo plano (`clients.ts`, `patients.ts`, `team-members.ts`, `onboarding.ts`,
`admin-platform.ts`) **não têm teste unitário**. A rede para elas é `tests/rls/` + `e2e/` — ambas fora do
CI padrão. É o que as tarefas T0.3–T0.5 resolvem.

## Nota sobre a árvore de trabalho

Havia **58 arquivos já modificados e não commitados** antes deste trabalho começar. Não foram tocados.
Ao revisar o diff, separar o que é deste plano do que já estava em andamento.

## Como usar

Ao fim de cada tarefa: contagem de testes **≥ 1005** (era 888 no início), `tsc` em **0 erros** e lint em
**0 erros**.
Queda de contagem ou expectativa de teste alterada = regressão até prova em contrário, justificada no PR.
