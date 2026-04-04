-- Modelos personalizados (cópia + itens extra) — Story 3.3 (FR14).

create table if not exists public.checklist_custom_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  source_template_id uuid not null references public.checklist_templates (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checklist_custom_templates_user_idx
  on public.checklist_custom_templates (user_id, updated_at desc);

create index if not exists checklist_custom_templates_establishment_idx
  on public.checklist_custom_templates (establishment_id);

create table if not exists public.checklist_custom_sections (
  id uuid primary key default gen_random_uuid(),
  custom_template_id uuid not null references public.checklist_custom_templates (id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists checklist_custom_sections_tpl_pos_idx
  on public.checklist_custom_sections (custom_template_id, position);

create table if not exists public.checklist_custom_items (
  id uuid primary key default gen_random_uuid(),
  custom_section_id uuid not null references public.checklist_custom_sections (id) on delete cascade,
  description text not null,
  is_required boolean not null default false,
  position integer not null default 0,
  is_user_extra boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists checklist_custom_items_section_pos_idx
  on public.checklist_custom_items (custom_section_id, position);

alter table public.checklist_custom_templates enable row level security;
alter table public.checklist_custom_sections enable row level security;
alter table public.checklist_custom_items enable row level security;

create policy "checklist_custom_templates_own"
  on public.checklist_custom_templates for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "checklist_custom_sections_own"
  on public.checklist_custom_sections for all
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_custom_templates t
      where
        t.id = custom_template_id
        and t.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.checklist_custom_templates t
      where
        t.id = custom_template_id
        and t.user_id = (select auth.uid())
    )
  );

create policy "checklist_custom_items_own"
  on public.checklist_custom_items for all
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_custom_sections s
      join public.checklist_custom_templates t on t.id = s.custom_template_id
      where
        s.id = custom_section_id
        and t.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.checklist_custom_sections s
      join public.checklist_custom_templates t on t.id = s.custom_template_id
      where
        s.id = custom_section_id
        and t.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.checklist_custom_templates to authenticated;
grant select, insert, update, delete on public.checklist_custom_sections to authenticated;
grant select, insert, update, delete on public.checklist_custom_items to authenticated;

create or replace function public.checklist_custom_templates_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checklist_custom_templates_set_updated_at on public.checklist_custom_templates;

create trigger checklist_custom_templates_set_updated_at
before update on public.checklist_custom_templates
for each row
execute function public.checklist_custom_templates_touch_updated_at ();

-- Sessões de preenchimento: modelo global OU personalizado.
alter table public.checklist_fill_sessions
  add column if not exists custom_template_id uuid references public.checklist_custom_templates (id) on delete restrict;

alter table public.checklist_fill_sessions
  alter column template_id drop not null;

alter table public.checklist_fill_sessions
  drop constraint if exists checklist_fill_sessions_one_template;

alter table public.checklist_fill_sessions
  add constraint checklist_fill_sessions_one_template check (
    (
      template_id is not null
      and custom_template_id is null
    )
    or (
      template_id is null
      and custom_template_id is not null
    )
  );

-- Respostas: item global OU item personalizado.
alter table public.checklist_fill_item_responses
  add column if not exists custom_item_id uuid references public.checklist_custom_items (id) on delete cascade;

alter table public.checklist_fill_item_responses
  alter column template_item_id drop not null;

alter table public.checklist_fill_item_responses
  drop constraint if exists checklist_fill_item_responses_session_item_key;

alter table public.checklist_fill_item_responses
  drop constraint if exists checklist_fill_item_responses_one_item;

alter table public.checklist_fill_item_responses
  add constraint checklist_fill_item_responses_one_item check (
    (
      template_item_id is not null
      and custom_item_id is null
    )
    or (
      template_item_id is null
      and custom_item_id is not null
    )
  );

create unique index if not exists checklist_fill_resp_session_global_unique
  on public.checklist_fill_item_responses (session_id, template_item_id)
  where template_item_id is not null;

create unique index if not exists checklist_fill_resp_session_custom_unique
  on public.checklist_fill_item_responses (session_id, custom_item_id)
  where custom_item_id is not null;
