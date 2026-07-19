-- Tier B: RPCs intencionais do app — revoga anon/public, mantém authenticated.
-- Tier C (parcial): helpers de RLS — revoga anon/public, mantém authenticated.
-- Exceção intencional: lgpd_cancel_pending_by_token mantém anon (fluxo sem login).
--
-- Defensivo: usa to_regprocedure() para pular funções ausentes (ambientes
-- DEV/PROD podem divergir). Só age sobre o que existe.

-- ── Revoga public + anon (mantém authenticated) ──────────────────────────────
do $$
declare
  fn text;
  targets text[] := array[
    -- Tier B: RPCs do app
    'public.calculate_and_store_session_score(uuid)',
    'public.get_admin_platform_metrics()',
    'public.end_impersonation_session(uuid)',
    'public.set_checklist_client_signature_required(boolean)',
    'public.set_workspace_tenant_logo_storage_path(text)',
    'public.set_workspace_tenant_name(text)',
    'public.workspace_tenant_logo_storage_path()',
    'public.workspace_tenant_name()',
    'public.workspace_enabled_modules()',
    -- LGPD (exceto lgpd_cancel_pending_by_token — mantém anon por design)
    'public.lgpd_set_pending_closure(text, timestamptz)',
    'public.lgpd_confirm_closure(text)',
    'public.lgpd_cancel_pending_closure()',
    'public.lgpd_admin_unblock_profile(uuid)',
    -- Tier C: helpers de RLS (workspace_account_owner_id na migration seguinte)
    'public.is_super_admin()',
    'public.is_admin_user()',
    'public.workspace_member_user_ids()',
    'public.profile_lgpd_is_actively_blocked(uuid)',
    'public.can_view_all_workspace_scheduled_visits()'
  ];
begin
  foreach fn in array targets loop
    if to_regprocedure(fn) is not null then
      execute format('revoke execute on function %s from public', fn);
      execute format('revoke execute on function %s from anon', fn);
    else
      raise notice 'Skipping (not found): %', fn;
    end if;
  end loop;
end $$;

-- ── Reforça EXECUTE para authenticated (não depender do grant herdado) ────────
do $$
declare
  fn text;
  targets text[] := array[
    'public.calculate_and_store_session_score(uuid)',
    'public.get_admin_platform_metrics()',
    'public.end_impersonation_session(uuid)',
    'public.set_checklist_client_signature_required(boolean)',
    'public.set_workspace_tenant_logo_storage_path(text)',
    'public.set_workspace_tenant_name(text)',
    'public.workspace_tenant_logo_storage_path()',
    'public.workspace_tenant_name()',
    'public.workspace_enabled_modules()',
    'public.workspace_account_owner_id()',
    'public.workspace_member_user_ids()',
    'public.is_super_admin()',
    'public.is_admin_user()',
    'public.profile_lgpd_is_actively_blocked(uuid)',
    'public.can_view_all_workspace_scheduled_visits()',
    'public.lgpd_set_pending_closure(text, timestamptz)',
    'public.lgpd_confirm_closure(text)',
    'public.lgpd_cancel_pending_closure()',
    'public.lgpd_admin_unblock_profile(uuid)'
  ];
begin
  foreach fn in array targets loop
    if to_regprocedure(fn) is not null then
      execute format('grant execute on function %s to authenticated', fn);
    end if;
  end loop;

  -- service_role para RPC de admin
  if to_regprocedure('public.get_admin_platform_metrics()') is not null then
    grant execute on function public.get_admin_platform_metrics() to service_role;
  end if;

  -- lgpd_cancel_pending_by_token: anon (link sem login) + authenticated
  if to_regprocedure('public.lgpd_cancel_pending_by_token(text)') is not null then
    grant execute on function public.lgpd_cancel_pending_by_token(text) to anon;
    grant execute on function public.lgpd_cancel_pending_by_token(text) to authenticated;
  end if;
end $$;
