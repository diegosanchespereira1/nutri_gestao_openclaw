-- FR-REC-001: Contexto explícito de receita — Estabelecimento vs Repositório de Receitas.
-- Formaliza o campo `contexto` como ENUM, eliminando a ambiguidade do "Catálogo Partilhado".
-- O estado implícito (establishment_id IS NULL = catálogo) passa a ser explícito (contexto = 'REPOSITORIO').
-- Adiciona rastreabilidade de linhagem via `repository_origin_id`.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TIPO ENUM
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.recipe_context as enum ('ESTABELECIMENTO', 'REPOSITORIO');
exception when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADICIONAR COLUNA `contexto` (nullable para preenchimento via UPDATE)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.technical_recipes
  add column if not exists contexto public.recipe_context;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. MIGRAÇÃO DE DADOS EXISTENTES
--    establishment_id IS NOT NULL → ESTABELECIMENTO
--    establishment_id IS NULL     → REPOSITORIO  (catálogo do cliente legado)
-- ─────────────────────────────────────────────────────────────────────────────
update public.technical_recipes
set contexto = case
  when establishment_id is not null then 'ESTABELECIMENTO'::public.recipe_context
  else                                   'REPOSITORIO'::public.recipe_context
end
where contexto is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TORNAR `contexto` NOT NULL + DEFAULT para novos registros
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.technical_recipes
  alter column contexto set not null;

alter table public.technical_recipes
  alter column contexto set default 'ESTABELECIMENTO';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. COLUNA DE LINHAGEM: `repository_origin_id`
--    Preenchida quando uma receita de estabelecimento é criada a partir de
--    uma receita do repositório. A receita do repositório permanece intacta.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.technical_recipes
  add column if not exists repository_origin_id uuid
    references public.technical_recipes (id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. CHECK CONSTRAINTS DE INTEGRIDADE
-- ─────────────────────────────────────────────────────────────────────────────

-- 6a. Garante coerência entre contexto e establishment_id
alter table public.technical_recipes
  drop constraint if exists technical_recipes_contexto_establishment_check;

alter table public.technical_recipes
  add constraint technical_recipes_contexto_establishment_check
  check (
    (contexto = 'ESTABELECIMENTO' and establishment_id is not null)
    or
    (contexto = 'REPOSITORIO'     and establishment_id is null)
  );

-- 6b. repository_origin_id só é válido em receitas de estabelecimento
alter table public.technical_recipes
  drop constraint if exists technical_recipes_origin_context_check;

alter table public.technical_recipes
  add constraint technical_recipes_origin_context_check
  check (
    repository_origin_id is null
    or contexto = 'ESTABELECIMENTO'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ÍNDICES DE PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists technical_recipes_contexto_client_idx
  on public.technical_recipes (contexto, client_id, created_at desc);

create index if not exists technical_recipes_repository_origin_idx
  on public.technical_recipes (repository_origin_id)
  where repository_origin_id is not null;

-- Índice específico para listar o Repositório de Receitas de um cliente
create index if not exists technical_recipes_repositorio_client_idx
  on public.technical_recipes (client_id, created_at desc)
  where contexto = 'REPOSITORIO';

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. COMPATIBILIDADE RETROATIVA: is_template
--    Receitas do repositório são tratadas como templates.
--    Mantém is_template = true para receitas de repositório para não quebrar
--    lógica legada enquanto a UI não é atualizada.
-- ─────────────────────────────────────────────────────────────────────────────
update public.technical_recipes
set is_template = true
where contexto = 'REPOSITORIO'
  and is_template = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ATUALIZAÇÃO DAS POLÍTICAS RLS — technical_recipes
--    Simplificação: client_id (NOT NULL) é o único pivot de ownership.
--    O CHECK constraint garante integridade contexto/establishment_id.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "technical_recipes_select_own" on public.technical_recipes;
drop policy if exists "technical_recipes_insert_own" on public.technical_recipes;
drop policy if exists "technical_recipes_update_own" on public.technical_recipes;
drop policy if exists "technical_recipes_delete_own" on public.technical_recipes;

create policy "technical_recipes_select_own"
  on public.technical_recipes for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "technical_recipes_insert_own"
  on public.technical_recipes for insert
  to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "technical_recipes_update_own"
  on public.technical_recipes for update
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "technical_recipes_delete_own"
  on public.technical_recipes for delete
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ATUALIZAÇÃO DAS POLÍTICAS RLS — technical_recipe_lines
--     Simplificação via join em client_id (não precisa mais bifurcar em IS NULL/IS NOT NULL).
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "technical_recipe_lines_select_own" on public.technical_recipe_lines;
drop policy if exists "technical_recipe_lines_insert_own" on public.technical_recipe_lines;
drop policy if exists "technical_recipe_lines_update_own" on public.technical_recipe_lines;
drop policy if exists "technical_recipe_lines_delete_own" on public.technical_recipe_lines;

create policy "technical_recipe_lines_select_own"
  on public.technical_recipe_lines for select
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      join public.clients c on c.id = r.client_id
      where r.id = recipe_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "technical_recipe_lines_insert_own"
  on public.technical_recipe_lines for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.technical_recipes r
      join public.clients c on c.id = r.client_id
      where r.id = recipe_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "technical_recipe_lines_update_own"
  on public.technical_recipe_lines for update
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      join public.clients c on c.id = r.client_id
      where r.id = recipe_id
        and c.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.technical_recipes r
      join public.clients c on c.id = r.client_id
      where r.id = recipe_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "technical_recipe_lines_delete_own"
  on public.technical_recipe_lines for delete
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      join public.clients c on c.id = r.client_id
      where r.id = recipe_id
        and c.owner_user_id = (select auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ATUALIZAÇÃO DAS POLÍTICAS RLS — technical_recipe_template_favorites
--     Permite favoritar receitas de repositório (establishment_id IS NULL) do mesmo client.
--     A política anterior assumia establishment_id IS NOT NULL via join.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "technical_recipe_template_favorites_insert_own"
  on public.technical_recipe_template_favorites;

create policy "technical_recipe_template_favorites_insert_own"
  on public.technical_recipe_template_favorites for insert
  to authenticated
  with check (
    -- Usuário é dono do client
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
    -- Receita pertence ao mesmo client e é template/repositório
    and exists (
      select 1 from public.technical_recipes r
      where r.id = recipe_id
        and r.is_template = true
        and r.client_id = technical_recipe_template_favorites.client_id
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. COMENTÁRIOS DE DOCUMENTAÇÃO
-- ─────────────────────────────────────────────────────────────────────────────
comment on column public.technical_recipes.contexto is
  'FR-REC-001: Contexto de armazenamento. ESTABELECIMENTO = vinculada a um estabelecimento específico. REPOSITORIO = genérica e reutilizável, sem vínculo.';

comment on column public.technical_recipes.repository_origin_id is
  'FR-REC-001: ID da receita do Repositório usada como modelo de origem. NULL se criada do zero. Receita do repositório é independente — alterações nela não afetam cópias existentes.';
