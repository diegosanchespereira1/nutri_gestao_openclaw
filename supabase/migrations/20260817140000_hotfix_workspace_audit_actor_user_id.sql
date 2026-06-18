-- Hotfix: triggers de auditoria dos modelos da equipe falhavam quando auth.uid()
-- vinha NULL no contexto do PostgREST (insert abortado → /checklists/novo redirecionava).

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
    coalesce(auth.uid(), new.created_by_user_id)
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
    coalesce(auth.uid(), new.created_by_user_id)
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
    coalesce(auth.uid(), old.created_by_user_id)
  );
  return old;
end;
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
  v_actor uuid;
  v_record_id uuid;
  v_old jsonb;
  v_new jsonb;
  v_template_id uuid;
begin
  if p_operation = 'DELETE' then
    v_template_id := p_old.workspace_template_id;
    v_record_id := p_old.id;
    v_old := public.audit_checklist_workspace_sections_row_json(p_old);
    v_new := null;
  else
    v_template_id := p_new.workspace_template_id;
    v_record_id := p_new.id;
    v_old := case when p_operation = 'UPDATE'
      then public.audit_checklist_workspace_sections_row_json(p_old)
      else null end;
    v_new := public.audit_checklist_workspace_sections_row_json(p_new);
  end if;

  select t.owner_user_id, t.created_by_user_id
    into v_owner, v_actor
    from public.checklist_workspace_templates t
   where t.id = v_template_id;

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
    coalesce(auth.uid(), v_actor)
  );
end;
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
  v_actor uuid;
  v_record_id uuid;
  v_old jsonb;
  v_new jsonb;
  v_section_id uuid;
begin
  v_section_id := case
    when p_operation = 'DELETE' then p_old.workspace_section_id
    else p_new.workspace_section_id
  end;

  select t.owner_user_id, t.created_by_user_id
    into v_owner, v_actor
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
    coalesce(auth.uid(), v_actor)
  );
end;
$$;
