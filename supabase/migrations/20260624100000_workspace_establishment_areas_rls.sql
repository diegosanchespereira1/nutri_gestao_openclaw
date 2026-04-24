-- Áreas de estabelecimento: RLS por tenant (titular do workspace), não auth.uid().
-- A app grava owner_user_id = workspace_account_owner_id(); políticas antigas
-- (owner_user_id = auth.uid()) bloqueavam membros da equipa.

drop policy if exists "establishment_areas_select_own" on public.establishment_areas;
drop policy if exists "establishment_areas_insert_own" on public.establishment_areas;
drop policy if exists "establishment_areas_update_own" on public.establishment_areas;
drop policy if exists "establishment_areas_delete_own" on public.establishment_areas;

create policy "establishment_areas_select_own"
  on public.establishment_areas
  for select
  to authenticated
  using (
    not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_areas.establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "establishment_areas_insert_own"
  on public.establishment_areas
  for insert
  to authenticated
  with check (
    not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and owner_user_id = (select public.workspace_account_owner_id())
    and exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_areas.establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

create policy "establishment_areas_update_own"
  on public.establishment_areas
  for update
  to authenticated
  using (
    not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_areas.establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  )
  with check (
    not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and owner_user_id = (select public.workspace_account_owner_id())
    and exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_areas.establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

create policy "establishment_areas_delete_own"
  on public.establishment_areas
  for delete
  to authenticated
  using (
    not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_areas.establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );
