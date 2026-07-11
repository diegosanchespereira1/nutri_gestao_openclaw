-- Corrige recursão infinita na policy INSERT de team_members.
-- A policy 20260830125000 fazia EXISTS em team_members dentro do WITH CHECK
-- da própria tabela, o que gera: "infinite recursion detected in policy".
-- Sintoma na app: conta auth criada, falha ao vincular o membro, rollback do user.

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
  );
$$;

comment on function public.is_workspace_gestao_member() is
  'True quando o utilizador autenticado tem cargo Gestão no workspace atual. '
  'SECURITY DEFINER para evitar recursão RLS em policies de team_members.';

revoke all on function public.is_workspace_gestao_member() from public;
grant execute on function public.is_workspace_gestao_member() to authenticated;
grant execute on function public.is_workspace_gestao_member() to service_role;

drop policy if exists "team_members_insert_own" on public.team_members;

create policy "team_members_insert_own"
  on public.team_members for insert
  to authenticated
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

-- Alinha DELETE ao mesmo helper (evita o mesmo risco de recursão).
drop policy if exists "team_members_delete_workspace_managers" on public.team_members;

create policy "team_members_delete_workspace_managers"
  on public.team_members for delete
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
  );
