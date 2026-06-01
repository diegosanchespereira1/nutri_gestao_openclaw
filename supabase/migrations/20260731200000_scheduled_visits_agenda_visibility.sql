-- Agenda: titular/admin vê todas as visitas do workspace; membro vê só as suas ou atribuídas.

create or replace function public.can_view_all_workspace_scheduled_visits()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select auth.uid()) = public.workspace_account_owner_id()
    or exists (
      select 1
      from public.profiles pr
      where pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    );
$$;

drop policy if exists "scheduled_visits_select_own" on public.scheduled_visits;

create policy "scheduled_visits_select_own"
  on public.scheduled_visits for select
  to authenticated
  using (
    not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and (
      (
        public.can_view_all_workspace_scheduled_visits()
        and user_id in (select public.workspace_member_user_ids())
      )
      or user_id = (select auth.uid())
      or exists (
        select 1
        from public.team_members tm
        where
          tm.id = scheduled_visits.assigned_team_member_id
          and tm.member_user_id = (select auth.uid())
          and tm.owner_user_id = public.workspace_account_owner_id()
      )
    )
  );
