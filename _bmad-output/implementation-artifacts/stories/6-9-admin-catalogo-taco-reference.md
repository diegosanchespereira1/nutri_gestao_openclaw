# Story 6.9: Administração — catálogo TACO (referência)

## Estado

Implementado em 2026-04-06.

## Referência rápida

- Migração RLS: `supabase/migrations/20260424120000_taco_reference_foods_admin_rls.sql`
- Actions: `lib/actions/taco-reference-foods-admin.ts`
- UI: `components/admin/taco-catalog-admin.tsx`, `app/(admin)/admin/catalogo-taco/page.tsx`
- Entrada: link em `app/(admin)/admin/page.tsx`

## Resumo

Área em **`/admin`** para **administradores da plataforma** (`profiles.role` ∈ `admin`, `super_admin`) consultarem a **lista completa** de `taco_reference_foods`, criarem, editarem e eliminarem registos. Utilizadores `user` continuam a usar apenas o autocomplete na ficha técnica (Story 6.2), sem acesso a esta UI nem a mutações na tabela.

**Alinhamento de produto:** atende **FR60** / **NFR35** (catálogo partilhado gerido por admin; sem API externa obrigatória). Sobrepõe-se parcialmente ao âmbito futuro da **Story 10.4** (catálogo portarias/TACO/templates); esta story foca só **TACO** na app NutriGestão atual.

---

## User story

As a **administrador** ou **super administrador** do sistema,  
I want **gerir o catálogo de alimentos de referência TACO** na área de administração,  
So that **profissionais pesquisem itens corretos na ficha técnica** e os valores nutricionais permaneçam atualizados sem depender do SQL Editor.

---

## Critérios de aceitação (BDD)

**Given** sessão autenticada com `role` `admin` ou `super_admin`  
**When** acedo a `/admin/...` (rota dedicada ao catálogo TACO)  
**Then** vejo lista paginada ou scrollável com **todos** os registos (`taco_code`, `name`, macronutrientes por 100 g)  
**And** posso filtrar ou pesquisar por nome/código (consistente com `searchTacoFoodsAction`, mas sem limite agressivo de 25 para esta vista — ver notas técnicas)

**Given** admin na mesma rota  
**When** crio um novo alimento com código único e campos obrigatórios válidos  
**Then** o registo persiste e aparece na lista e no autocomplete das receitas

**Given** admin na edição de um item existente  
**When** altero nome ou valores nutricionais (respeitando constraints da tabela)  
**Then** alterações persistem e receitas que já referenciam esse `id` passam a usar os novos valores no cálculo (comportamento esperado: FK por `id`)

**Given** admin solicita eliminar um item  
**When** confirmo a ação  
**Then** o registo é removido **ou** bloqueado com mensagem clara se existir política de negócio (default técnico: `technical_recipe_lines.taco_food_id` tem `ON DELETE SET NULL` — linhas ficam sem TACO; a UI deve avisar)

**Given** utilizador com `role` `user`  
**When** tenta abrir a rota admin do catálogo ou chamar server actions de mutação  
**Then** redirecionamento/forbidden (igual ao resto de `/admin`) e **nenhuma** mutação na base

**Given** utilizador não autenticado  
**When** tenta aceder à rota  
**Then** redireciona para login com `next=` adequado

---

## Contexto técnico existente

| Peça | Local |
|------|--------|
| Tabela | `public.taco_reference_foods` — migração `supabase/migrations/20260421120000_taco_reference_foods.sql` |
| RLS hoje | Só `SELECT` para `authenticated`; **sem** `INSERT`/`UPDATE`/`DELETE` para a app |
| Autocomplete receitas | `lib/actions/taco-reference-foods.ts` (`searchTacoFoodsAction`, limite 25) |
| UI ligação por linha | `components/technical-sheets/taco-line-linker.tsx` |
| Papel admin | `lib/roles.ts` — `canAccessAdminArea` → `admin` \|\| `super_admin` |
| Layout admin | `app/(admin)/layout.tsx` — já valida sessão + `canAccessAdminArea` |
| Middleware | `lib/supabase/middleware.ts` — bloqueia `/admin` para não-admin |

**Nota de âmbito de papel:** O produto usa **admin e super_admin** para `/admin`. Se a decisão for **restringir escrita do catálogo TACO apenas a `super_admin`**, introduzir helper (ex.: `canManageSharedCatalog`) e políticas RLS correspondentes; documentar na story na implementação.

---

## Requisitos técnicos (implementação)

### 1. Row Level Security (Supabase)

- Manter `SELECT` para `authenticated` (profissionais leem para autocomplete).
- Adicionar políticas **`INSERT` / `UPDATE` / `DELETE`** em `taco_reference_foods` permitidas apenas quando existir linha em `public.profiles` com `user_id = auth.uid()` e `role IN ('admin', 'super_admin')`.
- Conceder `insert`, `update`, `delete` ao role `authenticated` a nível de grants; o filtro real fica nas políticas (padrão já usado noutras tabelas com RLS).
- Garantir que políticas são **idempotentes** em migração nova (nomes explícitos, `drop policy if exists` se necessário).

### 2. Server actions (defesa em profundidade)

- Ficheiro dedicado, ex.: `lib/actions/taco-reference-foods-admin.ts` (`"use server"`).
- Em **cada** action pública: `getUser()` → `fetchProfileRole` → `canAccessAdminArea`; se falso, devolver erro controlado (não vazar detalhes).
- Operações: listar (com paginação ou range), obter por id, criar, atualizar, eliminar — validação com **Zod** alinhada aos tipos em `lib/types/taco-reference-foods.ts` e constraints SQL (`taco_code` único, trim não vazio, números não negativos onde aplicável).

### 3. Frontend (App Router)

- Rota sob grupo `(admin)`, ex.: `app/(admin)/admin/catalogo-taco/page.tsx` (ou `/admin/taco` — manter URL curta e clara).
- UI com componentes existentes (shadcn: `Table`, `Dialog`, `Form`, `Button`, `Input`, `toast`).
- Lista completa: **paginação server-side** ou **cursor** recomendado para não carregar milhares de linhas de uma vez se o catálogo crescer; se MVP for poucos centenas, página única com pesquisa pode bastar — documentar limite na revisão.
- Link a partir de `app/(admin)/admin/page.tsx` para a nova página.
- **Não** expor esta rota na sidebar principal (`lib/app-nav.ts`) para `user`; o item `adminNavItem` já só aparece para admin — opcionalmente adicionar sub-navegação mínima na home `/admin` (links).

### 4. UX / cópia

- Títulos em português: «Catálogo TACO (referência)», «Novo alimento», «Editar».
- Eliminar: diálogo de confirmação mencionando que receitas com esse vínculo **perdem a ligação TACO** (set null).

### 5. Testes

- Testes unitários nas funções de validação / mapeamento se extraídas.
- Opcional: teste de integração da policy (se o projeto tiver harness Supabase); caso contrário, checklist manual no code review.

### 6. Segurança

- Nunca confiar só no UI: RLS obrigatória para mutações.
- Manter sanitização de queries em `searchTacoFoodsAction`; reutilizar padrões ao implementar pesquisa admin se usar `ilike` dinâmico.

---

## Ficheiros prováveis a criar ou alterar

- `supabase/migrations/YYYYMMDDHHMMSS_taco_reference_foods_admin_rls.sql` (novo)
- `lib/actions/taco-reference-foods-admin.ts` (novo)
- `app/(admin)/admin/catalogo-taco/page.tsx` (novo)
- Componentes cliente sob `components/admin/` ou `components/taco-catalog/` (novo, conforme convenção do repo)
- `app/(admin)/admin/page.tsx` — link para o catálogo
- `lib/types/taco-reference-foods.ts` — tipos partilhados se necessário para forms

---

## Dependências

- **Story 6.2** (tabela e autocomplete) — concluída.
- Nenhuma dependência das stories 6.6–6.8.

---

## Definição de pronto

- Admin/super_admin consegue CRUD completo via UI em `/admin`.
- `user` não consegue mutar `taco_reference_foods` (verificado por RLS + actions).
- Lista consultável na íntegra (com paginação ou pesquisa server-side documentada).
- Migração aplicável em `supabase db reset` / CI local conforme projeto.

---

## Perguntas em aberto (resolver na implementação ou com PM)

1. **Paginação:** tamanho de página padrão e ordenação (ex.: `name` ASC).
2. **Importação em massa** (CSV): fora do âmbito desta story; pode ser story futura (épico 10).
3. **Apenas `super_admin` para escrita:** confirmar com produto; ajustar `canAccessAdminArea` vs novo helper.

---

_Contexto gerado para implementação sem erros de omissão — alinhar com `nutrigestao-dev` / RLS / TypeScript strict ao codar._
