-- Equipe pode UPDATE clients/patients/establishments.
-- DELETE de clients/establishments/patients só titular, cargo gestao ou admin/super_admin.
--
-- clients_update_own / establishments_update_own já foram alargados em
-- 20260830210000; esta migration alinha patients e restringe DELETE a gestão+.

-- ── Helper: pode apagar dados mestres do workspace? ──────────────────────────

create or replace function public.workspace_can_delete_master_data()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    (select auth.uid()) = (select public.workspace_account_owner_id())
    or exists (
      select 1
      from public.team_members tm
      where
        tm.owner_user_id = (select public.workspace_account_owner_id())
        and tm.member_user_id = (select auth.uid())
        and tm.job_role = 'gestao'
    )
    or exists (
      select 1
      from public.profiles pr
      where
        pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    );
$$;

revoke all on function public.workspace_can_delete_master_data() from public;
revoke all on function public.workspace_can_delete_master_data() from anon;
grant execute on function public.workspace_can_delete_master_data() to authenticated;

comment on function public.workspace_can_delete_master_data() is
  'Titular, membro com job_role=gestao ou admin/super_admin da plataforma.';

-- ── patients: UPDATE pela equipe ─────────────────────────────────────────────

drop policy if exists "patients_update_own" on public.patients;

create policy "patients_update_own"
  on public.patients
  for update
  to authenticated
  using (
    user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  )
  with check (
    user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  );

-- ── patients: DELETE só gestão+ ──────────────────────────────────────────────

drop policy if exists "patients_delete_own" on public.patients;

create policy "patients_delete_own"
  on public.patients
  for delete
  to authenticated
  using (
    user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and public.workspace_can_delete_master_data()
  );

-- ── clients: DELETE só gestão+ ───────────────────────────────────────────────

drop policy if exists "clients_delete_own" on public.clients;

create policy "clients_delete_own"
  on public.clients
  for delete
  to authenticated
  using (
    owner_user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and public.workspace_can_delete_master_data()
  );

-- ── establishments: DELETE só gestão+ ────────────────────────────────────────

drop policy if exists "establishments_delete_own" on public.establishments;

create policy "establishments_delete_own"
  on public.establishments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = establishments.client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
    and public.workspace_can_delete_master_data()
  );
