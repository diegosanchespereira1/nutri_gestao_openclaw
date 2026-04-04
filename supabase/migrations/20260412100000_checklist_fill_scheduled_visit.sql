-- Liga rascunhos de checklist a visitas agendadas (Story 4.2 — FR18).

alter table public.checklist_fill_sessions
  add column if not exists scheduled_visit_id uuid references public.scheduled_visits (id) on delete set null;

create index if not exists checklist_fill_sessions_scheduled_visit_idx
  on public.checklist_fill_sessions (scheduled_visit_id)
  where
    scheduled_visit_id is not null;
