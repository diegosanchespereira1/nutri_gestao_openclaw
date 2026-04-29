-- Modelos 100% customizáveis ao nível do workspace ("Equipe").
-- Diferente de checklist_custom_templates (cópia + extras por estabelecimento),
-- estes modelos não dependem de um template oficial nem de um estabelecimento:
-- são criados pela equipa, partilhados no workspace, e podem ser usados em
-- qualquer estabelecimento. Soft-delete via archived_at preserva sessões já
-- preenchidas — só some da listagem para novos checklists.

-- ── 1. Tabelas ────────────────────────────────────────────────────────────

create table if not exists public.checklist_workspace_templates (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.checklist_workspace_templates is
  'Modelos de checklist 100% customizáveis criados pela equipa do workspace.';
comment on column public.checklist_workspace_templates.owner_user_id is
  'Workspace owner — todos os membros da equipa partilham o mesmo owner_user_id.';
comment on column public.checklist_workspace_templates.created_by_user_id is
  'Membro da equipa que criou o modelo (para exibição "Criado por …").';
comment on column public.checklist_workspace_templates.archived_at is
  'Soft-delete: quando preenchido, o modelo deixa de aparecer na listagem mas '
  'sessões antigas continuam acessíveis.';

create index if not exists checklist_workspace_templates_owner_active_idx
  on public.checklist_workspace_templates (owner_user_id, archived_at, updated_at desc);

create table if not exists public.checklist_workspace_sections (
  id uuid primary key default gen_random_uuid(),
  workspace_template_id uuid not null references public.checklist_workspace_templates (id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists checklist_workspace_sections_tpl_pos_idx
  on public.checklist_workspace_sections (workspace_template_id, position);

create table if not exists public.checklist_workspace_items (
  id uuid primary key default gen_random_uuid(),
  workspace_section_id uuid not null references public.checklist_workspace_sections (id) on delete cascade,
  description text not null,
  is_required boolean not null default false,
  position integer not null default 0,
  peso numeric(5, 2) not null default 1 check (peso > 0),
  created_at timestamptz not null default now()
);

create index if not exists checklist_workspace_items_section_pos_idx
  on public.checklist_workspace_items (workspace_section_id, position);

-- ── 2. RLS ─────────────────────────────────────────────────────────────────

alter table public.checklist_workspace_templates enable row level security;
alter table public.checklist_workspace_sections enable row level security;
alter table public.checklist_workspace_items enable row level security;

drop policy if exists "checklist_workspace_templates_select" on public.checklist_workspace_templates;
drop policy if exists "checklist_workspace_templates_insert" on public.checklist_workspace_templates;
drop policy if exists "checklist_workspace_templates_update" on public.checklist_workspace_templates;
drop policy if exists "checklist_workspace_templates_delete" on public.checklist_workspace_templates;

create policy "checklist_workspace_templates_select"
  on public.checklist_workspace_templates for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

create policy "checklist_workspace_templates_insert"
  on public.checklist_workspace_templates for insert
  to authenticated
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and created_by_user_id = (select auth.uid())
  );

create policy "checklist_workspace_templates_update"
  on public.checklist_workspace_templates for update
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "checklist_workspace_templates_delete"
  on public.checklist_workspace_templates for delete
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

drop policy if exists "checklist_workspace_sections_all" on public.checklist_workspace_sections;

create policy "checklist_workspace_sections_all"
  on public.checklist_workspace_sections for all
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_workspace_templates t
      where
        t.id = workspace_template_id
        and t.owner_user_id = (select public.workspace_account_owner_id())
    )
  )
  with check (
    exists (
      select 1
      from public.checklist_workspace_templates t
      where
        t.id = workspace_template_id
        and t.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

drop policy if exists "checklist_workspace_items_all" on public.checklist_workspace_items;

create policy "checklist_workspace_items_all"
  on public.checklist_workspace_items for all
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_workspace_sections s
      join public.checklist_workspace_templates t on t.id = s.workspace_template_id
      where
        s.id = workspace_section_id
        and t.owner_user_id = (select public.workspace_account_owner_id())
    )
  )
  with check (
    exists (
      select 1
      from public.checklist_workspace_sections s
      join public.checklist_workspace_templates t on t.id = s.workspace_template_id
      where
        s.id = workspace_section_id
        and t.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

grant select, insert, update, delete on public.checklist_workspace_templates to authenticated;
grant select, insert, update, delete on public.checklist_workspace_sections to authenticated;
grant select, insert, update, delete on public.checklist_workspace_items to authenticated;

-- ── 3. Trigger de updated_at ───────────────────────────────────────────────

create or replace function public.checklist_workspace_templates_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checklist_workspace_templates_set_updated_at
  on public.checklist_workspace_templates;

create trigger checklist_workspace_templates_set_updated_at
before update on public.checklist_workspace_templates
for each row
execute function public.checklist_workspace_templates_touch_updated_at ();

-- ── 4. Sessão de preenchimento aceita workspace_template_id ────────────────

alter table public.checklist_fill_sessions
  add column if not exists workspace_template_id uuid
    references public.checklist_workspace_templates (id) on delete restrict;

create index if not exists checklist_fill_sessions_workspace_idx
  on public.checklist_fill_sessions (workspace_template_id)
  where workspace_template_id is not null;

-- Atualiza constraint para aceitar exatamente UMA das três origens.
alter table public.checklist_fill_sessions
  drop constraint if exists checklist_fill_sessions_one_template;

alter table public.checklist_fill_sessions
  add constraint checklist_fill_sessions_one_template check (
    (
      template_id is not null
      and custom_template_id is null
      and workspace_template_id is null
    )
    or (
      template_id is null
      and custom_template_id is not null
      and workspace_template_id is null
    )
    or (
      template_id is null
      and custom_template_id is null
      and workspace_template_id is not null
    )
  );

-- ── 5. Respostas aceitam workspace_item_id ─────────────────────────────────

alter table public.checklist_fill_item_responses
  add column if not exists workspace_item_id uuid
    references public.checklist_workspace_items (id) on delete cascade;

alter table public.checklist_fill_item_responses
  drop constraint if exists checklist_fill_item_responses_one_item;

alter table public.checklist_fill_item_responses
  add constraint checklist_fill_item_responses_one_item check (
    (
      template_item_id is not null
      and custom_item_id is null
      and workspace_item_id is null
    )
    or (
      template_item_id is null
      and custom_item_id is not null
      and workspace_item_id is null
    )
    or (
      template_item_id is null
      and custom_item_id is null
      and workspace_item_id is not null
    )
  );

create unique index if not exists checklist_fill_resp_session_workspace_unique
  on public.checklist_fill_item_responses (session_id, workspace_item_id)
  where workspace_item_id is not null;

-- ── 6. Score: estender para suportar workspace ─────────────────────────────
-- Substitui a função existente para também resolver itens de workspace.

create or replace function public.calculate_and_store_session_score(p_session_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_earned   numeric(10, 2);
  v_total    numeric(10, 2);
  v_pct      numeric(5, 2);
  v_origin   text;
begin
  select case
           when custom_template_id is not null then 'custom'
           when workspace_template_id is not null then 'workspace'
           else 'global'
         end
    into v_origin
    from public.checklist_fill_sessions
   where id = p_session_id;

  if not found then
    return;
  end if;

  if v_origin = 'custom' then
    select
      coalesce(sum(case when r.outcome = 'conforme' then i.peso else 0 end), 0),
      coalesce(sum(case when r.outcome != 'na'      then i.peso else 0 end), 0)
      into v_earned, v_total
      from public.checklist_fill_item_responses r
      join public.checklist_custom_items i on i.id = r.custom_item_id
     where r.session_id = p_session_id
       and r.custom_item_id is not null;
  elsif v_origin = 'workspace' then
    select
      coalesce(sum(case when r.outcome = 'conforme' then i.peso else 0 end), 0),
      coalesce(sum(case when r.outcome != 'na'      then i.peso else 0 end), 0)
      into v_earned, v_total
      from public.checklist_fill_item_responses r
      join public.checklist_workspace_items i on i.id = r.workspace_item_id
     where r.session_id = p_session_id
       and r.workspace_item_id is not null;
  else
    select
      coalesce(sum(case when r.outcome = 'conforme' then i.peso else 0 end), 0),
      coalesce(sum(case when r.outcome != 'na'      then i.peso else 0 end), 0)
      into v_earned, v_total
      from public.checklist_fill_item_responses r
      join public.checklist_template_items i on i.id = r.template_item_id
     where r.session_id = p_session_id
       and r.template_item_id is not null;
  end if;

  if v_total > 0 then
    v_pct := round((v_earned / v_total) * 100, 2);
  else
    v_pct := null;
  end if;

  update public.checklist_fill_sessions
     set score_percentage    = v_pct,
         score_points_earned = v_earned,
         score_points_total  = v_total
   where id = p_session_id;
end;
$$;

comment on function public.calculate_and_store_session_score(uuid) is
  'Calcula e persiste o score de conformidade. Suporta templates globais, '
  'personalizados (estabelecimento) e do workspace (equipa).';

-- ── 7. Fotos por item: aceitam workspace_item_id ──────────────────────────

alter table public.checklist_fill_item_photos
  add column if not exists workspace_item_id uuid
    references public.checklist_workspace_items (id) on delete cascade;

alter table public.checklist_fill_item_photos
  drop constraint if exists checklist_fill_item_photos_one_item;

alter table public.checklist_fill_item_photos
  add constraint checklist_fill_item_photos_one_item check (
    (
      template_item_id is not null
      and custom_item_id is null
      and workspace_item_id is null
    )
    or (
      template_item_id is null
      and custom_item_id is not null
      and workspace_item_id is null
    )
    or (
      template_item_id is null
      and custom_item_id is null
      and workspace_item_id is not null
    )
  );
