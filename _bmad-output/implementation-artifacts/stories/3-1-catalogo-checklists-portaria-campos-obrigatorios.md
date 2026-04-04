# Story 3.1: Catálogo de checklists por portaria e campos obrigatórios

## Contexto

O Epic 2 (Cadastro Operacional) está completo — clientes, estabelecimentos, pacientes e importação
em massa estão prontos. O Epic 3 começa o coração do produto: checklists regulatórios.

Esta story cria a fundação de dados para os checklists. As templates de portaria são **globais**
(mantidas pelo admin da plataforma via seed/migration), não pertencem a um tenant. O profissional
navega o catálogo filtrado pela UF e tipo do estabelecimento e vê, em leitura, os itens com badge
de obrigatório — sem poder editar o catálogo oficial.

A Story 3.2 (preenchimento) e 3.3 (checklists customizados) dependem desta fundação.

## Objetivo

O profissional abre o módulo de Checklists, seleciona um estabelecimento e vê a lista de templates
de portaria aplicáveis (filtrados por UF + tipo), com itens marcados como obrigatórios — e pode
expandir cada template para inspecionar seus itens antes de iniciar um preenchimento (story 3.2).

## Stack & Convenções

- Framework: Next.js 16 App Router, TypeScript strict
- Styling: Tailwind CSS + Base UI (`@base-ui/react`)
- Auth: `@supabase/ssr` — `createClient()` de `@/lib/supabase/server` em Server Components
- DB: Supabase PostgreSQL; RLS em tabelas de tenant (templates são globais, leitura pública auth)
- Rota: `app/(app)/checklists/`
- Componentes: `components/checklists/`
- Tipos: `lib/types/checklists.ts`

## Requisitos Funcionais

**FR12:** Sistema disponibiliza checklists pré-configurados por portaria sanitária estadual com campos
obrigatórios identificados.

- Templates são criados/atualizados pelo admin via migrations/seed (fora do escopo desta story)
- MVP foca em SP; estrutura já suporta expansão para outras UFs sem mudança de código
- Cada template tem seções (ex.: "Manipulação", "Armazenamento") e itens dentro de cada seção
- Cada item tem um flag `is_required` com badge visual distinto
- Dados nunca vazam entre tenants (templates são globais — não têm `owner_user_id`)

## Critérios de Aceitação

**Given** profissional logado com estabelecimentos cadastrados (UF e tipo configurados)
**When** abre `/checklists`
**Then** vê lista de templates com nome da portaria, UF, tipo(s) de estabelecimento aplicável e contagem de itens obrigatórios
**And** pode filtrar por estabelecimento (filtra automaticamente pela UF + tipo)

**Given** template listado
**When** expande / abre detalhe do template
**Then** vê seções com itens, cada item obrigatório com badge "Obrigatório" em destaque
**And** itens não-obrigatórios aparecem sem badge

**Given** templates no banco
**When** qualquer consulta ao catálogo
**Then** dados vêm apenas das tabelas globais de catálogo (RLS SELECT para todos autenticados)
**And** nenhum profissional consegue ver, alterar ou criar templates oficiais via client

## Modelo de Dados

### Tabelas (catálogo global — sem `owner_user_id`)

```sql
-- Templates de portaria (admin-managed, global)
checklist_templates
  id               uuid PK
  name             text        -- "Portaria CVS-5/2013 — Boas Práticas"
  portaria_ref     text        -- "CVS-5/2013"
  uf               text        -- "SP" | "*" (qualquer UF)
  applies_to       text[]      -- ["escola","hospital","clinica","lar_idosos","empresa"]
  description      text
  version          integer     -- versionamento simples
  is_active        boolean     -- false = arquivado
  created_at       timestamptz
  updated_at       timestamptz

-- Seções dentro de um template
checklist_template_sections
  id               uuid PK
  template_id      uuid FK → checklist_templates
  title            text
  position         integer     -- ordem de exibição
  created_at       timestamptz

-- Itens dentro de uma seção
checklist_template_items
  id               uuid PK
  section_id       uuid FK → checklist_template_sections
  description      text        -- texto do item regulatório
  is_required      boolean     -- badge "Obrigatório"
  position         integer
  created_at       timestamptz
```

### RLS (catálogo global)

```sql
-- Todos os utilizadores autenticados podem ler o catálogo
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read" ON checklist_templates
  FOR SELECT TO authenticated USING (true);
-- Sem INSERT/UPDATE/DELETE no client — apenas via service_role (migrations/admin)

-- Mesma política para secções e itens
ALTER TABLE checklist_template_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read" ON checklist_template_sections
  FOR SELECT TO authenticated USING (true);

ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read" ON checklist_template_items
  FOR SELECT TO authenticated USING (true);
```

### Seed de dados MVP (SP)

Incluir na migration um INSERT com pelo menos **1 template completo** da Portaria CVS-5/2013 (São Paulo)
com ~10 itens exemplo distribuídos em 2-3 seções, com `is_required` variado — suficiente para validar
UI e testar filtragem.

## Tarefas de Implementação

### Backend / Banco de Dados

- [x] **Migration:** `supabase/migrations/20260404120000_checklist_templates.sql`
  - Criar `checklist_templates`, `checklist_template_sections`, `checklist_template_items`
  - RLS SELECT para `authenticated` nas 3 tabelas
  - Índices: `checklist_templates(uf, is_active)`, `checklist_template_sections(template_id, position)`, `checklist_template_items(section_id, position)`
- [x] **Seed incluído na migration:** 1 template CVS-5/2013 SP com 3 seções e ~10 itens (mix required/optional)

### Tipos TypeScript

- [x] `lib/types/checklists.ts`
  - `ChecklistTemplate`, `ChecklistTemplateSection`, `ChecklistTemplateItem`
  - `ChecklistTemplateWithSections` (template + sections + items aninhados)
  - `EstablishmentType` (reusar de `lib/types/establishments.ts` se disponível)

### Server Actions / Data Access

- [x] `lib/actions/checklists.ts`
  - `loadChecklistCatalog()` — lê catálogo global com auth guard
  - `getChecklistTemplateWithItems(templateId)` — a partir do catálogo carregado
- [x] `lib/checklists/filter-templates.ts` — filtro por estabelecimento (UF + tipo) para uso no cliente
- [x] `loadEstablishmentsForOwner` em `lib/actions/establishments.ts`

### Frontend

- [x] **Página listagem:** `app/(app)/checklists/page.tsx` (Server Component)
  - Auth guard: redirect se não logado
  - Carrega lista de estabelecimentos do profissional (para filtro)
  - Carrega templates filtrados (por padrão todos ativos)
  - Passa dados para Client Component de filtro + lista

- [x] **Componente lista/filtro:** `components/checklists/checklist-catalog.tsx` (Client Component)
  - Select de estabelecimento → filtra templates por UF + tipo automaticamente
  - Cards de template com: nome, portaria_ref, UF, tipos aplicáveis, contagem de itens obrigatórios
  - Estado expandido: mostra seções e itens com badge "Obrigatório" para `is_required = true`
  - CTA "Usar template" (desabilitado por ora — story 3.2)

- [x] **Componente item de template:** `components/checklists/template-item-row.tsx`
  - Linha de item com badge condicional (required/optional)
  - Descrição do item regulatório

- [x] **Navegação:** adicionar `{ href: "/checklists", label: "Checklists", icon: ClipboardCheck }` ao `lib/app-nav.ts`

### Segurança & Compliance

- [x] RLS verificada: SELECT sem filtro por `owner_user_id` é correto para tabelas globais
- [x] Confirmar que nenhuma rota ou action aceita INSERT/UPDATE nos templates (sem policy para isso no client)
- [x] Dados de template não são PII — sem obrigação LGPD específica
- [x] TypeScript strict sem erros

## Arquivos a Criar/Modificar

```
supabase/migrations/
  20260404120000_checklist_templates.sql    [CRIADO]

lib/
  types/checklists.ts                        [CRIAR]
  actions/checklists.ts                      [CRIAR]
  app-nav.ts                                 [MODIFICAR — adicionar Checklists]

app/(app)/
  checklists/
    page.tsx                                 [CRIAR]

components/
  checklists/
    checklist-catalog.tsx                    [CRIAR]
    template-item-row.tsx                    [CRIAR]
```

## Definição de Pronto (DoD)

- [x] Migration executa sem erros; seed inclui 1 template SP com seções e itens
- [x] RLS: `authenticated` pode SELECT; nenhuma policy de escrita no client
- [x] Profissional vê templates filtrados por estabelecimento na UI
- [x] Badge "Obrigatório" visível em itens com `is_required = true`
- [x] TypeScript: `npx tsc --noEmit` sem erros
- [x] Sprint status atualizado para `done`

## Notas de Implementação

**Filtragem por estabelecimento:** ao selecionar um estabelecimento no Select, filtrar templates onde
`uf = estabelecimento.state OR uf = '*'` AND `applies_to @> ARRAY[estabelecimento.establishment_type]`.
O filtro pode ser client-side se o volume de templates MVP for pequeno (< 20); para produção
considerar query server-side.

**Versionamento:** `checklist_templates.version` começa em 1 e incrementa quando admin atualiza.
A Story 10.5 (admin CRUD) gerenciará isso. Por ora, o campo existe mas não é exibido na UI.

**Expansão para outras UFs:** a coluna `uf = '*'` permite templates federais/gerais que se aplicam
a qualquer UF — útil para portarias do Ministério da Saúde aplicáveis em todo Brasil.
