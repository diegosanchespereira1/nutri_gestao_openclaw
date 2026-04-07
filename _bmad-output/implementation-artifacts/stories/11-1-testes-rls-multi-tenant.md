# Story 11.1: Testes automatizados de isolamento multi-tenant

**Estado:** in-progress
**Épico:** 11 — Segurança transversal, auditoria e direitos do titular
**Dependências:** Todas as stories anteriores (1.1–10.6) concluídas ✅

---

## Contexto

Epics 1–10 implementaram 56 stories com RLS em todas as tabelas de tenant. Cada tabela usa `owner_user_id = auth.uid()` como chave de isolamento. Antes do lançamento (Epic 11), precisamos de uma suíte de testes automatizados que prove — e continue a provar em cada deploy — que nenhum tenant consegue aceder a dados de outro.

O projeto usa **Supabase** com RLS nativo. Os testes serão escritos com **Vitest** (já usado no ecossistema Next.js 15) e executados contra uma instância local do Supabase (`supabase start`).

---

## Objetivo

Como equipa, queremos testes automatizados que:
1. Criam dois tenants distintos (Tenant A e Tenant B)
2. Inserem dados de cada tenant nas tabelas críticas
3. Verificam que queries autenticadas como Tenant A **nunca** retornam dados de Tenant B
4. São executados no CI/CD a cada push (GitHub Actions)

Satisfaz **FR61** (isolamento multi-tenant verificável) e **NFR14** (zero vazamento cross-tenant por testes de regressão).

---

## Stack & Convenções

- **Test runner:** Vitest + `@supabase/supabase-js` (client-side com JWT de tenant)
- **Supabase local:** `npx supabase start` (Docker) para testes isolados
- **Autenticação nos testes:** Supabase `signInWithPassword` para obter JWT real por tenant
- **Padrão RLS do projeto:** `owner_user_id = (select auth.uid())` em todas as tabelas de tenant
- **Seed de teste:** fixture de 2 utilizadores + dados em cada tabela crítica

---

## Tabelas Críticas a Testar (todas as tabelas de tenant)

| Tabela | Epic |
|--------|------|
| `clients` | 2 |
| `establishments` | 2 |
| `patients` | 2 |
| `patient_nutrition_assessments` | 2 |
| `checklist_fill_sessions` | 3–4 |
| `scheduled_visits` | 4 |
| `checklist_fill_item_photos` | 4 |
| `technical_recipes` | 6 |
| `professional_raw_materials` | 6 |
| `pop_templates` | 7 |
| `establishment_pops` | 7 |
| `client_contracts` | 8 |
| `contract_templates` | 8 |
| `external_portal_users` | 9 |
| `external_access_permissions` | 9 |
| `patient_parental_consents` | 9 |

---

## Requisitos Funcionais

**FR61:** Sistema isola completamente os dados entre profissionais — nenhum tenant acessa dados de outro.

**NFR14:** Zero vazamento cross-tenant verificado por testes automatizados a cada deploy.

---

## Critérios de Aceitação

**Given** dois utilizadores criados (tenant_a@test.com e tenant_b@test.com)
**And** cada um tem dados nas tabelas críticas
**When** tenant_a faz SELECT em qualquer tabela
**Then** recebe apenas os seus próprios registos (count = N_A, não N_A + N_B)

**Given** tenant_a conhece um UUID de registo de tenant_b
**When** tenta SELECT com `.eq('id', uuid_de_b)`
**Then** retorna array vazio (RLS bloqueia)

**Given** tenant_a tenta INSERT numa tabela com `owner_user_id` de tenant_b
**When** executa a query
**Then** recebe erro de RLS ou row count = 0

**Given** os testes passam localmente
**When** é feito push para o repositório
**Then** o CI (GitHub Actions) corre os testes e falha se houver regressão

---

## Tarefas de Implementação

### 1. Configuração do ambiente de teste

- [ ] Instalar dependências: `vitest`, `@vitest/coverage-v8`, `dotenv`
- [ ] Criar `vitest.config.ts` com `environment: 'node'` e `globalSetup`
- [ ] Criar `.env.test` com `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (local)
- [ ] Adicionar script `"test:rls": "vitest run tests/rls/"` ao `package.json`

### 2. Fixture de utilizadores de teste

- [ ] Criar `tests/rls/fixtures/seed.ts`:
  - Usa `service_role` client para criar 2 utilizadores via `auth.admin.createUser()`
  - Autentica cada um com `signInWithPassword` → obtém JWT real
  - Insere dados de seed em todas as tabelas críticas com cada tenant
  - Retorna `{ clientA, clientB, tenantAId, tenantBId, seedData }`

- [ ] Criar `tests/rls/fixtures/teardown.ts`:
  - Deleta utilizadores de teste via `auth.admin.deleteUser()`
  - Limpa dados de seed (CASCADE via FK)

### 3. Suíte de testes RLS

- [ ] Criar `tests/rls/isolation.test.ts`:

  **Grupo: SELECT isolation**
  - Para cada tabela crítica: tenant_a vê apenas os seus registos
  - Para cada tabela crítica: tenant_a com UUID de tenant_b retorna array vazio

  **Grupo: INSERT isolation**
  - Tenant_a não consegue inserir com `owner_user_id = tenant_b_id`

  **Grupo: UPDATE isolation**
  - Tenant_a não consegue atualizar registos de tenant_b

  **Grupo: DELETE isolation**
  - Tenant_a não consegue eliminar registos de tenant_b

### 4. GitHub Actions CI

- [ ] Criar `.github/workflows/rls-tests.yml`:
  - Trigger: `push` para `main` e `pull_request`
  - Step: instalar Supabase CLI e `supabase start`
  - Step: aguardar healthcheck do Supabase local
  - Step: `npm run test:rls`
  - Step: upload de relatório de cobertura como artefacto

### 5. Documentação

- [ ] Criar `tests/rls/README.md` com instruções para correr localmente

---

## Estrutura de Ficheiros a Criar

```
tests/
└── rls/
    ├── README.md
    ├── fixtures/
    │   ├── seed.ts          ← cria tenants e dados de teste
    │   └── teardown.ts      ← limpa após testes
    ├── helpers/
    │   └── supabase.ts      ← factory de clientes autenticados
    ├── isolation.test.ts    ← testes principais de isolamento
    └── __snapshots__/       ← auto-gerado pelo Vitest

vitest.config.ts             ← configuração do test runner
.env.test                    ← variáveis de ambiente local (não commitar)
.env.test.example            ← template (commitar)
.github/
└── workflows/
    └── rls-tests.yml        ← CI pipeline
```

**Modificar:**
- `package.json` — adicionar scripts e devDependencies

---

## Notas de Implementação

### Padrão de cliente autenticado
```typescript
// helpers/supabase.ts
export function createTenantClient(accessToken: string) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    }
  )
}
```

### Padrão de teste de SELECT
```typescript
it('tenant_a não vê clients de tenant_b', async () => {
  const { data } = await tenantAClient
    .from('clients')
    .select('id')
    .eq('id', seedData.clientBClientId)

  expect(data).toHaveLength(0) // RLS bloqueia
})
```

### Tabelas com `owner_user_id` nullable (admin)
- `contract_templates` tem `owner_user_id` nullable (NULL = global admin)
- Nesses casos, verificar que tenant pode ver globais mas não os de outro tenant

---

## Definição de Pronto (DoD)

- [ ] `npm run test:rls` passa com 0 falhas localmente
- [ ] Cada tabela da lista crítica tem pelo menos 1 teste de SELECT isolation
- [ ] Testes de INSERT/UPDATE/DELETE cobrem pelo menos 3 tabelas representativas
- [ ] GitHub Actions workflow criado e funcional
- [ ] `npx tsc --noEmit` sem erros nos ficheiros de teste
- [ ] `sprint-status.yaml` atualizado para `done` após aprovação
