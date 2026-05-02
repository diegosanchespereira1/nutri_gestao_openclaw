-- DELETE em team_members: titular do workspace, membro com cargo Gestão no mesmo
-- tenant, ou utilizador com role admin/super_admin em profiles.

drop policy if exists "team_members_delete_workspace_managers" on public.team_members;

create policy "team_members_delete_workspace_managers"
  on public.team_members for delete
  to authenticated
  using (
    owner_user_id = (select public.workspace_account_owner_id())
    and (
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
      )
    )
  );
