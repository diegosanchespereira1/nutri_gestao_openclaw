-- Permite UPDATE em team_members para cargo Gestão (e alinha com insert/delete).
-- Usa is_workspace_gestao_member() (SECURITY DEFINER) para evitar recursão RLS.

drop policy if exists "team_members_update_workspace_managers" on public.team_members;

create policy "team_members_update_workspace_managers"
  on public.team_members for update
  to authenticated
  using (
    owner_user_id = (select public.workspace_account_owner_id())
    and (
      (select auth.uid()) = (select public.workspace_account_owner_id())
      or (select public.is_workspace_gestao_member())
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
      or (select public.is_workspace_gestao_member())
      or exists (
        select 1
        from public.profiles pr
        where
          pr.user_id = (select auth.uid())
          and pr.role in ('admin', 'super_admin')
      )
    )
  );
