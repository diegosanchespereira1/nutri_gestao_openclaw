-- SEGURANCA: search_path fixo + revogar anon de helper de workspace.
--
-- CONTEXTO
--   Apos fechar a cadeia critica LGPD (20260906120000), restavam advisors:
--   - function_search_path_mutable (38): funcoes sem search_path fixo
--   - anon_security_definer em is_workspace_gestao_member (nao intencional)
--
--   As RPCs lgpd_confirm/cancel_by_token continuam com anon de proposito
--   (links de e-mail). Helpers SECURITY DEFINER usados em RLS precisam
--   permanecer executaveis por authenticated -- o advisor authenticated_*
--   nao zera sem quebrar policies; funcoes admin ja checam role no corpo.
--
-- ESCOPO: ALTER FUNCTION SET search_path + REVOKE. Sem mudar logica.

-- ---------------------------------------------------------------------------
-- 1) is_workspace_gestao_member: so authenticated/service_role
-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE em 20260902120000 preservou ACL antiga com anon=X.
REVOKE EXECUTE ON FUNCTION public.is_workspace_gestao_member() FROM anon, PUBLIC;

-- ---------------------------------------------------------------------------
-- 2) Fix search_path nas 38 funcoes reportadas pelo advisor
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.admin_tenant_notes_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.audit_consent_records_ai() SET search_path = public;
ALTER FUNCTION public.audit_consent_records_au() SET search_path = public;
ALTER FUNCTION public.audit_log_trigger() SET search_path = public;
ALTER FUNCTION public.calculate_and_store_session_score(uuid) SET search_path = public;
ALTER FUNCTION public.checklist_custom_templates_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.checklist_establishment_recent_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.checklist_fill_item_responses_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.checklist_fill_pdf_exports_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.checklist_fill_sessions_set_template_name_snapshot() SET search_path = public;
ALTER FUNCTION public.checklist_fill_sessions_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.checklist_workspace_templates_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.client_contracts_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.client_school_grades_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.clients_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.consent_records_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.contract_templates_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.degustacao_config_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.establishment_areas_set_updated_at() SET search_path = public;
ALTER FUNCTION public.establishment_compliance_deadlines_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.establishment_pops_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.establishments_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.ext_access_perm_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.external_portal_users_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.financial_charges_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.mask_sensitive_fields(jsonb) SET search_path = public;
ALTER FUNCTION public.patients_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.platform_announcements_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.professional_raw_materials_set_client_from_establishment() SET search_path = public;
ALTER FUNCTION public.professional_raw_materials_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.scheduled_visits_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.subscription_plans_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.team_members_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.technical_recipe_template_favorites_cleanup_on_untemplate() SET search_path = public;
ALTER FUNCTION public.technical_recipes_set_client_from_establishment() SET search_path = public;
ALTER FUNCTION public.technical_recipes_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.tenant_feature_overrides_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.validate_parental_consent() SET search_path = public;

NOTIFY pgrst, 'reload schema';
