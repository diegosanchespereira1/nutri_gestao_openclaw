-- Fase 2 da auditoria de performance: índices para foreign keys sem cobertura
-- (diagnóstico via pg_constraint, 18/07/2026). Tabelas ainda são pequenas, mas
-- FKs sem índice tornam JOINs, DELETEs em cascata e verificações de
-- integridade lineares — custo cresce silenciosamente com o volume.

-- Fluxos de cliente
create index if not exists financial_charges_client_id_idx
  on public.financial_charges (client_id);
create index if not exists client_contracts_client_id_idx
  on public.client_contracts (client_id);

-- Portal externo / pacientes
create index if not exists external_portal_users_patient_id_idx
  on public.external_portal_users (patient_id);
create index if not exists external_access_permissions_patient_id_idx
  on public.external_access_permissions (patient_id);

-- Checklists
create index if not exists checklist_establishment_recent_establishment_id_idx
  on public.checklist_establishment_recent (establishment_id);
create index if not exists checklist_fill_pdf_exports_user_id_idx
  on public.checklist_fill_pdf_exports (user_id);
create index if not exists checklist_custom_templates_source_template_id_idx
  on public.checklist_custom_templates (source_template_id);
create index if not exists checklist_workspace_templates_created_by_user_id_idx
  on public.checklist_workspace_templates (created_by_user_id);
create index if not exists checklist_fill_session_reopen_events_owner_user_id_idx
  on public.checklist_fill_session_reopen_events (owner_user_id);
create index if not exists checklist_fill_session_reopen_events_reopened_by_idx
  on public.checklist_fill_session_reopen_events (reopened_by_user_id);

-- Compliance / POPs
create index if not exists establishment_compliance_deadlines_template_id_idx
  on public.establishment_compliance_deadlines (checklist_template_id);
create index if not exists establishment_pops_source_template_id_idx
  on public.establishment_pops (source_template_id);

-- LGPD / auditoria / administração
create index if not exists profiles_lgpd_blocked_by_idx
  on public.profiles (lgpd_blocked_by);
create index if not exists profiles_lgpd_unblocked_by_idx
  on public.profiles (lgpd_unblocked_by);
create index if not exists consent_records_user_id_idx
  on public.consent_records (user_id);
create index if not exists auth_troubleshooting_logs_user_id_idx
  on public.auth_troubleshooting_logs (user_id);
create index if not exists application_activity_log_actor_user_id_idx
  on public.application_activity_log (actor_user_id);
create index if not exists account_closure_requests_profile_id_idx
  on public.account_closure_requests (profile_id);
create index if not exists degustacao_config_updated_by_idx
  on public.degustacao_config (updated_by);
create index if not exists tenant_feature_overrides_updated_by_idx
  on public.tenant_feature_overrides (updated_by);
create index if not exists subscription_events_created_by_idx
  on public.subscription_events (created_by);
create index if not exists admin_tenant_notes_created_by_idx
  on public.admin_tenant_notes (created_by);
create index if not exists platform_announcements_created_by_idx
  on public.platform_announcements (created_by);
