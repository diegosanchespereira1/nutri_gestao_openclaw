-- Permite que qualquer membro autenticado do workspace atualize linhas de
-- team_members do mesmo tenant (correção de CRN/dados por colegas).
-- Mantém insert/delete apenas para o titular (policies existentes).

drop policy if exists "team_members_update_workspace_team" on public.team_members;

create policy "team_members_update_workspace_team"
  on public.team_members for update
  to authenticated
  using (
    owner_user_id = (select public.workspace_account_owner_id())
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  )
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and (select auth.uid()) in (select public.workspace_member_user_ids())
  );
