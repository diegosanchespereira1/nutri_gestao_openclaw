# Story 2.6: Importação CSV/Excel — mapeamento e erros

## Contexto

O Epic 2 cobre o cadastro operacional completo. As stories 2.1–2.5 já entregaram:
- CRUD completo de clientes PF/PJ (`public.clients`)
- Estabelecimentos vinculados a clientes PJ (`public.establishments`)
- Pacientes com vínculos (`public.patients`)
- Perfil nutricional e formulários de avaliação
- Histórico consolidado multi-estabelecimento

Esta story fecha o Epic 2 entregando a migração rápida do Excel: o profissional faz upload de um CSV, mapeia as colunas e importa clientes, estabelecimentos ou pacientes em bulk — sem digitar registro a registro.

## Objetivo

Após esta story, o profissional consegue migrar toda sua base do Excel/planilha para o NutriGestão em minutos, com pré-visualização de erros por linha antes de confirmar a importação.

## Stack & Convenções

- **Framework:** Next.js App Router, TypeScript strict (sem `any`)
- **Styling:** Tailwind CSS + shadcn/ui (Base UI — `@base-ui/react`)
- **Auth:** `@supabase/ssr` — toda Server Action começa com `createClient()` + `getUser()`
- **DB:** Supabase PostgreSQL — tenant isolado por `owner_user_id` via RLS
- **Rota:** `app/(app)/importar/`
- **Tipos existentes:** `ClientRow`, `ClientKind` em `lib/types/clients.ts`; `EstablishmentRow`, `EstablishmentType` em `lib/types/establishments.ts`; `PatientRow` em `lib/types/patients.ts`
- **Convenção de actions:** `"use server"` em `lib/actions/*.ts`; retornam objeto `{ error?: string }` ou fazem `redirect()`
- **Convenção SQL:** snake_case, `owner_user_id` como tenant key em `clients`; RLS via `owner_user_id = (select auth.uid())`

## Requisitos Funcionais

- **FR11:** Profissional pode importar clientes, estabelecimentos e pacientes a partir de arquivo CSV/Excel
- **NFR7:** Importação deve aceitar até 500 registros em menos de 30 segundos

## Critérios de Aceitação

**AC1 — Upload e mapeamento de colunas**
- **Given** o profissional está na página de importação
- **When** faz upload de um arquivo CSV ou Excel (.xlsx)
- **Then** o sistema exibe as colunas detectadas e permite mapear cada uma para os campos do sistema (ex: "Nome" → `legal_name`, "CPF" → `document_id`)

**AC2 — Pré-visualização com erros por linha**
- **Given** o mapeamento está configurado
- **When** clica em "Pré-visualizar"
- **Then** vê uma tabela com todos os registros, destacando em vermelho as linhas com erro (campo obrigatório vazio, CPF/CNPJ inválido, tipo desconhecido)
- **And** pode corrigir ou ignorar linhas com erro antes de confirmar

**AC3 — Importação e feedback de resultado**
- **Given** a pré-visualização está completa (com ou sem linhas ignoradas)
- **When** confirma a importação
- **Then** os registros válidos são criados no banco com `owner_user_id` do tenant
- **And** um resumo é exibido: "X importados, Y com erro ignorados"

**AC4 — Limite de registros**
- **Given** arquivo com mais de 500 linhas
- **When** faz o upload
- **Then** o sistema exibe aviso de limite e importa apenas as primeiras 500 linhas

**AC5 — Isolamento de tenant**
- **And** os registros importados pertencem exclusivamente ao tenant autenticado (RLS garante)

## Tarefas de Implementação

### Backend / Banco de Dados

- [ ] **Sem nova migração SQL necessária** — as tabelas `clients`, `establishments` e `patients` já existem com RLS configurado
- [ ] **Server Action `importClientsAction`** em `lib/actions/import.ts`:
  - Recebe array de registros já parseados e validados no client
  - Valida autenticação (`getUser()`)
  - Faz `supabase.from('clients').insert(records)` com `owner_user_id: user.id`
  - Retorna `{ imported: number, errors: string[] }`
- [ ] **Server Action `importEstablishmentsAction`** — mesma estrutura para `establishments`
- [ ] **Server Action `importPatientsAction`** — mesma estrutura para `patients`

### Frontend

- [ ] **Instalar dependência:** `papaparse` (CSV) + `@types/papaparse` e `xlsx` (Excel) — ambos já estão disponíveis na sandbox React do projeto, verificar package.json
- [ ] **Página `app/(app)/importar/page.tsx`** — Server Component simples com título e render do componente client
- [ ] **Componente `ImportWizard`** (`components/importar/import-wizard.tsx`) — Client Component com 3 etapas:
  1. **Etapa 1 — Upload:** Drag & drop ou input de arquivo, aceita `.csv` e `.xlsx`; detecta colunas e exibe lista
  2. **Etapa 2 — Mapeamento:** Select para cada coluna detectada → campo do sistema; tipo de entidade (Clientes / Estabelecimentos / Pacientes)
  3. **Etapa 3 — Pré-visualização e confirmação:** Tabela com dados parseados; linhas com erro em vermelho; botão "Importar X registros válidos"
- [ ] **Componente `PreviewTable`** (`components/importar/preview-table.tsx`) — tabela paginada de até 500 linhas com highlight de erros
- [ ] **Parser client-side** (`lib/import/parser.ts`) — lógica de parse CSV/Excel + validação por tipo de entidade; retorna `{ rows: ParsedRow[], errors: RowError[] }`
- [ ] **Tipos** (`lib/types/import.ts`) — `ParsedRow`, `RowError`, `FieldMapping`, `ImportEntity`
- [ ] **Link no sidebar** — adicionar item "Importar" em `components/app-shell.tsx` com ícone `Upload` do Lucide

### Segurança & Compliance

- [ ] **RLS garantido pelas tabelas existentes** — `owner_user_id = auth.uid()` já está configurado; a Server Action apenas insere com `owner_user_id: user.id` do token
- [ ] **Validação server-side obrigatória:** a Server Action revalida cada registro antes de inserir (não confia apenas no client)
- [ ] **Limite de 500 linhas** verificado no client (feedback imediato) e no server (proteção extra)
- [ ] **Nenhum dado sensível de paciente** é logado nas Server Actions
- [ ] **LGPD:** campos sensíveis como `document_id` (CPF/CNPJ) são tratados apenas em memória durante o parse; não são enviados ao servidor até a confirmação explícita do usuário

## Arquivos a Criar/Modificar

### Criar
```
lib/types/import.ts
lib/import/parser.ts
lib/actions/import.ts
app/(app)/importar/page.tsx
components/importar/import-wizard.tsx
components/importar/preview-table.tsx
```

### Modificar
```
components/app-shell.tsx          → adicionar link "Importar" no sidebar
package.json                      → verificar/instalar papaparse + xlsx se ausentes
```

## Notas de Implementação

### Parse de CSV (client-side com papaparse)
```typescript
// lib/import/parser.ts
import Papa from 'papaparse'

export function parseCsv(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (result) => resolve(result.data as string[][]),
      error: reject,
      skipEmptyLines: true,
    })
  })
}
```

### Parse de Excel (client-side com xlsx/SheetJS)
```typescript
import * as XLSX from 'xlsx'

export async function parseExcel(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][]
}
```

### Campos mapeáveis por entidade

**Clientes:**
| Campo sistema | Label PT-BR | Obrigatório |
|---|---|---|
| `legal_name` | Nome / Razão Social | ✅ |
| `kind` | Tipo (pf/pj) | ✅ |
| `document_id` | CPF / CNPJ | ❌ |
| `email` | Email | ❌ |
| `phone` | Telefone | ❌ |
| `trade_name` | Nome Fantasia | ❌ |

**Estabelecimentos:**
| Campo sistema | Label PT-BR | Obrigatório |
|---|---|---|
| `name` | Nome | ✅ |
| `establishment_type` | Tipo (escola/hospital/clinica/lar_idosos/empresa) | ✅ |
| `address_line1` | Endereço | ✅ |
| `city` | Cidade | ❌ |
| `state` | Estado (UF) | ❌ |

**Pacientes:**
| Campo sistema | Label PT-BR | Obrigatório |
|---|---|---|
| `full_name` | Nome completo | ✅ |
| `birth_date` | Data de nascimento (YYYY-MM-DD) | ❌ |
| `sex` | Sexo (female/male/other) | ❌ |
| `email` | Email | ❌ |
| `phone` | Telefone | ❌ |

### Template CSV disponível para download
Criar um CSV de exemplo para cada tipo de entidade, disponível para download na Etapa 1 do wizard.

## Definição de Pronto (DoD)

- [ ] TypeScript sem erros (`tsc --noEmit`)
- [ ] Upload de CSV e Excel funciona no browser
- [ ] Mapeamento de colunas salvo em estado local (não enviado ao servidor até confirmação)
- [ ] Pré-visualização exibe erros por linha com destaque visual vermelho
- [ ] Importação cria registros com `owner_user_id` correto (RLS validado)
- [ ] Limite de 500 linhas tratado com feedback claro ao usuário
- [ ] Link "Importar" aparece no sidebar da área logada
- [ ] Sprint status atualizado para `done`
