-- SELECT mais permissiva: o autor da reabertura deve conseguir ler a linha recém-inserida
-- (evita falhas silenciosas do PostgREST quando RETURNING não devolve linhas em cenários RLS).

drop policy if exists "checklist_fill_session_reopen_events_select_workspace"
  on public.checklist_fill_session_reopen_events;

create policy "checklist_fill_session_reopen_events_select_workspace"
  on public.checklist_fill_session_reopen_events for select
  to authenticated
  using (
    owner_user_id = (select public.workspace_account_owner_id())
    or reopened_by_user_id = (select auth.uid())
  );
