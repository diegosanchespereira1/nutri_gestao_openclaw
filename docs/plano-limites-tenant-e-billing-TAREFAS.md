# Tarefas e estratégia de regressão — Limites por tenant, CPF/CNPJ, cópia de paciente, retenção e Stripe

> Companheiro de `docs/plano-limites-tenant-e-billing.md` (o **quê** e o **porquê**).
> Este documento é o **como**: tarefas na ordem de execução, testes novos por tarefa e a rede de
> regressão que garante que o que já funciona continue funcionando.
> Criado em 2026-08-31.

---

## 1. Baseline — medido hoje, não estimado

Rodado neste repositório antes de qualquer alteração:

| Verificação | Comando | Resultado |
|---|---|---|
| Testes unitários | `npm run test` | **113 arquivos, 888 testes, 100% verdes** em ~15s |
| Typecheck | `npx tsc --noEmit` | **5 erros pré-existentes**, todos em `tests/rls/admin-template-write.test.ts` (TS2739, encadeamento de `PostgrestFilterBuilder`) |
| RLS multi-tenant | `npm run test:rls` | **não executável agora** — exige `npx supabase start`; hoje 3 arquivos (`isolation`, `workspace-team`, `admin-template-write`) |
| E2E | `npm run test:e2e` | 11 specs; os `auth-*` são pulados sem os secrets `E2E_*` |
| CI (`.github/workflows/ci.yml`) | — | roda `lint`, `test`, `test:coverage`, `npm audit`, `build` e o job `e2e`. **Não roda `tsc --noEmit`** — é por isso que os 5 erros acima passaram despercebidos |

**Regra de ouro deste trabalho:** o número a bater ao fim de cada tarefa é **888+ testes verdes**.
Qualquer queda é regressão até prova em contrário.

---

## 2. O buraco na rede — leia antes de começar

`vitest.config.ts` inclui **apenas** `lib/**/*.test.ts`, e a cobertura **exclui `lib/actions/**`**.

Consequência direta: **as Server Actions que este plano mais altera não têm nenhum teste unitário.**

| Arquivo que será alterado | Testes hoje |
|---|---|
| `lib/actions/clients.ts` (`createClientAction`, `deleteClientAction`) | nenhum |
| `lib/actions/patients.ts` (`createPatientAction`, `deletePatientAction`) | nenhum |
| `lib/actions/team-members.ts` (`createTeamMemberAction`) | nenhum |
| `lib/actions/onboarding.ts` | nenhum |
| `lib/actions/admin-platform.ts` (`createTenantAsAdminAction`) | nenhum |

A rede real para essas mudanças é **`tests/rls/` + `e2e/`** — e nenhuma das duas roda por padrão no CI
(RLS precisa de Supabase local; e2e autenticado precisa de secrets).

Por isso a **Fase 0 é obrigatória**: construir a rede antes de mexer no comportamento. Pular a Fase 0
significa fazer 10 tarefas de alto risco com 888 testes que não cobrem nada do que está sendo mudado.

---

## 3. Gate de regressão

Definição de "não quebrou nada", aplicada ao fim de **toda** tarefa:

```bash
npm run lint
npx tsc --noEmit          # tem de ficar limpo após T0.2
npm run test              # ≥ 888 testes, 0 falhas
npm run test:rls          # com supabase local de pé
npm run build
```

Tarefas que tocam em RLS, triggers ou FKs adicionam:

```bash
npm run test:e2e -- e2e/auth-list-search.spec.ts e2e/smoke.spec.ts
```

Tarefas de migration adicionam, obrigatoriamente:

```bash
npx supabase db reset     # a migration aplica do zero, sem erro
# + rodar a migration contra uma cópia do dump de produção (§7)
```

---

## 4. Fase 0 — Rede de segurança (antes de qualquer mudança de comportamento)

### T0.1 — Congelar o baseline

- **Entregas**: `scripts/qa/baseline.sh` que roda o gate completo e imprime contagem de testes;
  `docs/testing/baseline-limites-tenant.md` com os números da §1 e a data.
- **Testes novos**: nenhum.
- **DoD**: script roda limpo e o output confere com a §1.

### T0.2 — Zerar os erros de typecheck pré-existentes

- **Entregas**: corrigir os 5 TS2739 em `tests/rls/admin-template-write.test.ts` (falta `await`/`then`
  no encadeamento do `PostgrestFilterBuilder`); adicionar `npx tsc --noEmit` ao job `check` do CI.
- **Por quê primeiro**: sem typecheck limpo, `tsc` não serve como gate — e as próximas tarefas mexem em
  tipos de retorno de Server Actions, onde um erro real ficaria escondido no meio do ruído.
- **Regressão**: gate completo.
- **DoD**: `npx tsc --noEmit` sem saída; CI falha se alguém reintroduzir erro de tipo.

### T0.3 — RLS rodando em CI, sempre

- **Entregas**: revisar `.github/workflows/rls-tests.yml` para subir Supabase local e rodar
  `npm run test:rls` em **todo PR** que toque `supabase/migrations/**`, `lib/actions/**` ou `tests/rls/**`.
- **Por quê**: as tarefas T1–T10 são majoritariamente RLS, triggers e FKs. Sem isso, a rede não existe no
  momento em que mais importa.
- **DoD**: PR de teste com uma policy propositalmente quebrada falha o CI.

### T0.4 — Testes de caracterização das Server Actions alteradas

O objetivo não é testar a action inteira (ela depende de `cookies()` e do cliente Supabase), e sim
**extrair a lógica de decisão para módulos puros em `lib/`, que a config de vitest já cobre**.

- **Entregas**:
  - `lib/limits/tenant-limits.ts` já nasce como módulo puro (recebe contagem e limites, devolve decisão);
  - extrair de `clients.ts` / `patients.ts` / `team-members.ts` os parsers e validadores que hoje estão
    inline (`parseKind`, `parseDocument`, `parseProfessionalArea`, `parseTeamJobRole`, política de senha)
    para `lib/` **sem mudar comportamento**, com teste que fixa o comportamento atual;
  - `lib/patients/delete-patient-decision.ts` — a decisão de exclusão isolada da I/O.
- **Testes novos**: um `*.test.ts` por módulo extraído, escrito **contra o comportamento de hoje**.
- **Regra**: esta tarefa é **refactor puro**. Se algum teste precisar mudar de expectativa depois,
  é porque houve mudança de comportamento não intencional.
- **DoD**: gate verde e contagem de testes sobe (ex.: 888 → ~930).

### T0.5 — E2E dos fluxos que serão mexidos

- **Entregas**: `e2e/auth-cadastros-basicos.spec.ts` cobrindo, com o tenant de teste:
  criar cliente PF, criar cliente PJ com estabelecimento, criar paciente vinculado, criar paciente
  independente, criar membro de equipe, excluir paciente.
- **Por quê**: são exatamente os caminhos onde o trigger de limite e o soft delete vão entrar. Ter o
  "antes" gravado é o que permite afirmar que o "depois" não regrediu.
- **DoD**: spec verde contra o ambiente de teste, e registrada no `rls-tests.yml`/CI.

---

## 5. Fase 1 — Limites por tenant

### T1 — Migrations base

- **Plano**: §4.1, §4.2, §4.3
- **Entregas**: `20261001120000_profiles_tenant_document.sql`, `20261001121000_tenant_limits.sql`,
  `20261001122000_subscription_events_limit_types.sql`; trigger `profiles_create_tenant_limits`;
  backfill dos tenants existentes **desligado**.
- **Testes novos** (`tests/rls/tenant-limits.test.ts`):
  - todo `profile` novo ganha linha em `tenant_limits` (via trigger);
  - tenant lê a própria linha, **não** consegue `update`; `super_admin` consegue;
  - backfill: tenant pré-existente fica com limites desabilitados.
- **Regressão**: `npm run test:rls` completo — as policies de `profiles` foram tocadas.
- **Risco**: o `unique index` em `profiles.document_id` falha se houver duplicata. Rodar a checagem antes.
- **DoD**: `npx supabase db reset` aplica do zero; gate verde.

### T1b — Isolamento e unicidade

- **Plano**: §4.4
- **Entregas**: índices únicos compostos em `patients (user_id, document_id)` e
  `clients (owner_user_id, document_id)`; índice único parcial em
  `team_members (member_user_id) where is_active`; recusa em `createTeamMemberAction`.
- **Testes novos** (estender `tests/rls/isolation.test.ts` + novo `tests/rls/tenant-boundaries.test.ts`):
  - mesmo CPF de paciente **pode** existir em dois tenants;
  - dentro do mesmo tenant, segundo insert com mesmo CPF é rejeitado;
  - `member_user_id` ativo em dois workspaces é rejeitado; inativo em outro workspace é permitido.
- **Regressão**: `isolation.test.ts` e `workspace-team.test.ts` inteiros; E2E de T0.5.
- **Risco alto**: duplicatas pré-existentes travam a migration. Script de checagem obrigatório antes.

### T2 — Trigger de enforcement

- **Plano**: §5.1
- **Entregas**: `enforce_tenant_limit()` em `BEFORE INSERT` de `clients`, `patients`, `team_members`
  **e** em `BEFORE UPDATE` de `team_members` quando `is_active` vai `false → true`.
- **Testes novos** (`tests/rls/tenant-limits-enforcement.test.ts`): matriz completa — desabilitado,
  abaixo, no limite, acima; equipe desabilitada; unlimited; reativação de membro sem assento livre;
  `service_role` **também** é bloqueado.
- **Regressão**: suíte RLS inteira + E2E de T0.5 — este é o trigger que pode quebrar todo cadastro.
- **Risco alto**: qualquer caminho de insert não previsto passa a falhar. Rodar os E2E de cadastro.

### T3 — Camada TypeScript e mensagens

- **Plano**: §5.2
- **Entregas**: `lib/limits/tenant-limits.ts` (puro), integração em `clients.ts`, `patients.ts`,
  `team-members.ts`, `onboarding.ts`, `import*.ts`; `mapPgLimitError`; strings pt-BR.
- **Testes novos**: `lib/limits/tenant-limits.test.ts` (matriz de decisão + mapeamento de erro do Postgres).
- **Regressão**: gate completo; E2E de T0.5 com o tenant **abaixo** do limite (o caminho feliz não pode ter
  regredido).
- **Verificar em pt-BR**, não pt-PT — é regra do projeto.

### T4 — Painel do super_admin

- **Plano**: §6
- **Entregas**: card "Limites e assentos" na ficha do tenant; passo "Limites" no wizard; colunas
  Documento/Limites na lista; `updateTenantLimitsAction`, `loadTenantLimitsWithUsage`;
  `lib/admin/tenant-create-form-draft.ts` atualizado.
- **Testes novos**: `lib/admin/build-create-tenant-summary.test.ts` estendido para os novos campos;
  `e2e/admin-tenant-limites.spec.ts`.
- **Regressão**: `lib/admin/tenant-capabilities.test.ts` e o fluxo de criação de tenant existente.

### T5 — UI do tenant

- **Plano**: §5.3
- **Entregas**: `components/limits/limit-usage-badge.tsx`; botões desabilitados com tooltip; item de menu
  Equipe condicionado; guard em `app/(app)/equipe/*`.
- **Testes novos**: `lib/app-nav.test.ts` estendido (o item Equipe some quando desabilitado);
  E2E "tenant no limite vê botão desabilitado".
- **Regressão**: `lib/app-nav.test.ts` atual precisa continuar verde — é o teste que protege a navegação.

---

## 6. Fase 2 — Documento fiscal, cadastro público, retenção, exames

### T6 — CPF/CNPJ no wizard, onboarding e perfil ✅

- **Plano**: §7 (itens 5 e 6; o `/register` é o T7)
- **Entregas**:
  - `lib/tenant/tenant-document.ts` — parser puro do documento do **tenant** (aceita CPF **ou** CNPJ,
    deduz o tipo pelo tamanho quando não vem, valida DV, traduz os erros do banco). 21 testes.
  - `maskBrDocumentInput` em `lib/format/br-document.ts` — máscara progressiva enquanto se digita.
    5 testes; as funções antigas ficaram intactas.
  - `components/tenant/tenant-document-fields.tsx` — o par tipo + número, usado nos três lugares.
  - **Wizard do admin**: etapa 1 passa a pedir o documento (obrigatório), com validação antes de
    avançar, o documento no diálogo de confirmação e checagem de duplicado **antes** de criar o
    utilizador no Auth (senão sobrava conta órfã).
  - **Onboarding**: passo 1 pede o documento ao titular que ainda não tem — é a via de backfill dos
    tenants antigos. Quem já tem vê o valor só para conferência; membro de equipe não vê o campo.
    Vale também no caminho "Preencher depois".
  - **Perfil**: campo visível e editável só pelo titular.
  - **Ficha do admin**: documento no cabeçalho do tenant.
  - Migration `20261003120000_profiles_document_grants.sql` — grant de UPDATE nas colunas novas
    (sem ele o onboarding falha com *permission denied for column*) e trigger `profiles_document_guard`,
    que bloqueia membro de equipe e escreve a trilha em `subscription_events`.
- **Por que a trilha está num trigger e não na Server Action**: `subscription_events` só aceita INSERT de
  super_admin. O tenant que preenche o documento no onboarding ou no perfil não conseguiria escrever o
  evento a partir da aplicação — no trigger (`security definer`) fica coberto em todos os caminhos.
- **Testes novos**: `tests/rls/tenant-document.test.ts` (10) — unicidade global, check do par,
  isolamento entre tenants, bloqueio do membro de equipe e os dois casos da trilha.
- **Regressão**: `lib/validators/br-document.test.ts` intacto; `lib/format/br-document.test.ts` só ganhou
  casos novos. Cliente e paciente **não** mudam.
- **Pendente**: aplicar as migrations em DEV e rodar a suíte RLS.

### T7 — Reabertura do `/register`

- **Plano**: §7
- **Testes novos**: `e2e/register-tenant.spec.ts` — CPF, CNPJ, documento inválido, documento duplicado,
  e-mail já existente; teste de rate limit.
- **Regressão**: `e2e/smoke.spec.ts` (a rota `/register` deixa de redirecionar — o smoke pode assumir o
  redirect atual, **conferir e ajustar conscientemente**).

### T9b — Exame pertence ao paciente

- **Plano**: §9.4.1
- **Entregas**: `client_exam_documents.patient_id` + backfill não ambíguo + escolha obrigatória no upload
  + lista de órfãos; segunda migration com `not null` quando a lista zerar.
- **Testes novos** (`tests/rls/exam-documents.test.ts`): cliente PF com dois pacientes — selecionar por
  `patient_id` devolve só os do paciente; exame de outro tenant nunca aparece.
- **Regressão**: `ClientExamDocumentList` continua funcionando na ficha do cliente; upload existente não
  quebra (`patient_id` nullable nesta etapa).
- **Risco**: a segunda migration (`not null`) falha se sobrarem órfãos — é por isso que são duas.

### T9c — Retenção

- **Plano**: §10
- **Entregas**: `retention_policies` (20 anos), soft delete, trigger de `DELETE` bloqueado, trigger de
  reativação bloqueada, FKs `cascade → restrict`, `record_restore_requests`, RPC
  `admin_restore_patient`, tela "Registros excluídos", job de expurgo.
- **Testes novos** (`tests/rls/retention.test.ts`) — a suíte mais importante deste plano:
  - `delete from patients` levanta `EXCLUSAO_BLOQUEADA_RETENCAO`, **inclusive para `service_role`**;
  - apagar o `auth.users` do tenant **falha** (FK `restrict`) e não apaga paciente nenhum;
  - `deleted_at = null` levanta `REATIVACAO_BLOQUEADA`; outra edição levanta `REGISTRO_EXCLUIDO_IMUTAVEL`;
  - exclusão sem comentário ≥10 caracteres é recusada pelo `check`;
  - pedido de restauração sem justificativa é recusado;
  - `admin_restore_patient` recusa não-super_admin, comentário curto, e **tenant na cota**;
  - após restaurar, o pedido fica `approved` com autor, data e comentário;
  - a flag `app.admin_restore` não sobrevive à transação;
  - expurgo não toca em `purge_after` futuro; com vencido, apaga e grava log.
- **Regressão crítica**: `deletePatientAction` e `deleteClientAction` mudam de semântica. Os E2E de T0.5
  precisam ser reescritos **conscientemente** (o paciente some da lista, mas a linha permanece) — essa é
  a única mudança de expectativa legítima deste plano, e deve ser revisada no PR.
- **Risco muito alto**: a troca de FK para `restrict` pode fazer falhar rotinas existentes que apagam
  clientes. Rodar `isolation.test.ts` e o fluxo de exclusão de cliente ponta a ponta.

### T8 — Stripe

- **Plano**: §8
- **Testes novos**: `lib/billing/*.test.ts` (mapeamento evento → efeito, puro);
  webhook com assinatura inválida devolve 400; reentrega do mesmo `evt_` não duplica efeito.
- **Regressão**: gate completo; nenhuma rota existente pode passar a exigir variável de ambiente nova
  para funcionar (o `build` do CI roda com chaves fake — Stripe precisa degradar sem quebrar o build).

### T10 — Fase 6: identidade e cópia entre tenants

- **Plano**: §9
- **Testes novos** (`tests/rls/patient-copy.test.ts`): autorização em cada estado; rollback em falha no
  meio; após a cópia, alteração na origem **não** aparece no destino; segunda cópia é incremental;
  nenhuma FK aponta para `team_members`/`establishments` da origem; cota do destino respeitada;
  `person_exists_by_document` devolve só booleano; paciente com `deleted_at` não é copiado.
- **Regressão**: `isolation.test.ts` inteiro — o teste que garante que o Tenant 2 **não** lê a origem
  precisa continuar verde **mesmo depois** de uma cópia autorizada.

---

## 6b. ⛔ Bloqueio encontrado em produção (2026-08-31)

O pré-check (`supabase/scripts/precheck_limites_migration.sql`) foi rodado contra produção **antes** de
qualquer migração. Resultado:

| Checagem | Resultado |
|---|---|
| Documento de tenant duplicado | ✅ 0 |
| Documento de **paciente** duplicado no mesmo tenant | ✅ 0 |
| Documento de **cliente** repetido no mesmo tenant | ℹ️ 3 grupos, 7 linhas — **não é erro** |
| Membro ativo em dois workspaces | ✅ 0 |
| Tenants já acima de 25 clientes ou pacientes | ✅ 0 |

Os três grupos são a **mesma empresa com mais de uma unidade** sob um único CNPJ de matriz:
*Liberdade Comércio*, *Romana Doces e Salgados* e *Cinpal* (3 plantas, cada uma com os seus checklists).
Confirmado com o negócio em 2026-08-31: é uso legítimo do sistema, não duplicação por engano.

Por isso **não existe índice único em `clients (owner_user_id, document_id)`** — nem para os cadastros
atuais nem para os futuros. Um índice único impediria cadastrar a *Cinpal — Planta 4*.

O que existe no lugar: um **aviso não bloqueante** no formulário de cliente
(`lib/clientes/duplicate-document.ts`). Ao gravar um cliente cujo documento já existe na conta, a action
devolve a lista dos cadastros existentes e o utilizador confirma com *"Cadastrar mesmo assim"*
(campo `confirm_duplicate_document`). Informa sem impedir.

> A unicidade que faria sentido no negócio é por **unidade** (estabelecimento), não por cliente. Se algum
> dia isso virar regra, o lugar é `establishments`, não `clients`.

A migration `20261001124000_clients_document_uniqueness.sql` foi **removida** — não é para reintroduzir.

Nenhum tenant está acima de 25 hoje — ou seja, ligar o limite padrão não bloquearia ninguém de imediato.
Ainda assim o backfill mantém tudo desligado, conforme decidido.

---

## 7. Ensaio da migration contra dados reais

Migrations com índice único e troca de FK são as que quebram em produção, não em teste — porque em teste
não há duplicata nem dado sujo. Antes de cada uma:

```bash
# 1. dump de produção (sem dados sensíveis desnecessários) para uma base descartável
# 2. rodar as checagens de pré-condição:
#    - duplicatas de documento em profiles / patients / clients
#    - member_user_id ativo em mais de um workspace
#    - exames órfãos (T9b)
# 3. aplicar a migration nessa base e medir o tempo
# 4. só então aplicar em produção
```

Cada migration deste plano leva junto o seu script de pré-condição em `supabase/scripts/`.

---

## 8. Matriz: o que pode quebrar × o que detecta

| Mudança | O que pode quebrar | Teste que detecta |
|---|---|---|
| Trigger de limite | qualquer cadastro de cliente/paciente/membro | `tenant-limits-enforcement.test.ts` + E2E T0.5 |
| Índice único de documento | migration falha; cadastro legítimo rejeitado | script de pré-condição + `tenant-boundaries.test.ts` |
| Índice único de `member_user_id` | vínculo de equipe existente | `workspace-team.test.ts` |
| Policies com `deleted_at is null` | listagens ficam vazias; contagens erradas | `isolation.test.ts` + E2E de listagem |
| FK `cascade → restrict` | exclusão de cliente e encerramento de conta | `retention.test.ts` + fluxo de exclusão de cliente |
| Soft delete em `deletePatientAction` | paciente "não some" da tela | E2E T0.5 reescrito |
| `patient_id` em exames | lista de anexos do cliente | `exam-documents.test.ts` |
| `/register` reaberto | `smoke.spec.ts` que assume redirect | `smoke.spec.ts` |
| Stripe | `npm run build` com env fake | job `check` do CI |

---

## 9. DoD por tarefa

- [ ] Gate de regressão verde (§3), com contagem de testes **igual ou maior** que a anterior
- [ ] Testes novos da tarefa escritos **antes** ou junto do código, não depois
- [ ] Migration aplica em `supabase db reset` **e** no ensaio com dump (§7)
- [ ] Nenhuma expectativa de teste existente alterada — e, se alterada, justificada no PR com o motivo
- [ ] Strings de UI em **pt-BR**
- [ ] `docs/plano-limites-tenant-e-billing.md` atualizado se a implementação divergir do planejado
