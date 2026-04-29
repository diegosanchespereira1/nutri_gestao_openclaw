-- Permite reabertura de checklist por membros com cargo Gestão (team_members.job_role = gestao).

alter table public.checklist_fill_session_reopen_events
  drop constraint if exists checklist_fill_session_reopen_events_role_check;

alter table public.checklist_fill_session_reopen_events
  add constraint checklist_fill_session_reopen_events_role_check check (
    reopened_by_role in ('owner', 'admin', 'gestao')
  );

drop policy if exists "checklist_fill_session_reopen_events_insert_workspace"
  on public.checklist_fill_session_reopen_events;

create policy "checklist_fill_session_reopen_events_insert_workspace"
  on public.checklist_fill_session_reopen_events for insert
  to authenticated
  with check (
    reopened_by_user_id = (select auth.uid())
    and owner_user_id = (select public.workspace_account_owner_id())
    and exists (
      select 1
      from public.checklist_fill_sessions s
      join public.establishments e on e.id = s.establishment_id
      join public.clients c on c.id = e.client_id
      where
        s.id = session_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
    and (
      (select auth.uid()) = (select public.workspace_account_owner_id())
      or exists (
        select 1
        from public.profiles p
        where
          p.user_id = (select auth.uid())
          and p.role = 'admin'
      )
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
