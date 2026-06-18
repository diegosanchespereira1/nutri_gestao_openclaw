-- Rascunhos de modelos da equipe (autosave) + auditoria de checklist workspace
-- e log de atividade da aplicação para rastreabilidade de ações do utilizador.

-- ── 1. Rascunho: published_at NULL = rascunho; NOT NULL = publicado ─────────

alter table public.checklist_workspace_templates
  add column if not exists published_at timestamptz;

comment on column public.checklist_workspace_templates.published_at is
  'NULL enquanto rascunho (autosave na criação). Preenchido ao publicar o modelo.';

update public.checklist_workspace_templates
set published_at = coalesce(published_at, created_at)
where published_at is null;

create index if not exists checklist_workspace_templates_draft_creator_idx
  on public.checklist_workspace_templates (owner_user_id, created_by_user_id, updated_at desc)
  where published_at is null and archived_at is null;

-- ── 2. Log de atividade da aplicação (eventos de UI / fluxos) ───────────────

create table if not exists public.application_activity_log (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 months')
);

comment on table public.application_activity_log is
  'Eventos de atividade rastreáveis (autosave, publicação, navegação em fluxos críticos).';

create index if not exists application_activity_log_owner_created_idx
  on public.application_activity_log (owner_user_id, created_at desc);

create index if not exists application_activity_log_entity_idx
  on public.application_activity_log (entity_type, entity_id)
  where entity_id is not null;

alter table public.application_activity_log enable row level security;

drop policy if exists "application_activity_log_select_workspace"
  on public.application_activity_log;

create policy "application_activity_log_select_workspace"
  on public.application_activity_log for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

drop policy if exists "application_activity_log_insert_actor"
  on public.application_activity_log;

create policy "application_activity_log_insert_actor"
  on public.application_activity_log for insert
  to authenticated
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and actor_user_id = (select auth.uid())
  );

grant select, insert on public.application_activity_log to authenticated;

-- ── 3. Auditoria: checklist_workspace_templates ─────────────────────────────

create or replace function public.audit_checklist_workspace_templates_row_json (
  t public.checklist_workspace_templates
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id,
    'owner_user_id', t.owner_user_id,
    'created_by_user_id', t.created_by_user_id,
    'name', t.name,
    'archived_at', t.archived_at,
    'published_at', t.published_at,
    'version', t.version
  );
$$;

create or replace function public.audit_checklist_workspace_templates_ai ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    new.owner_user_id,
    'checklist_workspace_templates',
    'INSERT',
    new.id,
    null,
    public.audit_checklist_workspace_templates_row_json(new),
    now() + interval '12 months',
    auth.uid()
  );
  return new;
end;
$$;

create or replace function public.audit_checklist_workspace_templates_au ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    new.owner_user_id,
    'checklist_workspace_templates',
    'UPDATE',
    new.id,
    public.audit_checklist_workspace_templates_row_json(old),
    public.audit_checklist_workspace_templates_row_json(new),
    now() + interval '12 months',
    auth.uid()
  );
  return new;
end;
$$;

create or replace function public.audit_checklist_workspace_templates_ad ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    old.owner_user_id,
    'checklist_workspace_templates',
    'DELETE',
    old.id,
    public.audit_checklist_workspace_templates_row_json(old),
    null,
    now() + interval '12 months',
    auth.uid()
  );
  return old;
end;
$$;

drop trigger if exists audit_checklist_workspace_templates_ai
  on public.checklist_workspace_templates;
create trigger audit_checklist_workspace_templates_ai
after insert on public.checklist_workspace_templates
for each row execute function public.audit_checklist_workspace_templates_ai ();

drop trigger if exists audit_checklist_workspace_templates_au
  on public.checklist_workspace_templates;
create trigger audit_checklist_workspace_templates_au
after update on public.checklist_workspace_templates
for each row execute function public.audit_checklist_workspace_templates_au ();

drop trigger if exists audit_checklist_workspace_templates_ad
  on public.checklist_workspace_templates;
create trigger audit_checklist_workspace_templates_ad
after delete on public.checklist_workspace_templates
for each row execute function public.audit_checklist_workspace_templates_ad ();

-- ── 4. Auditoria: checklist_workspace_sections ──────────────────────────────

create or replace function public.audit_checklist_workspace_sections_row_json (
  s public.checklist_workspace_sections
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id,
    'workspace_template_id', s.workspace_template_id,
    'title', s.title,
    'position', s.position
  );
$$;

create or replace function public.audit_checklist_workspace_sections_common (
  p_operation text,
  p_old public.checklist_workspace_sections,
  p_new public.checklist_workspace_sections
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_record_id uuid;
  v_old jsonb;
  v_new jsonb;
begin
  if p_operation = 'DELETE' then
    select t.owner_user_id into v_owner
      from public.checklist_workspace_templates t
     where t.id = p_old.workspace_template_id;
    v_record_id := p_old.id;
    v_old := public.audit_checklist_workspace_sections_row_json(p_old);
    v_new := null;
  else
    select t.owner_user_id into v_owner
      from public.checklist_workspace_templates t
     where t.id = p_new.workspace_template_id;
    v_record_id := p_new.id;
    v_old := case when p_operation = 'UPDATE'
      then public.audit_checklist_workspace_sections_row_json(p_old)
      else null end;
    v_new := public.audit_checklist_workspace_sections_row_json(p_new);
  end if;

  if v_owner is null then
    return;
  end if;

  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    v_owner,
    'checklist_workspace_sections',
    p_operation,
    v_record_id,
    v_old,
    v_new,
    now() + interval '12 months',
    auth.uid()
  );
end;
$$;

create or replace function public.audit_checklist_workspace_sections_ai ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.audit_checklist_workspace_sections_common('INSERT', null, new);
  return new;
end;
$$;

create or replace function public.audit_checklist_workspace_sections_au ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.audit_checklist_workspace_sections_common('UPDATE', old, new);
  return new;
end;
$$;

create or replace function public.audit_checklist_workspace_sections_ad ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.audit_checklist_workspace_sections_common('DELETE', old, null);
  return old;
end;
$$;

drop trigger if exists audit_checklist_workspace_sections_ai
  on public.checklist_workspace_sections;
create trigger audit_checklist_workspace_sections_ai
after insert on public.checklist_workspace_sections
for each row execute function public.audit_checklist_workspace_sections_ai ();

drop trigger if exists audit_checklist_workspace_sections_au
  on public.checklist_workspace_sections;
create trigger audit_checklist_workspace_sections_au
after update on public.checklist_workspace_sections
for each row execute function public.audit_checklist_workspace_sections_au ();

drop trigger if exists audit_checklist_workspace_sections_ad
  on public.checklist_workspace_sections;
create trigger audit_checklist_workspace_sections_ad
after delete on public.checklist_workspace_sections
for each row execute function public.audit_checklist_workspace_sections_ad ();

-- ── 5. Auditoria: checklist_workspace_items ─────────────────────────────────

create or replace function public.audit_checklist_workspace_items_row_json (
  i public.checklist_workspace_items
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'id', i.id,
    'workspace_section_id', i.workspace_section_id,
    'description', i.description,
    'is_required', i.is_required,
    'position', i.position,
    'peso', i.peso
  );
$$;

create or replace function public.audit_checklist_workspace_items_common (
  p_operation text,
  p_old public.checklist_workspace_items,
  p_new public.checklist_workspace_items
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_record_id uuid;
  v_old jsonb;
  v_new jsonb;
  v_section_id uuid;
begin
  v_section_id := case
    when p_operation = 'DELETE' then p_old.workspace_section_id
    else p_new.workspace_section_id
  end;

  select t.owner_user_id into v_owner
    from public.checklist_workspace_sections s
    join public.checklist_workspace_templates t on t.id = s.workspace_template_id
   where s.id = v_section_id;

  if v_owner is null then
    return;
  end if;

  if p_operation = 'DELETE' then
    v_record_id := p_old.id;
    v_old := public.audit_checklist_workspace_items_row_json(p_old);
    v_new := null;
  else
    v_record_id := p_new.id;
    v_old := case when p_operation = 'UPDATE'
      then public.audit_checklist_workspace_items_row_json(p_old)
      else null end;
    v_new := public.audit_checklist_workspace_items_row_json(p_new);
  end if;

  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    v_owner,
    'checklist_workspace_items',
    p_operation,
    v_record_id,
    v_old,
    v_new,
    now() + interval '12 months',
    auth.uid()
  );
end;
$$;

create or replace function public.audit_checklist_workspace_items_ai ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.audit_checklist_workspace_items_common('INSERT', null, new);
  return new;
end;
$$;

create or replace function public.audit_checklist_workspace_items_au ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.audit_checklist_workspace_items_common('UPDATE', old, new);
  return new;
end;
$$;

create or replace function public.audit_checklist_workspace_items_ad ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.audit_checklist_workspace_items_common('DELETE', old, null);
  return old;
end;
$$;

drop trigger if exists audit_checklist_workspace_items_ai
  on public.checklist_workspace_items;
create trigger audit_checklist_workspace_items_ai
after insert on public.checklist_workspace_items
for each row execute function public.audit_checklist_workspace_items_ai ();

drop trigger if exists audit_checklist_workspace_items_au
  on public.checklist_workspace_items;
create trigger audit_checklist_workspace_items_au
after update on public.checklist_workspace_items
for each row execute function public.audit_checklist_workspace_items_au ();

drop trigger if exists audit_checklist_workspace_items_ad
  on public.checklist_workspace_items;
create trigger audit_checklist_workspace_items_ad
after delete on public.checklist_workspace_items
for each row execute function public.audit_checklist_workspace_items_ad ();
