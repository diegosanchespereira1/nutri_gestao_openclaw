-- Reaplica políticas de receitas técnicas no modelo actual (pivot client_id, migração 20260524100000)
-- com workspace da equipa. Corrige o bloco herdado de 20260523140000 em 20260617120000.

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
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "technical_recipes_insert_own"
  on public.technical_recipes for insert
  to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
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
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
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
        and c.owner_user_id = (select public.workspace_account_owner_id())
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
        and c.owner_user_id = (select public.workspace_account_owner_id())
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
        and c.owner_user_id = (select public.workspace_account_owner_id())
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
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  )
  with check (
    exists (
      select 1
      from public.technical_recipes r
      join public.clients c on c.id = r.client_id
      where r.id = recipe_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
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
        and c.owner_user_id = (select public.workspace_account_owner_id())
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
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
    -- Receita pertence ao mesmo client e é template/repositório
    and exists (
      select 1 from public.technical_recipes r
      where r.id = recipe_id
        and r.is_template = true
        and r.client_id = technical_recipe_template_favorites.client_id
    )
  );

-- select/delete de favoritos já alinhados em 20260617120000 (workspace_account_owner_id).
