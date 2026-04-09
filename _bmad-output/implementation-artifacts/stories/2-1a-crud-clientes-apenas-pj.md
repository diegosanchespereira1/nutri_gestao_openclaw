# Story 2.1a: CRUD de Clientes — Apenas Pessoa Jurídica

## Contexto

O Epic 2 original misturava clientes PF (pessoa física) e PJ (pessoa jurídica) num único fluxo, criando confusão na UX. Esta story é um **refactor** da original **Story 2.1**, focando **apenas em clientes PJ** (empresas, hospitais, clínicas).

O módulo `app/(app)/clientes/` será dedicado exclusivamente a **pessoa jurídica**, enquanto pacientes PF ganham módulo separado em `app/(app)/pacientes/`.

## Objetivo

Profissional consegue cadastrar, listar, editar e eliminar clientes pessoa jurídica (com CNPJ, razão social e tipo), criando a base para associação com estabelecimentos e pacientes opcional.

## Stack & Convenções

- **Framework:** Next.js 15 App Router + TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui (Base UI)
- **Auth:** @supabase/ssr (server-side session)
- **DB:** Supabase PostgreSQL com RLS
- **Rota:** `app/(app)/clientes/` — dedicada a PJ apenas
- **Estado:** React `useState` para formulários, Server Actions para mutations

## Requisitos Funcionais

- **FR6** (parcial): Profissional pode cadastrar clientes jurídicos
- **FR61:** RLS impede leitura/modificação de clientes de outro tenant
- **UX-DR13:** Formulários com validação e feedback claro

## Critérios de Aceitação

```gherkin
Cenário 1: Criar cliente PJ
  Given profissional autenticado em app/(app)/clientes/
  When clico em "Novo cliente" e preencho: CNPJ, razão social, email, telefone
  Then cliente aparece na lista filtrável
  And RLS valida que só **eu** consigo ver (outro tenant vê vazio)

Cenário 2: Editar cliente PJ
  Given cliente PJ existente na lista
  When clico em "Editar" e altero razão social
  Then alteração persiste
  And timestamp de updated_at atualiza

Cenário 3: Eliminar cliente PJ
  Given cliente PJ existente
  When clico em "Eliminar" com confirmação
  Then registo é removido
  And estabelecimentos órfãos ficam com client_id = NULL (ou deletam em cascata conforme politica)

Cenário 4: Validação de CNPJ
  Given formulário de criação
  When submeto CNPJ inválido (ex: 00000000000000)
  Then erro "CNPJ inválido" é mostrado
  And não persiste

Cenário 5: RLS isolamento
  Given dois profissionais (tenant A e B)
  When tenant A lista clientes
  Then vê apenas clientes criados por A
  And tenant B lista vê apenas clientes de B (isolamento garantido)
```

## Tarefas de Implementação

### Backend / Banco de Dados

- [ ] **Confirmação:** Tabela `clients` já existe com coluna `type` (PF/PJ)
  - Verificar estrutura atual em `supabase/migrations/`
  - RLS policy já existe? Revisar `SELECT * FROM clients WHERE ... AND clients.user_id = auth.uid()`

- [ ] **Validação CNPJ:** Criar função `isValidCNPJ(cnpj: string): boolean` em `lib/utils/validation.ts`
  - CNPJ deve ter 14 dígitos
  - Validação de dígito verificador (algoritmo padrão)

- [ ] **Server Actions:** Criar `lib/actions/clients.ts`
  ```typescript
  export async function createClientAction(_prev: unknown, formData: FormData)
  export async function updateClientAction(_prev: unknown, formData: FormData)
  export async function deleteClientAction(_prev: unknown, formData: FormData)
  export async function loadClientsForUser(userId: string)
  ```

### Frontend

- [ ] **Página lista:** `app/(app)/clientes/page.tsx`
  - Server component que carrega clientes do user
  - Grid/table com colunas: CNPJ, Razão Social, Email, Ações (editar/delete)
  - Filtro por razão social (search)
  - CTA "Novo cliente"

- [ ] **Componente formulário:** `components/clientes/client-form.tsx`
  - Inputs controlados: CNPJ, razão social, email, telefone
  - Validação CNPJ em tempo real (feedback visual)
  - Select "Tipo" (apenas PJ obrigatório, ex: "Empresa", "Hospital", "Clínica")
  - Estados: loading, error, success
  - Usecase: criar + editar

- [ ] **Página editar:** `app/(app)/clientes/[id]/editar/page.tsx`
  - Carrega cliente existente
  - Popula formulário
  - Save via updateClientAction

- [ ] **Modal/Dialog de confirmação:** Para delete
  - "Eliminar cliente permanentemente?"
  - Aviso: "Estabelecimentos vinculados ficarão órfãos"

### Segurança & Compliance

- [ ] **RLS policy:**
  - Verifica `auth.uid() = clients.user_id` em todas as operações
  - Testes: user A tenta read cliente de user B → acesso negado

- [ ] **Validação de entrada:**
  - CNPJ: formato + dígito verificador
  - Razão social: máx 255 chars, sem scripts
  - Email: formato válido
  - Proteção XSS em inputs (sanitizar antes de render)

- [ ] **LGPD:**
  - Campos sensíveis: email, telefone
  - Não logar em toast (apenas em logs de auditoria)
  - Direito de deleção: confirmar que delete remove cliente + dados vinculados (conforme política)

## Arquivos a Criar/Modificar

**Criar:**
- `app/(app)/clientes/page.tsx` — Lista de clientes
- `app/(app)/clientes/[id]/editar/page.tsx` — Editar cliente
- `components/clientes/client-form.tsx` — Formulário reutilizável
- `lib/actions/clients.ts` — Server Actions
- `lib/utils/validation.ts` — Validação CNPJ (ou adicionar à existente)

**Modificar:**
- `app/(app)/layout.tsx` — Adicionar "Clientes" ao sidebar (se não existir)
- `lib/types/clients.ts` — Tipos TypeScript (se não existirem)

## Definição de Pronto (DoD)

- [ ] Código TypeScript sem erros (`npx tsc --noEmit`)
- [ ] RLS validado: user A não vê clientes de user B
- [ ] CRUD completo (criar, ler, editar, eliminar) funcional
- [ ] Validação CNPJ com feedback visual
- [ ] Todos os critérios de aceitação atendidos
- [ ] Testes manuais: criar, listar, editar, eliminar cliente
- [ ] Sprint status atualizado para `done`
- [ ] Sem TODOs críticos no código

## Referências

- Refactor doc: `_bmad-output/planning-artifacts/REFACTOR-CLIENTE-PACIENTE.md`
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR6, FR61)
- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Task template: `_bmad-output/planning-artifacts/TASK-PROMPT-TEMPLATE.md`

---

**Estimativa:** M (1–2 dias) — Refactor UI + validação  
**Complexidade:** Média — RLS já existe, apenas refactor rotas  
**Prioridade:** Must — Base para estabelecimentos (Story 2.2)
