-- Cargo Administrativo passa a poder INSERT/UPDATE em team_members
-- (criar, editar ficha), alinhado à app (canManageTeamMembers).
-- DELETE de membros e apagar dados mestres continuam só titular/Gestão/admin.
--
-- Helper SECURITY DEFINER evita recursão RLS (mesmo padrão de
-- is_workspace_gestao_member).

create or replace function public.is_workspace_team_manager()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.team_members tm
    where
      tm.owner_user_id = public.workspace_account_owner_id()
      and tm.member_user_id = (select auth.uid())
      and tm.job_role in ('gestao', 'administrativo')
      and tm.is_active
  );
$$;

comment on function public.is_workspace_team_manager() is
  'True quando o utilizador autenticado tem cargo Gestão ou Administrativo '
  'ativo no workspace atual. SECURITY DEFINER para evitar recursão RLS.';

revoke all on function public.is_workspace_team_manager() from public;
revoke all on function public.is_workspace_team_manager() from anon;
grant execute on function public.is_workspace_team_manager() to authenticated;
grant execute on function public.is_workspace_team_manager() to service_role;

-- Também exige is_active no helper de Gestão (defesa em profundidade).
create or replace function public.is_workspace_gestao_member()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.team_members tm
    where
      tm.owner_user_id = public.workspace_account_owner_id()
      and tm.member_user_id = (select auth.uid())
      and tm.job_role = 'gestao'
      and tm.is_active
  );
$$;

drop policy if exists "team_members_insert_own" on public.team_members;

create policy "team_members_insert_own"
  on public.team_members for insert
  to authenticated
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and (
      (select auth.uid()) = (select public.workspace_account_owner_id())
      or (select public.is_workspace_team_manager())
      or exists (
        select 1
        from public.profiles pr
        where
          pr.user_id = (select auth.uid())
          and pr.role in ('admin', 'super_admin')
      )
    )
  );

drop policy if exists "team_members_update_workspace_managers" on public.team_members;

create policy "team_members_update_workspace_managers"
  on public.team_members for update
  to authenticated
  using (
    owner_user_id = (select public.workspace_account_owner_id())
    and (
      (select auth.uid()) = (select public.workspace_account_owner_id())
      or (select public.is_workspace_team_manager())
      or exists (
        select 1
        from public.profiles pr
        where
          pr.user_id = (select auth.uid())
          and pr.role in ('admin', 'super_admin')
      )
    )
  )
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and (
      (select auth.uid()) = (select public.workspace_account_owner_id())
      or (select public.is_workspace_team_manager())
      or exists (
        select 1
        from public.profiles pr
        where
          pr.user_id = (select auth.uid())
          and pr.role in ('admin', 'super_admin')
      )
    )
  );
