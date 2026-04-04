-- Rascunhos de preenchimento de checklist — Story 3.2 (FR13).
-- Uma sessão por fluxo; respostas por item do template (tenant = user_id).

create table if not exists public.checklist_fill_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  template_id uuid not null references public.checklist_templates (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checklist_fill_sessions_user_updated_idx
  on public.checklist_fill_sessions (user_id, updated_at desc);

create table if not exists public.checklist_fill_item_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.checklist_fill_sessions (id) on delete cascade,
  template_item_id uuid not null references public.checklist_template_items (id) on delete cascade,
  outcome text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_fill_item_responses_outcome_check check (
    outcome in ('conforme', 'nc', 'na')
  ),
  constraint checklist_fill_item_responses_session_item_key unique (session_id, template_item_id)
);

create index if not exists checklist_fill_item_responses_session_idx
  on public.checklist_fill_item_responses (session_id);

alter table public.checklist_fill_sessions enable row level security;
alter table public.checklist_fill_item_responses enable row level security;

create policy "checklist_fill_sessions_select_own"
  on public.checklist_fill_sessions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "checklist_fill_sessions_insert_own"
  on public.checklist_fill_sessions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "checklist_fill_sessions_update_own"
  on public.checklist_fill_sessions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "checklist_fill_sessions_delete_own"
  on public.checklist_fill_sessions for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "checklist_fill_item_responses_select_own"
  on public.checklist_fill_item_responses for select
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id = (select auth.uid())
    )
  );

create policy "checklist_fill_item_responses_insert_own"
  on public.checklist_fill_item_responses for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id = (select auth.uid())
    )
  );

create policy "checklist_fill_item_responses_update_own"
  on public.checklist_fill_item_responses for update
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id = (select auth.uid())
    )
  );

create policy "checklist_fill_item_responses_delete_own"
  on public.checklist_fill_item_responses for delete
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.checklist_fill_sessions to authenticated;
grant select, insert, update, delete on public.checklist_fill_item_responses to authenticated;

create or replace function public.checklist_fill_sessions_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checklist_fill_sessions_set_updated_at on public.checklist_fill_sessions;

create trigger checklist_fill_sessions_set_updated_at
before update on public.checklist_fill_sessions
for each row
execute function public.checklist_fill_sessions_touch_updated_at ();

create or replace function public.checklist_fill_item_responses_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checklist_fill_item_responses_set_updated_at on public.checklist_fill_item_responses;

create trigger checklist_fill_item_responses_set_updated_at
before update on public.checklist_fill_item_responses
for each row
execute function public.checklist_fill_item_responses_touch_updated_at ();

create or replace function public.checklist_fill_touch_session_from_response ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.checklist_fill_sessions
    set updated_at = now()
    where id = old.session_id;
    return old;
  end if;
  update public.checklist_fill_sessions
  set updated_at = now()
  where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists checklist_fill_item_responses_touch_session on public.checklist_fill_item_responses;

create trigger checklist_fill_item_responses_touch_session
after insert or update or delete on public.checklist_fill_item_responses
for each row
execute function public.checklist_fill_touch_session_from_response ();
