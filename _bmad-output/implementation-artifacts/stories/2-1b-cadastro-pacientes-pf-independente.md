# Story 2.1b: Cadastro de Pacientes — Pessoa Física Independente

## Contexto

Complemento do refactor de Epic 2: enquanto **2.1a** dedica-se a clientes **PJ** (empresa/hospital/clínica), esta story cria fluxo para **pacientes PF** (pessoa física) como entidade de **1º nível**, com associação **opcional** a cliente PJ (a ser implementada em Story 2.3).

Actualmente, Story 2.3 mistura "criar paciente com cliente obrigatório". Esta story simplifica: **criar paciente sem cliente é agora a norma**, cliente vira opcional.

## Objetivo

Profissional consegue cadastrar, listar, editar e eliminar pacientes pessoa física rapidamente (3-4 campos obrigatórios), sem obrigatoriedade de vincular a cliente. Vínculo com cliente/estabelecimento é feito a posteriori em Story 2.3.

## Stack & Convenções

- **Framework:** Next.js 15 App Router + TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui (Base UI)
- **Auth:** @supabase/ssr (server-side session)
- **DB:** Supabase PostgreSQL com RLS
- **Rota:** `app/(app)/pacientes/` — dedicada a PF, entidade independente
- **Estado:** React `useState` para formulários, Server Actions para mutations

## Requisitos Funcionais

- **FR8** (parcial): Profissional pode cadastrar pacientes pessoa física
- **FR9** (parcial): Perfil básico do paciente (será completado em Story 2.4)
- **FR61:** RLS impede leitura/modificação de pacientes de outro tenant
- **UX-DR13:** Formulários simples, rápidos, sem campos desnecessários

## Critérios de Aceitação

```gherkin
Cenário 1: Criar paciente PF sem cliente
  Given profissional autenticado em app/(app)/pacientes/
  When clico em "Novo paciente" e preencho: Nome, CPF, Data Nascimento
  Then paciente aparece na lista
  And client_id = NULL (paciente independente)
  And RLS valida que só **eu** consigo ver

Cenário 2: Criar paciente PF com cliente (opcional)
  Given formulário de novo paciente
  When preencho Nome + CPF + Data Nascimento + seleciono Cliente (opcional)
  Then paciente criado com client_id populado
  And não é obrigatório (posso deixar vazio)

Cenário 3: Listar pacientes com filtros
  Given lista de pacientes
  When filtra por: Nome, CPF, Cliente (opcional)
  Then mostra apenas resultados matching
  And destaca pacientes sem cliente (ex: ícone diferente)

Cenário 4: Editar paciente
  Given paciente existente na lista
  When clico em "Editar" e altero Nome ou Data Nascimento
  Then alteração persiste
  And updated_at atualiza

Cenário 5: Eliminar paciente
  Given paciente PF existente
  When clico em "Eliminar" com confirmação
  Then registo é removido
  And avaliações/histórico são cascateados (conforme política)

Cenário 6: Validação de CPF
  Given formulário
  When submeto CPF inválido (ex: 00000000000000)
  Then erro "CPF inválido" é mostrado
  And não persiste

Cenário 7: RLS isolamento
  Given dois profissionais (tenant A e B)
  When tenant A lista pacientes
  Then vê apenas pacientes criados por A
  And tenant B lista vê apenas pacientes de B
```

## Tarefas de Implementação

### Backend / Banco de Dados

- [ ] **Confirmação:** Tabela `patients` já existe
  - Verificar colunas: `id`, `user_id` (FK → auth.users), `name`, `cpf`, `birth_date`, `client_id` (nullable), `created_at`, `updated_at`
  - `client_id` deve ser **NULL por padrão** (não obrigatório)

- [ ] **Validação CPF:** Criar/verificar função `isValidCPF(cpf: string): boolean` em `lib/utils/validation.ts`
  - CPF deve ter 11 dígitos
  - Validação de dígito verificador (algoritmo padrão)
  - Mascarar em formulário (XXX.XXX.XXX-XX)

- [ ] **Server Actions:** Criar/estender `lib/actions/patients.ts`
  ```typescript
  export async function createPatientAction(_prev: unknown, formData: FormData)
  export async function updatePatientAction(_prev: unknown, formData: FormData)
  export async function deletePatientAction(_prev: unknown, formData: FormData)
  export async function loadPatientsForUser(userId: string, filters?: {clientId?: string})
  ```

### Frontend

- [ ] **Página lista:** `app/(app)/pacientes/page.tsx`
  - Server component que carrega pacientes do user
  - Table/grid com colunas: Nome, CPF (mascarado), Data Nascimento, Cliente (se vinculado), Ações
  - Filtro por Nome e CPF
  - Filtro opcional por Cliente (dropdown de clientes do user)
  - CTA "Novo paciente"
  - Ícone/badge para pacientes sem cliente (ex: "Independente")

- [ ] **Componente formulário:** `components/pacientes/patient-form.tsx`
  - Inputs controlados: Nome (required), CPF (required), Data Nascimento (required)
  - Input opcional: Cliente (dropdown com clientes PJ — pode deixar vazio)
  - Validação CPF em tempo real
  - Estados: loading, error, success
  - Usecase: criar + editar

- [ ] **Página editar:** `app/(app)/pacientes/[id]/editar/page.tsx`
  - Carrega paciente existente
  - Popula formulário com dados
  - Save via updatePatientAction

- [ ] **Modal/Dialog de confirmação:** Para delete
  - "Eliminar paciente permanentemente?"
  - Aviso: "Todas as avaliações e histórico serão removidos"

### Segurança & Compliance

- [ ] **RLS policy:**
  - Verifica `auth.uid() = patients.user_id` em todas as operações
  - Testes: user A tenta read paciente de user B → acesso negado

- [ ] **Validação de entrada:**
  - CPF: formato + dígito verificador
  - Nome: máx 255 chars, sem scripts
  - Data Nascimento: formato válido (não futuro), idade mínima (ex: 0 anos)
  - Proteção XSS

- [ ] **LGPD:**
  - CPF e data nascimento são dados sensíveis
  - Não logar esses valores em toast (logs estruturados apenas)
  - Mascarar CPF na lista (mostrar apenas últimos 2 dígitos: ***.***.***-XX)
  - Direito de deleção: confirmar cascata (avaliações, etc.)

## Arquivos a Criar/Modificar

**Criar:**
- `app/(app)/pacientes/page.tsx` — Lista de pacientes
- `app/(app)/pacientes/[id]/editar/page.tsx` — Editar paciente
- `components/pacientes/patient-form.tsx` — Formulário reutilizável
- `lib/utils/validation.ts` — Validação CPF (ou estender existente)

**Modificar:**
- `lib/actions/patients.ts` — Adicionar createPatientAction, updatePatientAction, etc.
- `lib/types/patients.ts` — Tipos TypeScript (se não existirem)
- `app/(app)/layout.tsx` — Adicionar "Pacientes" ao sidebar (se não existir)

## Definição de Pronto (DoD)

- [ ] Código TypeScript sem erros (`npx tsc --noEmit`)
- [ ] RLS validado: user A não vê pacientes de user B
- [ ] CRUD completo (criar, ler, editar, eliminar) funcional
- [ ] Validação CPF com feedback visual e mascaramento
- [ ] Paciente pode ser criado **sem cliente** (cliente é optional)
- [ ] Todos os critérios de aceitação atendidos
- [ ] Testes manuais: criar paciente sem cliente, com cliente, listar, editar, eliminar
- [ ] CPF mascarado na lista (XXX.XXX.XXX-XX, mostrar completo apenas em detalhe)
- [ ] Sprint status atualizado para `done`
- [ ] Sem TODOs críticos

## Notas Importantes

1. **Cliente é opcional:** Este é um mudança de paradigma relativamente ao original Story 2.3. Enfatizar no código via comentários.
2. **Vínculo a cliente vem depois:** Story 2.3 ("Vínculos") será dedicada a permitir associação cliente/estabelecimento.
3. **Compatibilidade com histórico:** Pacientes existentes (criados em Story 2.3 original) já têm `client_id`; não quebra retrocompatibilidade.

## Referências

- Refactor doc: `_bmad-output/planning-artifacts/REFACTOR-CLIENTE-PACIENTE.md`
- PRD: `_bmad-output/planning-artifacts/prd.md` (FR8, FR9, FR61)
- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Task template: `_bmad-output/planning-artifacts/TASK-PROMPT-TEMPLATE.md`

---

**Estimativa:** M (1–2 dias) — Novo CRUD similar a 2.1a  
**Complexidade:** Média — RLS similar, novo modelo UI (paciente como 1º nível)  
**Prioridade:** Must — Base para Story 2.3 (Vínculos)
