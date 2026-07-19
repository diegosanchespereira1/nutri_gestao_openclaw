-- Tier A: funções internas (triggers, helpers e event trigger).
-- Revoga EXECUTE de public/anon/authenticated sem impacto funcional:
-- triggers e SECURITY DEFINER callers usam privilégios do owner (postgres).
--
-- Defensivo: usa to_regprocedure() para pular funções ausentes (ambientes
-- DEV/PROD podem divergir). Só revoga o que existe.

do $$
declare
  fn text;
  targets text[] := array[
    -- Signup / degustação
    'public.apply_degustacao_overrides(uuid)',
    -- Event trigger (ensure_rls)
    'public.rls_auto_enable()',
    -- Auth signup trigger
    'public.handle_new_user()',
    -- LGPD audit helper (chamada apenas por outras funções lgpd_*)
    'public.lgpd_audit_event(uuid, uuid, text, jsonb)',
    -- Audit workspace helpers (chamadas pelos triggers *_ad/*_ai/*_au)
    'public.audit_checklist_workspace_items_common(text, public.checklist_workspace_items, public.checklist_workspace_items)',
    'public.audit_checklist_workspace_sections_common(text, public.checklist_workspace_sections, public.checklist_workspace_sections)',
    -- Audit workspace triggers
    'public.audit_checklist_workspace_items_ad()',
    'public.audit_checklist_workspace_items_ai()',
    'public.audit_checklist_workspace_items_au()',
    'public.audit_checklist_workspace_sections_ad()',
    'public.audit_checklist_workspace_sections_ai()',
    'public.audit_checklist_workspace_sections_au()',
    'public.audit_checklist_workspace_templates_ad()',
    'public.audit_checklist_workspace_templates_ai()',
    'public.audit_checklist_workspace_templates_au()',
    -- Audit clients / patients triggers
    'public.audit_clients_ad()',
    'public.audit_clients_ai()',
    'public.audit_clients_au()',
    'public.audit_patients_ad()',
    'public.audit_patients_ai()',
    'public.audit_patients_au()',
    'public.audit_log_trigger()',
    -- Domain triggers
    'public.checklist_fill_touch_session_from_response()',
    'public.establishments_enforce_pj_client()',
    'public.patients_enforce_vinculo()',
    'public.profiles_log_plan_change()'
  ];
begin
  foreach fn in array targets loop
    if to_regprocedure(fn) is not null then
      execute format('revoke execute on function %s from public', fn);
      execute format('revoke execute on function %s from anon', fn);
      execute format('revoke execute on function %s from authenticated', fn);
    else
      raise notice 'Skipping (not found): %', fn;
    end if;
  end loop;
end $$;

-- Mantém acesso explícito para operações backend, se necessário.
do $$
begin
  if to_regprocedure('public.apply_degustacao_overrides(uuid)') is not null then
    grant execute on function public.apply_degustacao_overrides(uuid) to service_role;
  end if;
end $$;
