-- Permite que membros com cargo Gestão adicionem novos usuários à equipe.

drop policy if exists "team_members_insert_own" on public.team_members;

create policy "team_members_insert_own"
  on public.team_members for insert
  to authenticated
  with check (
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
    )
  );
