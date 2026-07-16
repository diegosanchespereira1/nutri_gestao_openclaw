-- Restaura UPDATE de clients/establishments (e escrita de séries escolares)
-- para todos os membros do workspace.
--
-- Contexto: 20260725100001 restringiu UPDATE/DELETE ao titular; depois
-- 20260729120000 voltou a permitir INSERT pela equipe. Na prática a equipe
-- cria clientes mas não consegue editar/salvar — o formulário continua
-- disponível e falha com "Sem permissão".
--
-- DELETE de clients/establishments permanece só do titular.
-- SELECT continua por tenant (owner_user_id = workspace_account_owner_id()).

-- ── clients ─────────────────────────────────────────────────────────────────

drop policy if exists "clients_update_own" on public.clients;

create policy "clients_update_own"
  on public.clients
  for update
  to authenticated
  using (
    owner_user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  )
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  );

comment on policy "clients_update_own" on public.clients is
  'Titular e membros da equipa podem editar clientes do workspace. DELETE permanece só do titular.';

-- ── establishments ──────────────────────────────────────────────────────────

drop policy if exists "establishments_update_own" on public.establishments;

create policy "establishments_update_own"
  on public.establishments
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = establishments.client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  )
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = establishments.client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  );

comment on policy "establishments_update_own" on public.establishments is
  'Titular e membros da equipa podem editar estabelecimentos do workspace.';

-- ── client_school_grades ────────────────────────────────────────────────────
-- Alinha escrita de séries ao mesmo padrão (criar/editar/remover na ficha do cliente).

drop policy if exists "client_school_grades_insert_own" on public.client_school_grades;
drop policy if exists "client_school_grades_update_own" on public.client_school_grades;
drop policy if exists "client_school_grades_delete_own" on public.client_school_grades;

create policy "client_school_grades_insert_own"
  on public.client_school_grades
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  );

create policy "client_school_grades_update_own"
  on public.client_school_grades
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  )
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  );

create policy "client_school_grades_delete_own"
  on public.client_school_grades
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  );
