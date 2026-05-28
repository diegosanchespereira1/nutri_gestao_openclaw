


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."consent_status" AS ENUM (
    'active',
    'revogado'
);


ALTER TYPE "public"."consent_status" OWNER TO "postgres";


CREATE TYPE "public"."consent_type" AS ENUM (
    'uso_dados',
    'compartilhamento_externo',
    'pesquisa',
    'marketing'
);


ALTER TYPE "public"."consent_type" OWNER TO "postgres";


CREATE TYPE "public"."recipe_context" AS ENUM (
    'ESTABELECIMENTO',
    'REPOSITORIO'
);


ALTER TYPE "public"."recipe_context" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_tenant_notes_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end; $$;


ALTER FUNCTION "public"."admin_tenant_notes_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_degustacao_overrides"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.tenant_feature_overrides (tenant_user_id, feature_key, enabled, reason)
  select
    p_user_id,
    dc.feature_key,
    dc.enabled,
    'degustação automática'
  from public.degustacao_config dc
  on conflict (tenant_user_id, feature_key) do nothing;
end;
$$;


ALTER FUNCTION "public"."apply_degustacao_overrides"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_clients_ad"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    'clients',
    'DELETE',
    old.id,
    public.audit_clients_row_json(old),
    null,
    now() + interval '12 months',
    auth.uid()
  );
  return old;
end;
$$;


ALTER FUNCTION "public"."audit_clients_ad"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_clients_ai"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    'clients',
    'INSERT',
    new.id,
    null,
    public.audit_clients_row_json(new),
    now() + interval '12 months',
    auth.uid()
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."audit_clients_ai"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_clients_au"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    'clients',
    'UPDATE',
    new.id,
    public.audit_clients_row_json(old),
    public.audit_clients_row_json(new),
    now() + interval '12 months',
    auth.uid()
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."audit_clients_au"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "legal_name" "text" NOT NULL,
    "trade_name" "text",
    "document_id" "text",
    "email" "text",
    "phone" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attended_full_name" "text",
    "birth_date" "date",
    "sex" "text",
    "dietary_restrictions" "text",
    "chronic_medications" "text",
    "guardian_full_name" "text",
    "guardian_document_id" "text",
    "guardian_email" "text",
    "guardian_phone" "text",
    "guardian_relationship" "text",
    "lifecycle_status" "text" DEFAULT 'ativo'::"text" NOT NULL,
    "activated_at" "date",
    "state_registration" "text",
    "municipal_registration" "text",
    "sanitary_license" "text",
    "website_url" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "logo_storage_path" "text",
    "legal_rep_full_name" "text",
    "legal_rep_document_id" "text",
    "legal_rep_role" "text",
    "legal_rep_email" "text",
    "legal_rep_phone" "text",
    "technical_rep_full_name" "text",
    "technical_rep_professional_id" "text",
    "technical_rep_email" "text",
    "technical_rep_phone" "text",
    "business_segment" "text",
    "responsible_team_member_id" "uuid",
    CONSTRAINT "clients_kind_check" CHECK (("kind" = ANY (ARRAY['pf'::"text", 'pj'::"text"]))),
    CONSTRAINT "clients_lifecycle_status_check" CHECK (("lifecycle_status" = ANY (ARRAY['ativo'::"text", 'inativo'::"text", 'finalizado'::"text"]))),
    CONSTRAINT "clients_sex_check" CHECK ((("sex" IS NULL) OR ("sex" = ANY (ARRAY['female'::"text", 'male'::"text", 'other'::"text"]))))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_clients_row_json"("c" "public"."clients") RETURNS "jsonb"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select jsonb_build_object(
    'id', c.id,
    'legal_name', c.legal_name,
    'kind', c.kind,
    'responsible_team_member_id', c.responsible_team_member_id
  );
$$;


ALTER FUNCTION "public"."audit_clients_row_json"("c" "public"."clients") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_consent_records_ai"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    new_values,
    ip_address,
    user_agent,
    created_at
  ) values (
    new.user_id,
    'consent_records',
    'INSERT',
    new.id,
    jsonb_build_object(
      'patient_id', new.patient_id,
      'consent_type', new.consent_type::text,
      'is_parental_consent', new.is_parental_consent
    ),
    new.ip_address,
    new.user_agent,
    new.created_at
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."audit_consent_records_ai"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_consent_records_au"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    created_at
  ) values (
    new.user_id,
    'consent_records',
    'UPDATE',
    new.id,
    jsonb_build_object(
      'status', old.status::text,
      'revocation_reason', old.revocation_reason
    ),
    jsonb_build_object(
      'status', new.status::text,
      'revocation_reason', new.revocation_reason,
      'revoked_at', new.revoked_at
    ),
    new.ip_address,
    new.user_agent,
    new.updated_at
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."audit_consent_records_au"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_log_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  old_masked jsonb;
  new_masked jsonb;
begin
  old_masked := case
    when tg_op = 'DELETE' then mask_sensitive_fields(row_to_json(old)::jsonb)
    when tg_op = 'UPDATE' then mask_sensitive_fields(row_to_json(old)::jsonb)
    else null
  end;

  new_masked := case
    when tg_op = 'INSERT' then mask_sensitive_fields(row_to_json(new)::jsonb)
    when tg_op = 'UPDATE' then mask_sensitive_fields(row_to_json(new)::jsonb)
    else null
  end;

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
    case
      when tg_op = 'DELETE' then (old.user_id)::uuid
      when tg_op = 'UPDATE' then (new.user_id)::uuid
      when tg_op = 'INSERT' then (new.user_id)::uuid
    end,
    tg_table_name,
    tg_op,
    case
      when tg_op = 'DELETE' then (old.id)::uuid
      else (new.id)::uuid
    end,
    old_masked,
    new_masked,
    now() + interval '12 months',
    auth.uid()
  );

  return case
    when tg_op = 'DELETE' then old
    else new
  end;
end;
$$;


ALTER FUNCTION "public"."audit_log_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_and_store_session_score"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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


ALTER FUNCTION "public"."calculate_and_store_session_score"("p_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_and_store_session_score"("p_session_id" "uuid") IS 'Calcula e persiste o score de conformidade. Suporta templates globais, personalizados (estabelecimento) e do workspace (equipa).';



CREATE OR REPLACE FUNCTION "public"."checklist_custom_templates_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."checklist_custom_templates_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checklist_establishment_recent_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."checklist_establishment_recent_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  sid uuid;
begin
  sid := coalesce(NEW.session_id, OLD.session_id);
  if exists (
    select 1
    from public.checklist_fill_sessions s
    where
      s.id = sid
      and s.dossier_approved_at is not null
  ) then
    raise exception 'Dossiê aprovado: não é permitido alterar respostas desta sessão.';
  end if;
  return coalesce(NEW, OLD);
end;
$$;


ALTER FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checklist_fill_item_responses_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."checklist_fill_item_responses_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checklist_fill_pdf_exports_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."checklist_fill_pdf_exports_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checklist_fill_sessions_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."checklist_fill_sessions_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checklist_fill_touch_session_from_response"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."checklist_fill_touch_session_from_response"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checklist_workspace_templates_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."checklist_workspace_templates_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."client_contracts_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."client_contracts_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clients_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."clients_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clients_validate_responsible_team_member"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.responsible_team_member_id is not null then
    if not exists (
      select 1
      from public.team_members tm
      where
        tm.id = new.responsible_team_member_id
        and tm.owner_user_id = new.owner_user_id
    ) then
      raise exception 'Membro da equipe responsável inválido para este cliente';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."clients_validate_responsible_team_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consent_records_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."consent_records_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."contract_templates_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."contract_templates_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."degustacao_config_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end; $$;


ALTER FUNCTION "public"."degustacao_config_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_impersonation_session"("p_log_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_super_admin() then
    raise exception 'Acesso negado';
  end if;
  update public.admin_impersonation_log
  set ended_at = now()
  where id = p_log_id and ended_at is null;
end;
$$;


ALTER FUNCTION "public"."end_impersonation_session"("p_log_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."establishment_areas_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."establishment_areas_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."establishment_compliance_deadlines_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."establishment_compliance_deadlines_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."establishment_pops_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."establishment_pops_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."establishments_enforce_pj_client"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  k text;
begin
  select c.kind into k from public.clients c where c.id = new.client_id;
  if k is null then
    raise exception 'Cliente inexistente';
  end if;
  if k <> 'pj' then
    raise exception 'Estabelecimentos só são permitidos para clientes pessoa jurídica';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."establishments_enforce_pj_client"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."establishments_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."establishments_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ext_access_perm_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end; $$;


ALTER FUNCTION "public"."ext_access_perm_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."external_portal_users_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end; $$;


ALTER FUNCTION "public"."external_portal_users_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."financial_charges_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."financial_charges_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_full_name       text;
  v_acquisition     text;
  v_is_self_service boolean;
begin
  v_full_name   := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_acquisition := coalesce(new.raw_user_meta_data ->> 'acquisition_source', 'self_service');

  -- Qualquer origem que não seja 'admin_created' é tratada como self-service
  v_is_self_service := v_acquisition <> 'admin_created';

  insert into public.profiles (
    user_id,
    full_name,
    acquisition_source,
    trial_started_at,
    created_at
  )
  values (
    new.id,
    v_full_name,
    v_acquisition,
    case when v_is_self_service then now() else null end,
    now()
  )
  on conflict (user_id) do update
    set
      acquisition_source = excluded.acquisition_source,
      trial_started_at   = coalesce(profiles.trial_started_at, excluded.trial_started_at);

  -- Registo de evento de criação de conta
  insert into public.subscription_events (
    tenant_user_id, event_type, new_value, metadata
  )
  values (
    new.id,
    'tenant_created',
    v_acquisition,
    jsonb_build_object('email', new.email, 'acquisition_source', v_acquisition)
  );

  -- Self-service: aplicar features de degustação configuradas pelo admin
  if v_is_self_service then
    perform public.apply_degustacao_overrides(new.id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid())
      and role = 'super_admin'
  );
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lgpd_admin_unblock_profile"("p_profile_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid := auth.uid();
  caller_role text;
  target_user uuid;
  pid uuid;
begin
  if uid is null then
    raise exception 'Sessão necessária';
  end if;

  select role into caller_role
  from public.profiles
  where user_id = uid;

  if caller_role is null or caller_role not in ('admin', 'super_admin') then
    raise exception 'Acesso negado';
  end if;

  select user_id, id into target_user, pid
  from public.profiles
  where id = p_profile_id;

  if target_user is null then
    raise exception 'Perfil não encontrado';
  end if;

  if not public.profile_lgpd_is_actively_blocked(target_user) then
    raise exception 'Conta não está bloqueada por LGPD';
  end if;

  update public.profiles
  set
    lgpd_unblocked_at = now(),
    lgpd_unblocked_by = uid,
    updated_at = now()
  where id = p_profile_id;

  perform public.lgpd_audit_event(
    target_user,
    p_profile_id,
    'ACCOUNT_UNBLOCKED',
    jsonb_build_object('unblocked_by_admin', uid)
  );

  return jsonb_build_object('user_id', target_user, 'profile_id', p_profile_id);
end;
$$;


ALTER FUNCTION "public"."lgpd_admin_unblock_profile"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lgpd_audit_event"("p_subject_user_id" "uuid", "p_profile_id" "uuid", "p_event" "text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    status
  ) values (
    p_subject_user_id,
    'profiles',
    'UPDATE',
    p_profile_id,
    null,
    jsonb_build_object('event', p_event) || p_payload,
    'active'
  );
end;
$$;


ALTER FUNCTION "public"."lgpd_audit_event"("p_subject_user_id" "uuid", "p_profile_id" "uuid", "p_event" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lgpd_cancel_pending_by_token"("p_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_hash text;
  pid uuid;
  subj uuid;
begin
  if p_token is null or length(p_token) < 32 then
    return false;
  end if;

  v_hash := encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  select id, user_id into pid, subj
  from public.profiles
  where lgpd_cancel_token_hash = v_hash
    and lgpd_cancel_token_expires_at is not null
    and lgpd_cancel_token_expires_at > now()
    and lgpd_blocked_at is null
  for update;

  if pid is null then
    return false;
  end if;

  update public.profiles
  set
    lgpd_cancel_token_hash = null,
    lgpd_cancel_token_expires_at = null,
    updated_at = now()
  where id = pid;

  perform public.lgpd_audit_event(
    subj,
    pid,
    'ACCOUNT_CLOSURE_CANCELLED',
    jsonb_build_object('via', 'email_token')
  );

  return true;
end;
$$;


ALTER FUNCTION "public"."lgpd_cancel_pending_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lgpd_cancel_pending_closure"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid := auth.uid();
  pid uuid;
begin
  if uid is null then
    raise exception 'Sessão necessária';
  end if;

  select id into pid
  from public.profiles
  where user_id = uid
    and lgpd_blocked_at is null
    and lgpd_cancel_token_hash is not null
  for update;

  if pid is null then
    raise exception 'Nenhum pedido pendente';
  end if;

  update public.profiles
  set
    lgpd_cancel_token_hash = null,
    lgpd_cancel_token_expires_at = null,
    updated_at = now()
  where id = pid;

  perform public.lgpd_audit_event(
    uid,
    pid,
    'ACCOUNT_CLOSURE_CANCELLED',
    '{}'::jsonb
  );
end;
$$;


ALTER FUNCTION "public"."lgpd_cancel_pending_closure"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lgpd_confirm_closure"("p_token" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid := auth.uid();
  pid uuid;
  v_hash text;
begin
  if uid is null then
    raise exception 'Sessão necessária';
  end if;

  if p_token is null or length(p_token) < 32 then
    raise exception 'Token inválido';
  end if;

  v_hash := encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  select id into pid
  from public.profiles
  where user_id = uid
    and lgpd_cancel_token_hash = v_hash
    and lgpd_cancel_token_expires_at is not null
    and lgpd_cancel_token_expires_at > now()
    and lgpd_blocked_at is null
  for update;

  if pid is null then
    raise exception 'Token inválido ou expirado';
  end if;

  update public.profiles
  set
    lgpd_blocked_at = now(),
    lgpd_blocked_reason = 'lgpd_account_closure',
    lgpd_blocked_until = now() + interval '10 years',
    lgpd_blocked_by = uid,
    lgpd_cancel_token_hash = null,
    lgpd_cancel_token_expires_at = null,
    updated_at = now()
  where id = pid;

  perform public.lgpd_audit_event(
    uid,
    pid,
    'ACCOUNT_BLOCKED_LGPD',
    jsonb_build_object(
      'blocked_until',
      (select lgpd_blocked_until from public.profiles where id = pid)
    )
  );
end;
$$;


ALTER FUNCTION "public"."lgpd_confirm_closure"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lgpd_set_pending_closure"("p_token_hash" "text", "p_expires_at" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid := auth.uid();
  pid uuid;
begin
  if uid is null then
    raise exception 'Sessão necessária';
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    raise exception 'Token inválido';
  end if;

  select id into pid
  from public.profiles
  where user_id = uid
  for update;

  if pid is null then
    raise exception 'Perfil não encontrado';
  end if;

  if public.profile_lgpd_is_actively_blocked(uid) then
    raise exception 'Conta já está bloqueada';
  end if;

  update public.profiles
  set
    lgpd_cancel_token_hash = p_token_hash,
    lgpd_cancel_token_expires_at = p_expires_at,
    updated_at = now()
  where id = pid;

  perform public.lgpd_audit_event(
    uid,
    pid,
    'ACCOUNT_CLOSURE_REQUESTED',
    jsonb_build_object('expires_at', p_expires_at)
  );
end;
$$;


ALTER FUNCTION "public"."lgpd_set_pending_closure"("p_token_hash" "text", "p_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mask_sensitive_fields"("data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  result jsonb := data;
  doc_value text;
  birth_value text;
begin
  -- Mascarar document_id (CPF): mostrar apenas últimos 2 dígitos
  if result ? 'document_id' then
    doc_value := result->>'document_id';
    if doc_value is not null and length(doc_value) = 11 then
      result := jsonb_set(result, '{document_id}',
        to_jsonb('***.***.***-' || right(doc_value, 2)));
    end if;
  end if;

  -- Mascarar birth_date: mostrar apenas YYYY-**-**
  if result ? 'birth_date' then
    birth_value := result->>'birth_date';
    if birth_value is not null and length(birth_value) >= 10 then
      result := jsonb_set(result, '{birth_date}',
        to_jsonb(left(birth_value, 5) || '**-**'));
    end if;
  end if;

  return result;
end;
$$;


ALTER FUNCTION "public"."mask_sensitive_fields"("data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."patients_enforce_vinculo"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  ck text;
  est_client uuid;
begin
  -- Paciente independente (sem cliente): não há validação de kind/estabelecimento.
  if new.client_id is null then
    if new.establishment_id is not null then
      raise exception 'Paciente sem cliente não pode ter estabelecimento';
    end if;
    return new;
  end if;

  -- Paciente com cliente: validar kind e coerência estabelecimento.
  select c.kind into ck from public.clients c where c.id = new.client_id;
  if ck is null then
    raise exception 'Cliente inexistente';
  end if;

  if ck = 'pf' then
    if new.establishment_id is not null then
      raise exception 'Pacientes de cliente PF não podem ter estabelecimento';
    end if;
  elsif ck = 'pj' then
    if new.establishment_id is null then
      raise exception 'Pacientes de cliente PJ devem estar ligados a um estabelecimento';
    end if;
    select e.client_id into est_client
    from public.establishments e
    where e.id = new.establishment_id;
    if est_client is null or est_client <> new.client_id then
      raise exception 'Estabelecimento inválido para este cliente';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."patients_enforce_vinculo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."patients_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."patients_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."patients_validate_responsible_team_member"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.responsible_team_member_id is not null then
    if not exists (
      select 1
      from public.team_members tm
      where
        tm.id = new.responsible_team_member_id
        and tm.owner_user_id = new.user_id
    ) then
      raise exception 'Membro da equipe responsável inválido para este paciente';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."patients_validate_responsible_team_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_announcements_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end; $$;


ALTER FUNCTION "public"."platform_announcements_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."professional_raw_materials_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."professional_raw_materials_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profile_lgpd_is_actively_blocked"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and p.lgpd_blocked_at is not null
      and p.lgpd_unblocked_at is null
  );
$$;


ALTER FUNCTION "public"."profile_lgpd_is_actively_blocked"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profiles_log_plan_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.plan_slug is distinct from old.plan_slug then
    insert into public.subscription_events (
      tenant_user_id, event_type, old_value, new_value, metadata, created_by
    ) values (
      new.user_id,
      'plan_changed',
      old.plan_slug,
      new.plan_slug,
      jsonb_build_object('changed_at', now()),
      (select auth.uid())
    );
  end if;

  if new.is_suspended is distinct from old.is_suspended then
    insert into public.subscription_events (
      tenant_user_id, event_type, old_value, new_value, metadata, created_by
    ) values (
      new.user_id,
      case when new.is_suspended then 'suspended' else 'unsuspended' end,
      old.is_suspended::text,
      new.is_suspended::text,
      jsonb_build_object(
        'reason', new.suspended_reason,
        'changed_at', now()
      ),
      (select auth.uid())
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."profiles_log_plan_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."scheduled_visits_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."scheduled_visits_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_workspace_tenant_logo_storage_path"("p_path" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.profiles
  set
    tenant_logo_storage_path = nullif(trim(coalesce(p_path, '')), ''),
    updated_at = now()
  where user_id = public.workspace_account_owner_id();
end;
$$;


ALTER FUNCTION "public"."set_workspace_tenant_logo_storage_path"("p_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."subscription_plans_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end; $$;


ALTER FUNCTION "public"."subscription_plans_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."team_members_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."team_members_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."technical_recipe_template_favorites_cleanup_on_untemplate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.is_template = false and old.is_template = true then
    delete from public.technical_recipe_template_favorites
    where recipe_id = new.id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."technical_recipe_template_favorites_cleanup_on_untemplate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."technical_recipes_set_client_from_establishment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.establishment_id is not null then
    select e.client_id into new.client_id
    from public.establishments e
    where e.id = new.establishment_id;
    if new.client_id is null then
      raise exception 'technical_recipes: establishment_id inválido';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."technical_recipes_set_client_from_establishment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."technical_recipes_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."technical_recipes_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tenant_feature_overrides_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end; $$;


ALTER FUNCTION "public"."tenant_feature_overrides_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_parental_consent"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  patient_age int;
  existing_parental_consent boolean;
begin
  select
    extract(year from age(p.date_of_birth))::int,
    exists(
      select 1 from public.consent_records cr
      where cr.patient_id = new.patient_id
        and cr.is_parental_consent = true
        and cr.status = 'active'
        and cr.consent_type = new.consent_type
    )
  into patient_age, existing_parental_consent
  from public.patients p
  where p.id = new.patient_id;

  if patient_age < 18 and new.status = 'active' then
    if not new.is_parental_consent and not existing_parental_consent then
      raise exception 'Consentimento de responsável legal é obrigatório para pacientes menores de 18 anos';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_parental_consent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."workspace_account_owner_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (
      select tm.owner_user_id
      from public.team_members tm
      where tm.member_user_id = (select auth.uid())
      limit 1
    ),
    (select auth.uid())
  );
$$;


ALTER FUNCTION "public"."workspace_account_owner_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."workspace_member_user_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.workspace_account_owner_id()
  union
  select tm.member_user_id
  from public.team_members tm
  where tm.owner_user_id = public.workspace_account_owner_id()
    and tm.member_user_id is not null;
$$;


ALTER FUNCTION "public"."workspace_member_user_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."workspace_tenant_logo_storage_path"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.tenant_logo_storage_path
  from public.profiles p
  where p.user_id = (select public.workspace_account_owner_id())
  limit 1;
$$;


ALTER FUNCTION "public"."workspace_tenant_logo_storage_path"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_impersonation_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "justification" "text" NOT NULL,
    "session_token" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text"
);


ALTER TABLE "public"."admin_impersonation_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "token_hash" "text" NOT NULL,
    "token_prefix" "text" NOT NULL,
    "scopes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "last_used_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."api_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "crn" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "timezone" "text" DEFAULT 'Europe/Lisbon'::"text" NOT NULL,
    "onboarding_completed_at" timestamp with time zone,
    "work_context" "text",
    "plan_slug" "text" DEFAULT 'free'::"text" NOT NULL,
    "plan_expires_at" timestamp with time zone,
    "is_suspended" boolean DEFAULT false NOT NULL,
    "suspended_reason" "text",
    "lgpd_blocked_at" timestamp with time zone,
    "lgpd_blocked_reason" "text",
    "lgpd_blocked_until" timestamp with time zone,
    "lgpd_blocked_by" "uuid",
    "lgpd_unblocked_at" timestamp with time zone,
    "lgpd_unblocked_by" "uuid",
    "lgpd_cancel_token_hash" "text",
    "lgpd_cancel_token_expires_at" timestamp with time zone,
    "phone" "text",
    "photo_storage_path" "text",
    "tenant_logo_storage_path" "text",
    "trial_started_at" timestamp with time zone,
    "last_active_at" timestamp with time zone,
    "acquisition_source" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'super_admin'::"text"]))),
    CONSTRAINT "profiles_work_context_check" CHECK ((("work_context" IS NULL) OR ("work_context" = ANY (ARRAY['institutional'::"text", 'clinical'::"text", 'both'::"text"]))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."onboarding_completed_at" IS 'NULL = utilizador deve concluir o wizard de onboarding (primeira sessão).';



COMMENT ON COLUMN "public"."profiles"."work_context" IS 'Preferência declarada no onboarding: institucional, clínico ou ambos.';



COMMENT ON COLUMN "public"."profiles"."lgpd_blocked_at" IS 'Bloqueio LGPD ativo: titular sem acesso; dados retidos (10 anos).';



COMMENT ON COLUMN "public"."profiles"."lgpd_unblocked_at" IS 'Desbloqueio administrativo; escrita reposta.';



COMMENT ON COLUMN "public"."profiles"."tenant_logo_storage_path" IS 'Path em storage (bucket tenant-logos) do logotipo da empresa/tenant. Apenas preenchido no profile do titular do workspace.';



CREATE TABLE IF NOT EXISTS "public"."scheduled_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "target_type" "text" NOT NULL,
    "establishment_id" "uuid",
    "patient_id" "uuid",
    "scheduled_start" timestamp with time zone NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "visit_kind" "text" NOT NULL,
    "assigned_team_member_id" "uuid",
    "dossier_recipient_emails" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "dossier_email_send_status" "text" DEFAULT 'not_sent'::"text" NOT NULL,
    "dossier_email_last_error" "text",
    "dossier_email_sent_at" timestamp with time zone,
    CONSTRAINT "scheduled_visits_dossier_email_send_status_check" CHECK (("dossier_email_send_status" = ANY (ARRAY['not_sent'::"text", 'sent'::"text", 'failed'::"text"]))),
    CONSTRAINT "scheduled_visits_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "scheduled_visits_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "scheduled_visits_target_fk_check" CHECK (((("target_type" = 'establishment'::"text") AND ("establishment_id" IS NOT NULL) AND ("patient_id" IS NULL)) OR (("target_type" = 'patient'::"text") AND ("patient_id" IS NOT NULL) AND ("establishment_id" IS NULL)))),
    CONSTRAINT "scheduled_visits_target_type_check" CHECK (("target_type" = ANY (ARRAY['establishment'::"text", 'patient'::"text"]))),
    CONSTRAINT "scheduled_visits_visit_kind_check" CHECK (("visit_kind" = ANY (ARRAY['patient_care'::"text", 'technical_compliance'::"text", 'follow_up'::"text", 'audit'::"text", 'training'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."scheduled_visits" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scheduled_visits"."dossier_recipient_emails" IS 'Endereços para envio automático do PDF do dossiê após aprovação (máx. imposto na app).';



COMMENT ON COLUMN "public"."scheduled_visits"."dossier_email_send_status" IS 'Estado do último envio por email do dossiê (not_sent / sent / failed).';



COMMENT ON COLUMN "public"."scheduled_visits"."dossier_email_last_error" IS 'Mensagem curta do último falhanço de envio (para UI e reenvio).';



COMMENT ON COLUMN "public"."scheduled_visits"."dossier_email_sent_at" IS 'Quando o último envio por email foi concluído com sucesso.';



CREATE TABLE IF NOT EXISTS "public"."technical_recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid",
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "portions_yield" integer DEFAULT 1 NOT NULL,
    "margin_percent" numeric(10,4) DEFAULT 0 NOT NULL,
    "tax_percent" numeric(10,4) DEFAULT 0 NOT NULL,
    "is_template" boolean DEFAULT false NOT NULL,
    "classification" character varying(50),
    "sector" character varying(100),
    "cmv_percent" numeric(10,4) DEFAULT 25 NOT NULL,
    "client_id" "uuid" NOT NULL,
    "contexto" "public"."recipe_context" DEFAULT 'ESTABELECIMENTO'::"public"."recipe_context" NOT NULL,
    "repository_origin_id" "uuid",
    CONSTRAINT "technical_recipes_cmv_percent_check" CHECK ((("cmv_percent" > (0)::numeric) AND ("cmv_percent" <= (100)::numeric))),
    CONSTRAINT "technical_recipes_contexto_establishment_check" CHECK (((("contexto" = 'ESTABELECIMENTO'::"public"."recipe_context") AND ("establishment_id" IS NOT NULL)) OR (("contexto" = 'REPOSITORIO'::"public"."recipe_context") AND ("establishment_id" IS NULL)))),
    CONSTRAINT "technical_recipes_margin_percent_check" CHECK ((("margin_percent" >= (0)::numeric) AND ("margin_percent" <= (1000)::numeric))),
    CONSTRAINT "technical_recipes_name_len" CHECK (("char_length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "technical_recipes_origin_context_check" CHECK ((("repository_origin_id" IS NULL) OR ("contexto" = 'ESTABELECIMENTO'::"public"."recipe_context"))),
    CONSTRAINT "technical_recipes_portions_yield_check" CHECK (("portions_yield" >= 1)),
    CONSTRAINT "technical_recipes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"]))),
    CONSTRAINT "technical_recipes_tax_percent_check" CHECK ((("tax_percent" >= (0)::numeric) AND ("tax_percent" <= (100)::numeric)))
);


ALTER TABLE "public"."technical_recipes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."technical_recipes"."contexto" IS 'FR-REC-001: Contexto de armazenamento. ESTABELECIMENTO = vinculada a um estabelecimento específico. REPOSITORIO = genérica e reutilizável, sem vínculo.';



COMMENT ON COLUMN "public"."technical_recipes"."repository_origin_id" IS 'FR-REC-001: ID da receita do Repositório usada como modelo de origem. NULL se criada do zero. Receita do repositório é independente — alterações nela não afetam cópias existentes.';



CREATE OR REPLACE VIEW "public"."admin_platform_metrics" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE ("profiles"."role" <> ALL (ARRAY['admin'::"text", 'super_admin'::"text"]))) AS "total_tenants",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE (("profiles"."role" <> ALL (ARRAY['admin'::"text", 'super_admin'::"text"])) AND ("profiles"."is_suspended" = false))) AS "active_tenants",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE (("profiles"."role" <> ALL (ARRAY['admin'::"text", 'super_admin'::"text"])) AND ("profiles"."is_suspended" = true))) AS "suspended_tenants",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE (("profiles"."role" <> ALL (ARRAY['admin'::"text", 'super_admin'::"text"])) AND ("profiles"."trial_started_at" IS NOT NULL) AND ("profiles"."plan_expires_at" > "now"()))) AS "in_trial_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE ("profiles"."plan_slug" = 'free'::"text")) AS "free_plan_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE ("profiles"."plan_slug" = 'starter'::"text")) AS "starter_plan_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE ("profiles"."plan_slug" = 'pro'::"text")) AS "pro_plan_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE ("profiles"."plan_slug" = 'enterprise'::"text")) AS "enterprise_plan_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE (("profiles"."role" <> ALL (ARRAY['admin'::"text", 'super_admin'::"text"])) AND ("profiles"."last_active_at" > ("now"() - '30 days'::interval)))) AS "active_last_30d",
    ( SELECT "count"(*) AS "count"
           FROM "public"."clients") AS "total_clients",
    ( SELECT "count"(*) AS "count"
           FROM "public"."scheduled_visits") AS "total_visits",
    ( SELECT "count"(*) AS "count"
           FROM "public"."technical_recipes") AS "total_recipes",
    ( SELECT "count"(*) AS "count"
           FROM "public"."api_tokens"
          WHERE ("api_tokens"."revoked_at" IS NULL)) AS "active_api_tokens";


ALTER VIEW "public"."admin_platform_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."establishments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "establishment_type" "text" NOT NULL,
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "state" "text",
    "postal_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "establishments_state_len" CHECK ((("state" IS NULL) OR ("char_length"("state") = 2))),
    CONSTRAINT "establishments_type_check" CHECK (("establishment_type" = ANY (ARRAY['escola'::"text", 'hospital'::"text", 'clinica'::"text", 'lar_idosos'::"text", 'restaurante'::"text", 'frigorifico'::"text", 'mercado'::"text", 'cozinha_industrial'::"text", 'empresa'::"text"])))
);


ALTER TABLE "public"."establishments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."establishments"."address_line1" IS 'Linha 1 do endereço do estabelecimento. Nullable: pode ser preenchido após a criação automática com o cliente PJ.';



CREATE TABLE IF NOT EXISTS "public"."subscription_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "subscription_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['plan_changed'::"text", 'suspended'::"text", 'unsuspended'::"text", 'payment_received'::"text", 'trial_started'::"text", 'trial_expired'::"text", 'feature_override_set'::"text", 'tenant_created'::"text", 'tenant_blocked_lgpd'::"text", 'tenant_unblocked_lgpd'::"text", 'account_deleted'::"text"])))
);


ALTER TABLE "public"."subscription_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "price_monthly_cents" bigint DEFAULT 0 NOT NULL,
    "price_annual_cents" bigint,
    "max_clients" integer DEFAULT 5 NOT NULL,
    "max_establishments" integer DEFAULT 2 NOT NULL,
    "max_team_members" integer DEFAULT 1 NOT NULL,
    "max_patients" integer DEFAULT 20 NOT NULL,
    "max_storage_mb" integer DEFAULT 500 NOT NULL,
    "feature_portal_externo" boolean DEFAULT false NOT NULL,
    "feature_pdf_export" boolean DEFAULT true NOT NULL,
    "feature_csv_import" boolean DEFAULT false NOT NULL,
    "feature_api_access" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trial_days" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_tenant_cockpit" AS
 SELECT "p"."user_id",
    "p"."full_name",
    "p"."crn",
    "p"."plan_slug",
    "p"."is_suspended",
    "p"."suspended_reason",
    "p"."trial_started_at",
    "p"."last_active_at",
    "p"."acquisition_source",
    "p"."created_at" AS "registered_at",
    "sp"."name" AS "plan_name",
    "sp"."trial_days",
    ( SELECT "count"(*) AS "count"
           FROM "public"."clients" "c"
          WHERE ("c"."owner_user_id" = "p"."user_id")) AS "clients_count",
    ( SELECT "count"(*) AS "count"
           FROM ("public"."establishments" "e"
             JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
          WHERE ("c"."owner_user_id" = "p"."user_id")) AS "establishments_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."scheduled_visits" "sv"
          WHERE ("sv"."user_id" = "p"."user_id")) AS "visits_count",
    ( SELECT "se"."event_type"
           FROM "public"."subscription_events" "se"
          WHERE ("se"."tenant_user_id" = "p"."user_id")
          ORDER BY "se"."created_at" DESC
         LIMIT 1) AS "last_event_type",
    ( SELECT "se"."created_at"
           FROM "public"."subscription_events" "se"
          WHERE ("se"."tenant_user_id" = "p"."user_id")
          ORDER BY "se"."created_at" DESC
         LIMIT 1) AS "last_event_at"
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."subscription_plans" "sp" ON (("sp"."slug" = "p"."plan_slug")))
  WHERE ("p"."role" <> ALL (ARRAY['admin'::"text", 'super_admin'::"text"]));


ALTER VIEW "public"."admin_tenant_cockpit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_tenant_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_user_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_tenant_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "table_name" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "record_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "actor_user_id" "uuid",
    CONSTRAINT "audit_log_operation_check" CHECK (("operation" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"]))),
    CONSTRAINT "audit_log_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_troubleshooting_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid",
    "event" "text" NOT NULL,
    "step" "text",
    "outcome" "text",
    "email" "text",
    "user_id" "uuid",
    "error_code" "text",
    "error_message" "text",
    "next_path" "text",
    "has_session" boolean,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."auth_troubleshooting_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_custom_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "custom_section_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "is_required" boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "is_user_extra" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "peso" numeric(5,2) DEFAULT 1 NOT NULL,
    CONSTRAINT "checklist_custom_items_peso_check" CHECK (("peso" > (0)::numeric))
);


ALTER TABLE "public"."checklist_custom_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."checklist_custom_items"."peso" IS 'Peso do item no cálculo de pontuação (padrão = 1). Espelha a lógica dos itens globais.';



CREATE TABLE IF NOT EXISTS "public"."checklist_custom_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "custom_template_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."checklist_custom_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_custom_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "source_template_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."checklist_custom_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_establishment_recent" (
    "user_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "last_opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."checklist_establishment_recent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_fill_item_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "template_item_id" "uuid",
    "custom_item_id" "uuid",
    "storage_path" "text" NOT NULL,
    "original_filename" "text",
    "content_type" "text",
    "file_size" bigint,
    "taken_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "workspace_item_id" "uuid",
    CONSTRAINT "checklist_fill_item_photos_one_item" CHECK (((("template_item_id" IS NOT NULL) AND ("custom_item_id" IS NULL) AND ("workspace_item_id" IS NULL)) OR (("template_item_id" IS NULL) AND ("custom_item_id" IS NOT NULL) AND ("workspace_item_id" IS NULL)) OR (("template_item_id" IS NULL) AND ("custom_item_id" IS NULL) AND ("workspace_item_id" IS NOT NULL))))
);


ALTER TABLE "public"."checklist_fill_item_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_fill_item_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "template_item_id" "uuid",
    "outcome" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "custom_item_id" "uuid",
    "item_annotation" "text",
    "valid_until" "date",
    "workspace_item_id" "uuid",
    CONSTRAINT "checklist_fill_item_responses_one_item" CHECK (((("template_item_id" IS NOT NULL) AND ("custom_item_id" IS NULL) AND ("workspace_item_id" IS NULL)) OR (("template_item_id" IS NULL) AND ("custom_item_id" IS NOT NULL) AND ("workspace_item_id" IS NULL)) OR (("template_item_id" IS NULL) AND ("custom_item_id" IS NULL) AND ("workspace_item_id" IS NOT NULL)))),
    CONSTRAINT "checklist_fill_item_responses_outcome_check" CHECK (("outcome" = ANY (ARRAY['conforme'::"text", 'nc'::"text", 'na'::"text"])))
);


ALTER TABLE "public"."checklist_fill_item_responses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."checklist_fill_item_responses"."item_annotation" IS 'Nota opcional de contexto por item (FR20). Distinto de note (descrição obrigatória em NC).';



COMMENT ON COLUMN "public"."checklist_fill_item_responses"."valid_until" IS 'Data de validade da análise do item (opcional). Exibida como "Válido até" no dossiê e PDF.';



CREATE TABLE IF NOT EXISTS "public"."checklist_fill_pdf_exports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "storage_path" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version_number" integer NOT NULL,
    "superseded_at" timestamp with time zone,
    "superseded_by_version" integer,
    CONSTRAINT "checklist_fill_pdf_exports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'ready'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."checklist_fill_pdf_exports" OWNER TO "postgres";


COMMENT ON COLUMN "public"."checklist_fill_pdf_exports"."version_number" IS 'Número sequencial do PDF dentro da sessão (1-based).';



COMMENT ON COLUMN "public"."checklist_fill_pdf_exports"."superseded_at" IS 'Quando não nulo, o PDF deixou de ser o vigente (ex.: reabertura do checklist).';



COMMENT ON COLUMN "public"."checklist_fill_pdf_exports"."superseded_by_version" IS 'Versão do PDF que substituiu este ficheiro após nova geração.';



CREATE TABLE IF NOT EXISTS "public"."checklist_fill_session_reopen_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "reopened_by_user_id" "uuid" NOT NULL,
    "reopened_by_label" "text" DEFAULT ''::"text" NOT NULL,
    "reopened_by_role" "text" NOT NULL,
    "justification" "text" NOT NULL,
    "previous_approved_at" timestamp with time zone NOT NULL,
    "previous_score_percentage" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checklist_fill_session_reopen_events_justification_len" CHECK (("char_length"(TRIM(BOTH FROM "justification")) >= 10)),
    CONSTRAINT "checklist_fill_session_reopen_events_role_check" CHECK (("reopened_by_role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'gestao'::"text"])))
);


ALTER TABLE "public"."checklist_fill_session_reopen_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."checklist_fill_session_reopen_events" IS 'Auditoria de reabertura de checklist após aprovação do dossiê (justificativa obrigatória).';



CREATE TABLE IF NOT EXISTS "public"."checklist_fill_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "custom_template_id" "uuid",
    "scheduled_visit_id" "uuid",
    "dossier_approved_at" timestamp with time zone,
    "area_id" "uuid",
    "score_percentage" numeric(5,2),
    "score_points_earned" numeric(10,2),
    "score_points_total" numeric(10,2),
    "workspace_template_id" "uuid",
    CONSTRAINT "checklist_fill_sessions_one_template" CHECK (((("template_id" IS NOT NULL) AND ("custom_template_id" IS NULL) AND ("workspace_template_id" IS NULL)) OR (("template_id" IS NULL) AND ("custom_template_id" IS NOT NULL) AND ("workspace_template_id" IS NULL)) OR (("template_id" IS NULL) AND ("custom_template_id" IS NULL) AND ("workspace_template_id" IS NOT NULL))))
);


ALTER TABLE "public"."checklist_fill_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."checklist_fill_sessions"."dossier_approved_at" IS 'Quando preenchido, o dossiê foi aprovado; respostas e fotos deixam de ser alteráveis (MVP).';



COMMENT ON COLUMN "public"."checklist_fill_sessions"."area_id" IS 'Área física do estabelecimento avaliada nesta sessão (nullable: sessões sem área permanecem válidas).';



COMMENT ON COLUMN "public"."checklist_fill_sessions"."score_percentage" IS 'Percentual de conformidade (0.00 a 100.00). Calculado e persistido ao aprovar o dossiê.';



COMMENT ON COLUMN "public"."checklist_fill_sessions"."score_points_earned" IS 'Soma dos pesos dos itens em conformidade (outcome=''conforme'').';



COMMENT ON COLUMN "public"."checklist_fill_sessions"."score_points_total" IS 'Soma dos pesos dos itens aplicáveis (outcome != ''na''). Denominator do score.';



CREATE TABLE IF NOT EXISTS "public"."checklist_template_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "is_required" boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "peso" numeric(5,2) DEFAULT 1 NOT NULL,
    CONSTRAINT "checklist_template_items_peso_check" CHECK (("peso" > (0)::numeric))
);


ALTER TABLE "public"."checklist_template_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."checklist_template_items"."peso" IS 'Peso do item no cálculo de pontuação (padrão = 1). Itens mais críticos podem ter peso maior.';



CREATE TABLE IF NOT EXISTS "public"."checklist_template_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."checklist_template_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "portaria_ref" "text" NOT NULL,
    "uf" "text" NOT NULL,
    "applies_to" "text"[] NOT NULL,
    "description" "text",
    "version" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checklist_templates_uf_len" CHECK ((("char_length"("uf") = 2) OR ("uf" = '*'::"text")))
);


ALTER TABLE "public"."checklist_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_workspace_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_section_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "is_required" boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "peso" numeric(5,2) DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checklist_workspace_items_peso_check" CHECK (("peso" > (0)::numeric))
);


ALTER TABLE "public"."checklist_workspace_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_workspace_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_template_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."checklist_workspace_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_workspace_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "created_by_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "archived_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."checklist_workspace_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."checklist_workspace_templates" IS 'Modelos de checklist 100% customizáveis criados pela equipa do workspace.';



COMMENT ON COLUMN "public"."checklist_workspace_templates"."owner_user_id" IS 'Workspace owner — todos os membros da equipa partilham o mesmo owner_user_id.';



COMMENT ON COLUMN "public"."checklist_workspace_templates"."created_by_user_id" IS 'Membro da equipa que criou o modelo (para exibição "Criado por …").';



COMMENT ON COLUMN "public"."checklist_workspace_templates"."archived_at" IS 'Soft-delete: quando preenchido, o modelo deixa de aparecer na listagem mas sessões antigas continuam acessíveis.';



CREATE TABLE IF NOT EXISTS "public"."client_contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "billing_recurrence" "text" DEFAULT 'one-time'::"text" NOT NULL,
    "monthly_amount_cents" bigint,
    "contract_start_date" "date",
    "contract_end_date" "date",
    "alert_days_before" integer DEFAULT 30 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "client_contracts_billing_recurrence_check" CHECK (("billing_recurrence" = ANY (ARRAY['monthly'::"text", 'annual'::"text", 'one-time'::"text"]))),
    CONSTRAINT "client_contracts_dates_check" CHECK ((("contract_end_date" IS NULL) OR ("contract_start_date" IS NULL) OR ("contract_end_date" >= "contract_start_date"))),
    CONSTRAINT "client_contracts_monthly_amount_cents_check" CHECK ((("monthly_amount_cents" IS NULL) OR ("monthly_amount_cents" > 0)))
);


ALTER TABLE "public"."client_contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_custom_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "client_custom_segments_label_length" CHECK ((("char_length"(TRIM(BOTH FROM "label")) >= 1) AND ("char_length"(TRIM(BOTH FROM "label")) <= 80)))
);


ALTER TABLE "public"."client_custom_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_exam_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "content_type" "text",
    "file_size" bigint,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "client_exam_documents_category_check" CHECK (("category" = ANY (ARRAY['previous'::"text", 'scheduled'::"text"])))
);


ALTER TABLE "public"."client_exam_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consent_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "consent_type" "public"."consent_type" NOT NULL,
    "status" "public"."consent_status" DEFAULT 'active'::"public"."consent_status" NOT NULL,
    "is_parental_consent" boolean DEFAULT false NOT NULL,
    "parental_consent_name" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "revocation_reason" "text",
    "revoked_at" timestamp with time zone,
    "document_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consent_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "body_html" "text" DEFAULT ''::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contract_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."degustacao_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_key" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "label" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."degustacao_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."establishment_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "establishment_areas_name_check" CHECK (("char_length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."establishment_areas" OWNER TO "postgres";


COMMENT ON TABLE "public"."establishment_areas" IS 'Áreas físicas de um estabelecimento (ex.: Preparo Quente, Almoxarifado). Cada área pode ter checklists aplicados de forma independente.';



COMMENT ON COLUMN "public"."establishment_areas"."position" IS 'Ordem de exibição das áreas na UI (menor = primeiro).';



CREATE TABLE IF NOT EXISTS "public"."establishment_compliance_deadlines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "portaria_ref" "text",
    "checklist_template_id" "uuid",
    "due_date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "establishment_compliance_deadlines_title_len" CHECK (("char_length"("title") <= 200)),
    CONSTRAINT "establishment_compliance_deadlines_title_trim" CHECK (("char_length"(TRIM(BOTH FROM "title")) > 0))
);


ALTER TABLE "public"."establishment_compliance_deadlines" OWNER TO "postgres";


COMMENT ON TABLE "public"."establishment_compliance_deadlines" IS 'Prazos regulatórios / portaria por estabelecimento; alimenta alertas no dashboard (FR51).';



CREATE TABLE IF NOT EXISTS "public"."establishment_pops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "source_template_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "establishment_pops_title_len" CHECK (("char_length"(TRIM(BOTH FROM "title")) > 0))
);


ALTER TABLE "public"."establishment_pops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_access_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "external_user_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "can_view_reports" boolean DEFAULT false NOT NULL,
    "can_view_measurements" boolean DEFAULT false NOT NULL,
    "can_view_exams" boolean DEFAULT false NOT NULL,
    "can_view_nutrition_plan" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."external_access_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_portal_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "magic_link_token" "text",
    "magic_link_expires_at" timestamp with time zone,
    "last_access_at" timestamp with time zone,
    "patient_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "external_portal_users_role_check" CHECK (("role" = ANY (ARRAY['viewer'::"text", 'guardian'::"text"])))
);


ALTER TABLE "public"."external_portal_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_charges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "amount_cents" bigint NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "financial_charges_amount_cents_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "financial_charges_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."financial_charges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_adult_nutrition_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "patient_group" "text" NOT NULL,
    "has_amputation" boolean DEFAULT false NOT NULL,
    "amputation_segment_pct" numeric(5,2),
    "age_years" integer,
    "cb_cm" numeric(5,2),
    "dct_mm" numeric(5,2),
    "cp_cm" numeric(5,2),
    "aj_cm" numeric(5,2),
    "weight_real_kg" numeric(6,2),
    "cmb_cm" numeric(5,2),
    "estimated_weight_kg" numeric(6,2),
    "estimated_height_m" numeric(4,3),
    "bmi" numeric(5,2),
    "kcal_per_kg" numeric(5,1),
    "energy_needs_kcal" numeric(8,1),
    "ptn_per_kg" numeric(4,2),
    "protein_needs_g" numeric(7,1),
    "nutritional_risk" "text",
    "nutritional_diagnosis" "text",
    "clinical_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "patient_adult_nutrition_assessment_amputation_segment_pct_check" CHECK ((("amputation_segment_pct" > (0)::numeric) AND ("amputation_segment_pct" < (100)::numeric))),
    CONSTRAINT "patient_adult_nutrition_assessments_age_years_check" CHECK ((("age_years" >= 0) AND ("age_years" <= 130))),
    CONSTRAINT "patient_adult_nutrition_assessments_aj_cm_check" CHECK (("aj_cm" >= (0)::numeric)),
    CONSTRAINT "patient_adult_nutrition_assessments_cb_cm_check" CHECK (("cb_cm" >= (0)::numeric)),
    CONSTRAINT "patient_adult_nutrition_assessments_cp_cm_check" CHECK (("cp_cm" >= (0)::numeric)),
    CONSTRAINT "patient_adult_nutrition_assessments_dct_mm_check" CHECK (("dct_mm" >= (0)::numeric)),
    CONSTRAINT "patient_adult_nutrition_assessments_kcal_per_kg_check" CHECK (("kcal_per_kg" >= (0)::numeric)),
    CONSTRAINT "patient_adult_nutrition_assessments_nutritional_risk_check" CHECK (("nutritional_risk" = ANY (ARRAY['s_rn'::"text", 'c_rn'::"text"]))),
    CONSTRAINT "patient_adult_nutrition_assessments_patient_group_check" CHECK (("patient_group" = ANY (ARRAY['mulher_branca'::"text", 'mulher_negra'::"text", 'homem_branco'::"text", 'homem_negro'::"text"]))),
    CONSTRAINT "patient_adult_nutrition_assessments_ptn_per_kg_check" CHECK (("ptn_per_kg" >= (0)::numeric)),
    CONSTRAINT "patient_adult_nutrition_assessments_weight_real_kg_check" CHECK (("weight_real_kg" >= (0)::numeric))
);


ALTER TABLE "public"."patient_adult_nutrition_assessments" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_adult_nutrition_assessments" IS 'Avaliação nutricional adultos: peso estimado (AJ/CB); altura estimada Chumlea adulto 18–60; restante alinhado à avaliação geriátrica.';



CREATE TABLE IF NOT EXISTS "public"."patient_geriatric_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "patient_group" "text" NOT NULL,
    "has_amputation" boolean DEFAULT false NOT NULL,
    "amputation_segment_pct" numeric(5,2),
    "age_years" integer,
    "cb_cm" numeric(5,2),
    "dct_mm" numeric(5,2),
    "cp_cm" numeric(5,2),
    "aj_cm" numeric(5,2),
    "weight_real_kg" numeric(6,2),
    "cmb_cm" numeric(5,2),
    "estimated_weight_kg" numeric(6,2),
    "estimated_height_m" numeric(4,3),
    "bmi" numeric(5,2),
    "kcal_per_kg" numeric(5,1),
    "energy_needs_kcal" numeric(8,1),
    "ptn_per_kg" numeric(4,2),
    "protein_needs_g" numeric(7,1),
    "nutritional_risk" "text",
    "nutritional_diagnosis" "text",
    "clinical_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "patient_geriatric_assessments_age_years_check" CHECK ((("age_years" >= 0) AND ("age_years" <= 130))),
    CONSTRAINT "patient_geriatric_assessments_aj_cm_check" CHECK (("aj_cm" >= (0)::numeric)),
    CONSTRAINT "patient_geriatric_assessments_amputation_segment_pct_check" CHECK ((("amputation_segment_pct" > (0)::numeric) AND ("amputation_segment_pct" < (100)::numeric))),
    CONSTRAINT "patient_geriatric_assessments_cb_cm_check" CHECK (("cb_cm" >= (0)::numeric)),
    CONSTRAINT "patient_geriatric_assessments_cp_cm_check" CHECK (("cp_cm" >= (0)::numeric)),
    CONSTRAINT "patient_geriatric_assessments_dct_mm_check" CHECK (("dct_mm" >= (0)::numeric)),
    CONSTRAINT "patient_geriatric_assessments_kcal_per_kg_check" CHECK (("kcal_per_kg" >= (0)::numeric)),
    CONSTRAINT "patient_geriatric_assessments_nutritional_risk_check" CHECK (("nutritional_risk" = ANY (ARRAY['s_rn'::"text", 'c_rn'::"text"]))),
    CONSTRAINT "patient_geriatric_assessments_patient_group_check" CHECK (("patient_group" = ANY (ARRAY['mulher_branca'::"text", 'mulher_negra'::"text", 'homem_branco'::"text", 'homem_negro'::"text"]))),
    CONSTRAINT "patient_geriatric_assessments_ptn_per_kg_check" CHECK (("ptn_per_kg" >= (0)::numeric)),
    CONSTRAINT "patient_geriatric_assessments_weight_real_kg_check" CHECK (("weight_real_kg" >= (0)::numeric))
);


ALTER TABLE "public"."patient_geriatric_assessments" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_geriatric_assessments" IS 'Avaliação nutricional especializada para idosos. Fórmulas: Chumlea et al. (1985/1988), Gurney & Jelliffe (1973).';



COMMENT ON COLUMN "public"."patient_geriatric_assessments"."patient_group" IS 'Define a equação de Peso Estimado e Altura: mulher_branca (PE=AJ×1.09+CB×2.68-65.51), mulher_negra (PE=AJ×1.5+CB×2.58-84.22), homem_branco (PE=AJ×1.1+CB×3.07-75.81), homem_negro (PE=AJ×0.44+CB×2.86-39.21).';



COMMENT ON COLUMN "public"."patient_geriatric_assessments"."amputation_segment_pct" IS 'Percentual do segmento amputado (Osterkamp, 1995): coxa=10,0%, perna+pé=5,9%, pé=1,8%, etc.';



COMMENT ON COLUMN "public"."patient_geriatric_assessments"."cmb_cm" IS 'Calculado: CMB = CB − (DCT × 0,314) — Gurney & Jelliffe, 1973.';



COMMENT ON COLUMN "public"."patient_geriatric_assessments"."estimated_weight_kg" IS 'Calculado via fórmula Chumlea et al. (1988). Para amputados: PE_base × 100 ÷ (100 − % segmento).';



COMMENT ON COLUMN "public"."patient_geriatric_assessments"."estimated_height_m" IS 'Calculado via fórmula Chumlea et al. (1985). Mulheres: (84.88+1.83×AJ−0.24×Idade)÷100. Homens: (64.19+2.04×AJ−0.04×Idade)÷100.';



CREATE TABLE IF NOT EXISTS "public"."patient_nutrition_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "height_cm" numeric(5,2),
    "weight_kg" numeric(6,2),
    "waist_cm" numeric(5,2),
    "activity_level" "text",
    "diet_notes" "text",
    "clinical_notes" "text",
    "goals" "text",
    CONSTRAINT "patient_naa_activity_check" CHECK ((("activity_level" IS NULL) OR ("activity_level" = ANY (ARRAY['sedentary'::"text", 'light'::"text", 'moderate'::"text", 'high'::"text"])))),
    CONSTRAINT "patient_naa_height_check" CHECK ((("height_cm" IS NULL) OR (("height_cm" >= (40)::numeric) AND ("height_cm" <= (250)::numeric)))),
    CONSTRAINT "patient_naa_waist_check" CHECK ((("waist_cm" IS NULL) OR (("waist_cm" >= (30)::numeric) AND ("waist_cm" <= (200)::numeric)))),
    CONSTRAINT "patient_naa_weight_check" CHECK ((("weight_kg" IS NULL) OR (("weight_kg" >= (2)::numeric) AND ("weight_kg" <= (400)::numeric))))
);


ALTER TABLE "public"."patient_nutrition_assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_parental_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "guardian_full_name" "text" NOT NULL,
    "guardian_document_id" "text",
    "guardian_relationship" "text" NOT NULL,
    "guardian_email" "text",
    "consented_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "consent_text" "text" NOT NULL,
    "ip_address" "text",
    "revoked_at" timestamp with time zone,
    "revocation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "patient_parental_consents_relationship_check" CHECK (("guardian_relationship" = ANY (ARRAY['parent'::"text", 'legal_guardian'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."patient_parental_consents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "establishment_id" "uuid",
    "full_name" "text" NOT NULL,
    "birth_date" "date",
    "document_id" "text",
    "sex" "text",
    "phone" "text",
    "email" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_parental_consent" boolean DEFAULT false NOT NULL,
    "parental_consent_name" "text",
    "user_id" "uuid" NOT NULL,
    "responsible_team_member_id" "uuid",
    CONSTRAINT "patients_sex_check" CHECK ((("sex" IS NULL) OR ("sex" = ANY (ARRAY['female'::"text", 'male'::"text", 'other'::"text"]))))
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "kind" "text" DEFAULT 'info'::"text" NOT NULL,
    "target_plan_slugs" "text"[],
    "active_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active_until" timestamp with time zone,
    "is_dismissible" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "platform_announcements_kind_check" CHECK (("kind" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."platform_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pop_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "body" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "pop_templates_body_len" CHECK (("char_length"(TRIM(BOTH FROM "body")) > 0)),
    CONSTRAINT "pop_templates_name_len" CHECK (("char_length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "pop_templates_type_check" CHECK (("establishment_type" = ANY (ARRAY['escola'::"text", 'hospital'::"text", 'clinica'::"text", 'lar_idosos'::"text", 'restaurante'::"text", 'frigorifico'::"text", 'mercado'::"text", 'cozinha_industrial'::"text", 'empresa'::"text"])))
);


ALTER TABLE "public"."pop_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pop_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pop_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pop_versions_body_len" CHECK (("char_length"(TRIM(BOTH FROM "body")) > 0)),
    CONSTRAINT "pop_versions_number_pos" CHECK (("version_number" >= 1)),
    CONSTRAINT "pop_versions_title_len" CHECK (("char_length"(TRIM(BOTH FROM "title")) > 0))
);


ALTER TABLE "public"."pop_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_raw_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price_unit" "text" NOT NULL,
    "unit_price_brl" numeric(14,4) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "professional_raw_materials_name_len" CHECK (("char_length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "professional_raw_materials_price_unit_check" CHECK (("price_unit" = ANY (ARRAY['g'::"text", 'kg'::"text", 'ml'::"text", 'l'::"text", 'un'::"text"]))),
    CONSTRAINT "professional_raw_materials_unit_price_pos" CHECK (("unit_price_brl" > (0)::numeric))
);


ALTER TABLE "public"."professional_raw_materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."taco_reference_foods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "taco_code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "kcal_per_100g" numeric(12,4) NOT NULL,
    "protein_g_per_100g" numeric(12,4) DEFAULT 0 NOT NULL,
    "carb_g_per_100g" numeric(12,4) DEFAULT 0 NOT NULL,
    "lipid_g_per_100g" numeric(12,4) DEFAULT 0 NOT NULL,
    "fiber_g_per_100g" numeric(12,4) DEFAULT 0 NOT NULL,
    CONSTRAINT "taco_reference_foods_code_len" CHECK (("char_length"(TRIM(BOTH FROM "taco_code")) > 0)),
    CONSTRAINT "taco_reference_foods_name_len" CHECK (("char_length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."taco_reference_foods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "professional_area" "text" DEFAULT 'nutrition'::"text" NOT NULL,
    "job_role" "text" NOT NULL,
    "crn" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "member_user_id" "uuid",
    CONSTRAINT "team_members_job_role_check" CHECK (("job_role" = ANY (ARRAY['nutricionista'::"text", 'nutricionista_estagiario'::"text", 'tecnico_nutricao'::"text", 'auxiliar'::"text", 'administrativo'::"text", 'gestao'::"text", 'outro'::"text"]))),
    CONSTRAINT "team_members_professional_area_check" CHECK (("professional_area" = ANY (ARRAY['nutrition'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."technical_recipe_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "sort_order" integer NOT NULL,
    "ingredient_name" "text" NOT NULL,
    "quantity" numeric(14,4) NOT NULL,
    "unit" "text" NOT NULL,
    "notes" "text",
    "taco_food_id" "uuid",
    "raw_material_id" "uuid",
    "correction_factor" numeric(10,4) DEFAULT 1 NOT NULL,
    "cooking_factor" numeric(10,4) DEFAULT 1 NOT NULL,
    CONSTRAINT "technical_recipe_lines_cooking_factor_check" CHECK ((("cooking_factor" > (0)::numeric) AND ("cooking_factor" <= (10)::numeric))),
    CONSTRAINT "technical_recipe_lines_correction_factor_check" CHECK ((("correction_factor" > (0)::numeric) AND ("correction_factor" <= (10)::numeric))),
    CONSTRAINT "technical_recipe_lines_ingredient_len" CHECK (("char_length"(TRIM(BOTH FROM "ingredient_name")) > 0)),
    CONSTRAINT "technical_recipe_lines_quantity_pos" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "technical_recipe_lines_sort_nonneg" CHECK (("sort_order" >= 0)),
    CONSTRAINT "technical_recipe_lines_unit_check" CHECK (("unit" = ANY (ARRAY['g'::"text", 'kg'::"text", 'ml'::"text", 'l'::"text", 'un'::"text"])))
);


ALTER TABLE "public"."technical_recipe_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."technical_recipe_template_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."technical_recipe_template_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_feature_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_user_id" "uuid" NOT NULL,
    "feature_key" "text" NOT NULL,
    "enabled" boolean NOT NULL,
    "reason" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."tenant_feature_overrides" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_impersonation_log"
    ADD CONSTRAINT "admin_impersonation_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_tenant_notes"
    ADD CONSTRAINT "admin_tenant_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_tokens"
    ADD CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_tokens"
    ADD CONSTRAINT "api_tokens_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_troubleshooting_logs"
    ADD CONSTRAINT "auth_troubleshooting_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_custom_items"
    ADD CONSTRAINT "checklist_custom_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_custom_sections"
    ADD CONSTRAINT "checklist_custom_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_custom_templates"
    ADD CONSTRAINT "checklist_custom_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_establishment_recent"
    ADD CONSTRAINT "checklist_establishment_recent_pkey" PRIMARY KEY ("user_id", "establishment_id");



ALTER TABLE ONLY "public"."checklist_fill_item_photos"
    ADD CONSTRAINT "checklist_fill_item_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_fill_item_responses"
    ADD CONSTRAINT "checklist_fill_item_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_fill_pdf_exports"
    ADD CONSTRAINT "checklist_fill_pdf_exports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_fill_session_reopen_events"
    ADD CONSTRAINT "checklist_fill_session_reopen_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_fill_sessions"
    ADD CONSTRAINT "checklist_fill_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_template_items"
    ADD CONSTRAINT "checklist_template_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_template_sections"
    ADD CONSTRAINT "checklist_template_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_templates"
    ADD CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_workspace_items"
    ADD CONSTRAINT "checklist_workspace_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_workspace_sections"
    ADD CONSTRAINT "checklist_workspace_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_workspace_templates"
    ADD CONSTRAINT "checklist_workspace_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_contracts"
    ADD CONSTRAINT "client_contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_custom_segments"
    ADD CONSTRAINT "client_custom_segments_owner_label_unique" UNIQUE ("owner_user_id", "label");



ALTER TABLE ONLY "public"."client_custom_segments"
    ADD CONSTRAINT "client_custom_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_exam_documents"
    ADD CONSTRAINT "client_exam_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consent_records"
    ADD CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."degustacao_config"
    ADD CONSTRAINT "degustacao_config_feature_key_key" UNIQUE ("feature_key");



ALTER TABLE ONLY "public"."degustacao_config"
    ADD CONSTRAINT "degustacao_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishment_areas"
    ADD CONSTRAINT "establishment_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishment_compliance_deadlines"
    ADD CONSTRAINT "establishment_compliance_deadlines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishment_pops"
    ADD CONSTRAINT "establishment_pops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."establishments"
    ADD CONSTRAINT "establishments_one_per_client" UNIQUE ("client_id");



COMMENT ON CONSTRAINT "establishments_one_per_client" ON "public"."establishments" IS 'Cada cliente PJ pode ter no máximo 1 estabelecimento (regra de negócio: 1 CNPJ = 1 estabelecimento = 1 cliente).';



ALTER TABLE ONLY "public"."establishments"
    ADD CONSTRAINT "establishments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_access_permissions"
    ADD CONSTRAINT "ext_access_perm_uq" UNIQUE ("external_user_id", "patient_id");



ALTER TABLE ONLY "public"."external_access_permissions"
    ADD CONSTRAINT "external_access_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_portal_users"
    ADD CONSTRAINT "external_portal_users_email_owner_uq" UNIQUE ("owner_user_id", "email");



ALTER TABLE ONLY "public"."external_portal_users"
    ADD CONSTRAINT "external_portal_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_charges"
    ADD CONSTRAINT "financial_charges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_adult_nutrition_assessments"
    ADD CONSTRAINT "patient_adult_nutrition_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_geriatric_assessments"
    ADD CONSTRAINT "patient_geriatric_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_nutrition_assessments"
    ADD CONSTRAINT "patient_nutrition_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_parental_consents"
    ADD CONSTRAINT "patient_parental_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_announcements"
    ADD CONSTRAINT "platform_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pop_templates"
    ADD CONSTRAINT "pop_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pop_versions"
    ADD CONSTRAINT "pop_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pop_versions"
    ADD CONSTRAINT "pop_versions_pop_version_unique" UNIQUE ("pop_id", "version_number");



ALTER TABLE ONLY "public"."professional_raw_materials"
    ADD CONSTRAINT "professional_raw_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."scheduled_visits"
    ADD CONSTRAINT "scheduled_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."taco_reference_foods"
    ADD CONSTRAINT "taco_reference_foods_code_unique" UNIQUE ("taco_code");



ALTER TABLE ONLY "public"."taco_reference_foods"
    ADD CONSTRAINT "taco_reference_foods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technical_recipe_lines"
    ADD CONSTRAINT "technical_recipe_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technical_recipe_template_favorites"
    ADD CONSTRAINT "technical_recipe_template_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technical_recipe_template_favorites"
    ADD CONSTRAINT "technical_recipe_template_favorites_unique" UNIQUE ("client_id", "recipe_id");



ALTER TABLE ONLY "public"."technical_recipes"
    ADD CONSTRAINT "technical_recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_feature_overrides"
    ADD CONSTRAINT "tenant_feature_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_feature_overrides"
    ADD CONSTRAINT "tenant_feature_overrides_unique" UNIQUE ("tenant_user_id", "feature_key");



CREATE INDEX "admin_impersonation_log_admin_idx" ON "public"."admin_impersonation_log" USING "btree" ("admin_user_id", "started_at" DESC);



CREATE INDEX "admin_impersonation_log_target_idx" ON "public"."admin_impersonation_log" USING "btree" ("target_user_id", "started_at" DESC);



CREATE INDEX "admin_tenant_notes_tenant_idx" ON "public"."admin_tenant_notes" USING "btree" ("tenant_user_id", "created_at" DESC);



CREATE INDEX "api_tokens_owner_idx" ON "public"."api_tokens" USING "btree" ("owner_user_id", "revoked_at") WHERE ("revoked_at" IS NULL);



CREATE INDEX "audit_log_actor_user_id_idx" ON "public"."audit_log" USING "btree" ("actor_user_id") WHERE ("actor_user_id" IS NOT NULL);



CREATE INDEX "audit_log_expires_idx" ON "public"."audit_log" USING "btree" ("expires_at") WHERE ("status" = 'active'::"text");



CREATE INDEX "audit_log_table_record_idx" ON "public"."audit_log" USING "btree" ("table_name", "record_id");



CREATE INDEX "audit_log_user_created_idx" ON "public"."audit_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "auth_troubleshooting_logs_created_idx" ON "public"."auth_troubleshooting_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "auth_troubleshooting_logs_email_created_idx" ON "public"."auth_troubleshooting_logs" USING "btree" ("email", "created_at" DESC) WHERE ("email" IS NOT NULL);



CREATE INDEX "auth_troubleshooting_logs_request_idx" ON "public"."auth_troubleshooting_logs" USING "btree" ("request_id", "created_at" DESC) WHERE ("request_id" IS NOT NULL);



CREATE INDEX "checklist_custom_items_section_pos_idx" ON "public"."checklist_custom_items" USING "btree" ("custom_section_id", "position");



CREATE INDEX "checklist_custom_sections_tpl_pos_idx" ON "public"."checklist_custom_sections" USING "btree" ("custom_template_id", "position");



CREATE INDEX "checklist_custom_templates_establishment_idx" ON "public"."checklist_custom_templates" USING "btree" ("establishment_id");



CREATE INDEX "checklist_custom_templates_user_idx" ON "public"."checklist_custom_templates" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "checklist_establishment_recent_user_last_opened_idx" ON "public"."checklist_establishment_recent" USING "btree" ("user_id", "last_opened_at" DESC);



CREATE INDEX "checklist_fill_item_photos_session_idx" ON "public"."checklist_fill_item_photos" USING "btree" ("session_id", "created_at" DESC);



CREATE INDEX "checklist_fill_item_responses_session_idx" ON "public"."checklist_fill_item_responses" USING "btree" ("session_id");



CREATE INDEX "checklist_fill_pdf_exports_session_created_idx" ON "public"."checklist_fill_pdf_exports" USING "btree" ("session_id", "created_at" DESC);



CREATE INDEX "checklist_fill_pdf_exports_session_version_idx" ON "public"."checklist_fill_pdf_exports" USING "btree" ("session_id", "version_number" DESC);



CREATE UNIQUE INDEX "checklist_fill_resp_session_custom_unique" ON "public"."checklist_fill_item_responses" USING "btree" ("session_id", "custom_item_id") WHERE ("custom_item_id" IS NOT NULL);



CREATE UNIQUE INDEX "checklist_fill_resp_session_global_unique" ON "public"."checklist_fill_item_responses" USING "btree" ("session_id", "template_item_id") WHERE ("template_item_id" IS NOT NULL);



CREATE UNIQUE INDEX "checklist_fill_resp_session_workspace_unique" ON "public"."checklist_fill_item_responses" USING "btree" ("session_id", "workspace_item_id") WHERE ("workspace_item_id" IS NOT NULL);



CREATE INDEX "checklist_fill_session_reopen_events_session_created_idx" ON "public"."checklist_fill_session_reopen_events" USING "btree" ("session_id", "created_at" DESC);



CREATE INDEX "checklist_fill_sessions_area_idx" ON "public"."checklist_fill_sessions" USING "btree" ("area_id") WHERE ("area_id" IS NOT NULL);



CREATE INDEX "checklist_fill_sessions_scheduled_visit_idx" ON "public"."checklist_fill_sessions" USING "btree" ("scheduled_visit_id") WHERE ("scheduled_visit_id" IS NOT NULL);



CREATE INDEX "checklist_fill_sessions_user_updated_idx" ON "public"."checklist_fill_sessions" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "checklist_fill_sessions_workspace_idx" ON "public"."checklist_fill_sessions" USING "btree" ("workspace_template_id") WHERE ("workspace_template_id" IS NOT NULL);



CREATE INDEX "checklist_template_items_section_position_idx" ON "public"."checklist_template_items" USING "btree" ("section_id", "position");



CREATE INDEX "checklist_template_sections_template_position_idx" ON "public"."checklist_template_sections" USING "btree" ("template_id", "position");



CREATE INDEX "checklist_templates_uf_active_idx" ON "public"."checklist_templates" USING "btree" ("uf", "is_active") WHERE ("is_active" = true);



CREATE INDEX "checklist_workspace_items_section_pos_idx" ON "public"."checklist_workspace_items" USING "btree" ("workspace_section_id", "position");



CREATE INDEX "checklist_workspace_sections_tpl_pos_idx" ON "public"."checklist_workspace_sections" USING "btree" ("workspace_template_id", "position");



CREATE INDEX "checklist_workspace_templates_owner_active_idx" ON "public"."checklist_workspace_templates" USING "btree" ("owner_user_id", "archived_at", "updated_at" DESC);



CREATE INDEX "client_contracts_owner_client_idx" ON "public"."client_contracts" USING "btree" ("owner_user_id", "client_id");



CREATE INDEX "client_contracts_owner_end_date_idx" ON "public"."client_contracts" USING "btree" ("owner_user_id", "contract_end_date") WHERE ("contract_end_date" IS NOT NULL);



CREATE INDEX "client_custom_segments_owner_idx" ON "public"."client_custom_segments" USING "btree" ("owner_user_id");



CREATE INDEX "client_exam_documents_client_created_idx" ON "public"."client_exam_documents" USING "btree" ("client_id", "created_at" DESC);



CREATE INDEX "clients_owner_created_idx" ON "public"."clients" USING "btree" ("owner_user_id", "created_at" DESC);



CREATE INDEX "clients_owner_legal_name_idx" ON "public"."clients" USING "btree" ("owner_user_id", "legal_name");



CREATE INDEX "clients_owner_lifecycle_idx" ON "public"."clients" USING "btree" ("owner_user_id", "lifecycle_status");



CREATE INDEX "clients_owner_segment_idx" ON "public"."clients" USING "btree" ("owner_user_id", "business_segment") WHERE ("business_segment" IS NOT NULL);



CREATE INDEX "clients_responsible_team_member_idx" ON "public"."clients" USING "btree" ("responsible_team_member_id") WHERE ("responsible_team_member_id" IS NOT NULL);



CREATE INDEX "consent_records_active_idx" ON "public"."consent_records" USING "btree" ("patient_id", "status") WHERE ("status" = 'active'::"public"."consent_status");



CREATE INDEX "consent_records_patient_user_idx" ON "public"."consent_records" USING "btree" ("patient_id", "user_id", "created_at" DESC);



CREATE INDEX "consent_records_type_idx" ON "public"."consent_records" USING "btree" ("patient_id", "consent_type", "status");



CREATE INDEX "contract_templates_global_idx" ON "public"."contract_templates" USING "btree" ("is_active") WHERE ("owner_user_id" IS NULL);



CREATE INDEX "contract_templates_owner_idx" ON "public"."contract_templates" USING "btree" ("owner_user_id");



CREATE INDEX "establishment_areas_establishment_idx" ON "public"."establishment_areas" USING "btree" ("establishment_id", "position");



CREATE INDEX "establishment_areas_owner_idx" ON "public"."establishment_areas" USING "btree" ("owner_user_id");



CREATE INDEX "establishment_compliance_deadlines_due_idx" ON "public"."establishment_compliance_deadlines" USING "btree" ("due_date");



CREATE INDEX "establishment_compliance_deadlines_est_due_idx" ON "public"."establishment_compliance_deadlines" USING "btree" ("establishment_id", "due_date");



CREATE INDEX "establishment_pops_establishment_idx" ON "public"."establishment_pops" USING "btree" ("establishment_id", "updated_at" DESC);



CREATE INDEX "establishments_client_created_idx" ON "public"."establishments" USING "btree" ("client_id", "created_at" DESC);



CREATE INDEX "ext_access_perm_ext_user_idx" ON "public"."external_access_permissions" USING "btree" ("external_user_id");



CREATE INDEX "ext_access_perm_owner_idx" ON "public"."external_access_permissions" USING "btree" ("owner_user_id");



CREATE INDEX "ext_portal_users_owner_idx" ON "public"."external_portal_users" USING "btree" ("owner_user_id");



CREATE INDEX "ext_portal_users_token_idx" ON "public"."external_portal_users" USING "btree" ("magic_link_token") WHERE ("magic_link_token" IS NOT NULL);



CREATE INDEX "financial_charges_owner_due_idx" ON "public"."financial_charges" USING "btree" ("owner_user_id", "due_date");



CREATE INDEX "financial_charges_owner_status_due_idx" ON "public"."financial_charges" USING "btree" ("owner_user_id", "status", "due_date");



CREATE INDEX "patient_adult_nutrition_assessments_patient_id_idx" ON "public"."patient_adult_nutrition_assessments" USING "btree" ("patient_id", "recorded_at" DESC);



CREATE INDEX "patient_consents_owner_idx" ON "public"."patient_parental_consents" USING "btree" ("owner_user_id");



CREATE INDEX "patient_consents_patient_idx" ON "public"."patient_parental_consents" USING "btree" ("patient_id");



CREATE INDEX "patient_geriatric_assessments_patient_id_idx" ON "public"."patient_geriatric_assessments" USING "btree" ("patient_id", "recorded_at" DESC);



CREATE INDEX "patient_naa_patient_recorded_idx" ON "public"."patient_nutrition_assessments" USING "btree" ("patient_id", "recorded_at" DESC);



CREATE INDEX "patients_client_created_idx" ON "public"."patients" USING "btree" ("client_id", "created_at" DESC);



CREATE INDEX "patients_client_pf_idx" ON "public"."patients" USING "btree" ("client_id") WHERE ("establishment_id" IS NULL);



CREATE INDEX "patients_establishment_created_idx" ON "public"."patients" USING "btree" ("establishment_id", "created_at" DESC);



CREATE INDEX "patients_responsible_team_member_idx" ON "public"."patients" USING "btree" ("responsible_team_member_id") WHERE ("responsible_team_member_id" IS NOT NULL);



CREATE INDEX "patients_user_id_idx" ON "public"."patients" USING "btree" ("user_id");



CREATE INDEX "platform_announcements_active_idx" ON "public"."platform_announcements" USING "btree" ("active_from", "active_until");



CREATE INDEX "pop_templates_type_pos_idx" ON "public"."pop_templates" USING "btree" ("establishment_type", "position", "name");



CREATE INDEX "pop_versions_pop_version_idx" ON "public"."pop_versions" USING "btree" ("pop_id", "version_number" DESC);



CREATE INDEX "professional_raw_materials_owner_name_idx" ON "public"."professional_raw_materials" USING "btree" ("owner_user_id", "lower"("name"));



CREATE INDEX "profiles_lgpd_blocked_idx" ON "public"."profiles" USING "btree" ("user_id") WHERE (("lgpd_blocked_at" IS NOT NULL) AND ("lgpd_unblocked_at" IS NULL));



CREATE INDEX "profiles_user_id_idx" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "scheduled_visits_assigned_member_idx" ON "public"."scheduled_visits" USING "btree" ("assigned_team_member_id") WHERE ("assigned_team_member_id" IS NOT NULL);



CREATE INDEX "scheduled_visits_user_start_idx" ON "public"."scheduled_visits" USING "btree" ("user_id", "scheduled_start");



CREATE INDEX "subscription_events_tenant_idx" ON "public"."subscription_events" USING "btree" ("tenant_user_id", "created_at" DESC);



CREATE INDEX "taco_reference_foods_name_ilike_idx" ON "public"."taco_reference_foods" USING "btree" ("lower"("name"));



CREATE INDEX "team_members_member_user_id_idx" ON "public"."team_members" USING "btree" ("member_user_id") WHERE ("member_user_id" IS NOT NULL);



CREATE INDEX "team_members_owner_idx" ON "public"."team_members" USING "btree" ("owner_user_id");



CREATE INDEX "technical_recipe_lines_raw_material_idx" ON "public"."technical_recipe_lines" USING "btree" ("raw_material_id") WHERE ("raw_material_id" IS NOT NULL);



CREATE INDEX "technical_recipe_lines_recipe_sort_idx" ON "public"."technical_recipe_lines" USING "btree" ("recipe_id", "sort_order");



CREATE INDEX "technical_recipe_lines_taco_food_idx" ON "public"."technical_recipe_lines" USING "btree" ("taco_food_id") WHERE ("taco_food_id" IS NOT NULL);



CREATE INDEX "technical_recipe_template_favorites_client_idx" ON "public"."technical_recipe_template_favorites" USING "btree" ("client_id");



CREATE INDEX "technical_recipe_template_favorites_recipe_idx" ON "public"."technical_recipe_template_favorites" USING "btree" ("recipe_id");



CREATE INDEX "technical_recipes_client_created_idx" ON "public"."technical_recipes" USING "btree" ("client_id", "created_at" DESC);



CREATE INDEX "technical_recipes_client_null_est_idx" ON "public"."technical_recipes" USING "btree" ("client_id", "created_at" DESC) WHERE ("establishment_id" IS NULL);



CREATE INDEX "technical_recipes_contexto_client_idx" ON "public"."technical_recipes" USING "btree" ("contexto", "client_id", "created_at" DESC);



CREATE INDEX "technical_recipes_establishment_created_idx" ON "public"."technical_recipes" USING "btree" ("establishment_id", "created_at" DESC);



CREATE INDEX "technical_recipes_is_template_idx" ON "public"."technical_recipes" USING "btree" ("is_template", "establishment_id", "created_at" DESC);



CREATE INDEX "technical_recipes_repositorio_client_idx" ON "public"."technical_recipes" USING "btree" ("client_id", "created_at" DESC) WHERE ("contexto" = 'REPOSITORIO'::"public"."recipe_context");



CREATE INDEX "technical_recipes_repository_origin_idx" ON "public"."technical_recipes" USING "btree" ("repository_origin_id") WHERE ("repository_origin_id" IS NOT NULL);



CREATE INDEX "tenant_feature_overrides_tenant_idx" ON "public"."tenant_feature_overrides" USING "btree" ("tenant_user_id");



CREATE OR REPLACE TRIGGER "admin_tenant_notes_set_updated_at" BEFORE UPDATE ON "public"."admin_tenant_notes" FOR EACH ROW EXECUTE FUNCTION "public"."admin_tenant_notes_touch_updated_at"();



CREATE OR REPLACE TRIGGER "audit_clients_ad" AFTER DELETE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."audit_clients_ad"();



CREATE OR REPLACE TRIGGER "audit_clients_ai" AFTER INSERT ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."audit_clients_ai"();



CREATE OR REPLACE TRIGGER "audit_clients_au" AFTER UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."audit_clients_au"();



CREATE OR REPLACE TRIGGER "audit_consent_records_ai" AFTER INSERT ON "public"."consent_records" FOR EACH ROW EXECUTE FUNCTION "public"."audit_consent_records_ai"();



CREATE OR REPLACE TRIGGER "audit_consent_records_au" AFTER UPDATE ON "public"."consent_records" FOR EACH ROW EXECUTE FUNCTION "public"."audit_consent_records_au"();



CREATE OR REPLACE TRIGGER "audit_patient_nutrition_assessments_ad" AFTER DELETE ON "public"."patient_nutrition_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_trigger"();



CREATE OR REPLACE TRIGGER "audit_patient_nutrition_assessments_ai" AFTER INSERT ON "public"."patient_nutrition_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_trigger"();



CREATE OR REPLACE TRIGGER "audit_patient_nutrition_assessments_au" AFTER UPDATE ON "public"."patient_nutrition_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_trigger"();



CREATE OR REPLACE TRIGGER "audit_patients_ad" AFTER DELETE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_trigger"();



CREATE OR REPLACE TRIGGER "audit_patients_ai" AFTER INSERT ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_trigger"();



CREATE OR REPLACE TRIGGER "audit_patients_au" AFTER UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_trigger"();



CREATE OR REPLACE TRIGGER "checklist_custom_templates_set_updated_at" BEFORE UPDATE ON "public"."checklist_custom_templates" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_custom_templates_touch_updated_at"();



CREATE OR REPLACE TRIGGER "checklist_establishment_recent_set_updated_at" BEFORE UPDATE ON "public"."checklist_establishment_recent" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_establishment_recent_touch_updated_at"();



CREATE OR REPLACE TRIGGER "checklist_fill_item_photos_block_if_approved_del" BEFORE DELETE ON "public"."checklist_fill_item_photos" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"();



CREATE OR REPLACE TRIGGER "checklist_fill_item_photos_block_if_approved_ins" BEFORE INSERT ON "public"."checklist_fill_item_photos" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"();



CREATE OR REPLACE TRIGGER "checklist_fill_item_photos_block_if_approved_upd" BEFORE UPDATE ON "public"."checklist_fill_item_photos" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"();



CREATE OR REPLACE TRIGGER "checklist_fill_item_responses_block_if_approved_del" BEFORE DELETE ON "public"."checklist_fill_item_responses" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"();



CREATE OR REPLACE TRIGGER "checklist_fill_item_responses_block_if_approved_ins" BEFORE INSERT ON "public"."checklist_fill_item_responses" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"();



CREATE OR REPLACE TRIGGER "checklist_fill_item_responses_block_if_approved_upd" BEFORE UPDATE ON "public"."checklist_fill_item_responses" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"();



CREATE OR REPLACE TRIGGER "checklist_fill_item_responses_set_updated_at" BEFORE UPDATE ON "public"."checklist_fill_item_responses" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_fill_item_responses_touch_updated_at"();



CREATE OR REPLACE TRIGGER "checklist_fill_item_responses_touch_session" AFTER INSERT OR DELETE OR UPDATE ON "public"."checklist_fill_item_responses" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_fill_touch_session_from_response"();



CREATE OR REPLACE TRIGGER "checklist_fill_pdf_exports_set_updated_at" BEFORE UPDATE ON "public"."checklist_fill_pdf_exports" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_fill_pdf_exports_touch_updated_at"();



CREATE OR REPLACE TRIGGER "checklist_fill_sessions_set_updated_at" BEFORE UPDATE ON "public"."checklist_fill_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_fill_sessions_touch_updated_at"();



CREATE OR REPLACE TRIGGER "checklist_workspace_templates_set_updated_at" BEFORE UPDATE ON "public"."checklist_workspace_templates" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_workspace_templates_touch_updated_at"();



CREATE OR REPLACE TRIGGER "client_contracts_set_updated_at" BEFORE UPDATE ON "public"."client_contracts" FOR EACH ROW EXECUTE FUNCTION "public"."client_contracts_touch_updated_at"();



CREATE OR REPLACE TRIGGER "clients_set_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."clients_touch_updated_at"();



CREATE OR REPLACE TRIGGER "clients_validate_responsible_bi" BEFORE INSERT OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."clients_validate_responsible_team_member"();



CREATE OR REPLACE TRIGGER "consent_records_update_at" BEFORE UPDATE ON "public"."consent_records" FOR EACH ROW EXECUTE FUNCTION "public"."consent_records_touch_updated_at"();



CREATE OR REPLACE TRIGGER "consent_records_validate_parental" BEFORE INSERT OR UPDATE ON "public"."consent_records" FOR EACH ROW EXECUTE FUNCTION "public"."validate_parental_consent"();



CREATE OR REPLACE TRIGGER "contract_templates_set_updated_at" BEFORE UPDATE ON "public"."contract_templates" FOR EACH ROW EXECUTE FUNCTION "public"."contract_templates_touch_updated_at"();



CREATE OR REPLACE TRIGGER "degustacao_config_set_updated_at" BEFORE UPDATE ON "public"."degustacao_config" FOR EACH ROW EXECUTE FUNCTION "public"."degustacao_config_touch_updated_at"();



CREATE OR REPLACE TRIGGER "establishment_areas_updated_at_trg" BEFORE UPDATE ON "public"."establishment_areas" FOR EACH ROW EXECUTE FUNCTION "public"."establishment_areas_set_updated_at"();



CREATE OR REPLACE TRIGGER "establishment_compliance_deadlines_set_updated_at" BEFORE UPDATE ON "public"."establishment_compliance_deadlines" FOR EACH ROW EXECUTE FUNCTION "public"."establishment_compliance_deadlines_touch_updated_at"();



CREATE OR REPLACE TRIGGER "establishment_pops_set_updated_at" BEFORE UPDATE ON "public"."establishment_pops" FOR EACH ROW EXECUTE FUNCTION "public"."establishment_pops_touch_updated_at"();



CREATE OR REPLACE TRIGGER "establishments_enforce_pj_client_bi" BEFORE INSERT OR UPDATE ON "public"."establishments" FOR EACH ROW EXECUTE FUNCTION "public"."establishments_enforce_pj_client"();



CREATE OR REPLACE TRIGGER "establishments_set_updated_at" BEFORE UPDATE ON "public"."establishments" FOR EACH ROW EXECUTE FUNCTION "public"."establishments_touch_updated_at"();



CREATE OR REPLACE TRIGGER "ext_access_perm_set_updated_at" BEFORE UPDATE ON "public"."external_access_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."ext_access_perm_touch_updated_at"();



CREATE OR REPLACE TRIGGER "ext_portal_users_set_updated_at" BEFORE UPDATE ON "public"."external_portal_users" FOR EACH ROW EXECUTE FUNCTION "public"."external_portal_users_touch_updated_at"();



CREATE OR REPLACE TRIGGER "financial_charges_set_updated_at" BEFORE UPDATE ON "public"."financial_charges" FOR EACH ROW EXECUTE FUNCTION "public"."financial_charges_touch_updated_at"();



CREATE OR REPLACE TRIGGER "patients_enforce_vinculo_bi" BEFORE INSERT OR UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."patients_enforce_vinculo"();



CREATE OR REPLACE TRIGGER "patients_set_updated_at" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."patients_touch_updated_at"();



CREATE OR REPLACE TRIGGER "patients_validate_responsible_bi" BEFORE INSERT OR UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."patients_validate_responsible_team_member"();



CREATE OR REPLACE TRIGGER "platform_announcements_set_updated_at" BEFORE UPDATE ON "public"."platform_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."platform_announcements_touch_updated_at"();



CREATE OR REPLACE TRIGGER "professional_raw_materials_set_updated_at" BEFORE UPDATE ON "public"."professional_raw_materials" FOR EACH ROW EXECUTE FUNCTION "public"."professional_raw_materials_touch_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_audit_plan_change" AFTER UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."profiles_log_plan_change"();



CREATE OR REPLACE TRIGGER "scheduled_visits_set_updated_at" BEFORE UPDATE ON "public"."scheduled_visits" FOR EACH ROW EXECUTE FUNCTION "public"."scheduled_visits_touch_updated_at"();



CREATE OR REPLACE TRIGGER "subscription_plans_set_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."subscription_plans_touch_updated_at"();



CREATE OR REPLACE TRIGGER "team_members_set_updated_at" BEFORE UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."team_members_touch_updated_at"();



CREATE OR REPLACE TRIGGER "technical_recipes_bi_set_client_id" BEFORE INSERT OR UPDATE OF "establishment_id" ON "public"."technical_recipes" FOR EACH ROW EXECUTE FUNCTION "public"."technical_recipes_set_client_from_establishment"();



CREATE OR REPLACE TRIGGER "technical_recipes_clear_favorites_on_untemplate" AFTER UPDATE OF "is_template" ON "public"."technical_recipes" FOR EACH ROW EXECUTE FUNCTION "public"."technical_recipe_template_favorites_cleanup_on_untemplate"();



CREATE OR REPLACE TRIGGER "technical_recipes_set_updated_at" BEFORE UPDATE ON "public"."technical_recipes" FOR EACH ROW EXECUTE FUNCTION "public"."technical_recipes_touch_updated_at"();



CREATE OR REPLACE TRIGGER "tenant_feature_overrides_set_updated_at" BEFORE UPDATE ON "public"."tenant_feature_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."tenant_feature_overrides_touch_updated_at"();



ALTER TABLE ONLY "public"."admin_impersonation_log"
    ADD CONSTRAINT "admin_impersonation_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_impersonation_log"
    ADD CONSTRAINT "admin_impersonation_log_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_tenant_notes"
    ADD CONSTRAINT "admin_tenant_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_tenant_notes"
    ADD CONSTRAINT "admin_tenant_notes_tenant_user_id_fkey" FOREIGN KEY ("tenant_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_tokens"
    ADD CONSTRAINT "api_tokens_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auth_troubleshooting_logs"
    ADD CONSTRAINT "auth_troubleshooting_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checklist_custom_items"
    ADD CONSTRAINT "checklist_custom_items_custom_section_id_fkey" FOREIGN KEY ("custom_section_id") REFERENCES "public"."checklist_custom_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_custom_sections"
    ADD CONSTRAINT "checklist_custom_sections_custom_template_id_fkey" FOREIGN KEY ("custom_template_id") REFERENCES "public"."checklist_custom_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_custom_templates"
    ADD CONSTRAINT "checklist_custom_templates_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_custom_templates"
    ADD CONSTRAINT "checklist_custom_templates_source_template_id_fkey" FOREIGN KEY ("source_template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."checklist_custom_templates"
    ADD CONSTRAINT "checklist_custom_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_establishment_recent"
    ADD CONSTRAINT "checklist_establishment_recent_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_establishment_recent"
    ADD CONSTRAINT "checklist_establishment_recent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_item_photos"
    ADD CONSTRAINT "checklist_fill_item_photos_custom_item_id_fkey" FOREIGN KEY ("custom_item_id") REFERENCES "public"."checklist_custom_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_item_photos"
    ADD CONSTRAINT "checklist_fill_item_photos_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."checklist_fill_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_item_photos"
    ADD CONSTRAINT "checklist_fill_item_photos_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "public"."checklist_template_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_item_photos"
    ADD CONSTRAINT "checklist_fill_item_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_item_photos"
    ADD CONSTRAINT "checklist_fill_item_photos_workspace_item_id_fkey" FOREIGN KEY ("workspace_item_id") REFERENCES "public"."checklist_workspace_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_item_responses"
    ADD CONSTRAINT "checklist_fill_item_responses_custom_item_id_fkey" FOREIGN KEY ("custom_item_id") REFERENCES "public"."checklist_custom_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_item_responses"
    ADD CONSTRAINT "checklist_fill_item_responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."checklist_fill_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_item_responses"
    ADD CONSTRAINT "checklist_fill_item_responses_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "public"."checklist_template_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_item_responses"
    ADD CONSTRAINT "checklist_fill_item_responses_workspace_item_id_fkey" FOREIGN KEY ("workspace_item_id") REFERENCES "public"."checklist_workspace_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_pdf_exports"
    ADD CONSTRAINT "checklist_fill_pdf_exports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."checklist_fill_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_pdf_exports"
    ADD CONSTRAINT "checklist_fill_pdf_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_session_reopen_events"
    ADD CONSTRAINT "checklist_fill_session_reopen_events_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_session_reopen_events"
    ADD CONSTRAINT "checklist_fill_session_reopen_events_reopened_by_user_id_fkey" FOREIGN KEY ("reopened_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."checklist_fill_session_reopen_events"
    ADD CONSTRAINT "checklist_fill_session_reopen_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."checklist_fill_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_sessions"
    ADD CONSTRAINT "checklist_fill_sessions_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."establishment_areas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checklist_fill_sessions"
    ADD CONSTRAINT "checklist_fill_sessions_custom_template_id_fkey" FOREIGN KEY ("custom_template_id") REFERENCES "public"."checklist_custom_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."checklist_fill_sessions"
    ADD CONSTRAINT "checklist_fill_sessions_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_sessions"
    ADD CONSTRAINT "checklist_fill_sessions_scheduled_visit_id_fkey" FOREIGN KEY ("scheduled_visit_id") REFERENCES "public"."scheduled_visits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checklist_fill_sessions"
    ADD CONSTRAINT "checklist_fill_sessions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."checklist_fill_sessions"
    ADD CONSTRAINT "checklist_fill_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_fill_sessions"
    ADD CONSTRAINT "checklist_fill_sessions_workspace_template_id_fkey" FOREIGN KEY ("workspace_template_id") REFERENCES "public"."checklist_workspace_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."checklist_template_items"
    ADD CONSTRAINT "checklist_template_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."checklist_template_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_template_sections"
    ADD CONSTRAINT "checklist_template_sections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_workspace_items"
    ADD CONSTRAINT "checklist_workspace_items_workspace_section_id_fkey" FOREIGN KEY ("workspace_section_id") REFERENCES "public"."checklist_workspace_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_workspace_sections"
    ADD CONSTRAINT "checklist_workspace_sections_workspace_template_id_fkey" FOREIGN KEY ("workspace_template_id") REFERENCES "public"."checklist_workspace_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_workspace_templates"
    ADD CONSTRAINT "checklist_workspace_templates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."checklist_workspace_templates"
    ADD CONSTRAINT "checklist_workspace_templates_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_contracts"
    ADD CONSTRAINT "client_contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_contracts"
    ADD CONSTRAINT "client_contracts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_custom_segments"
    ADD CONSTRAINT "client_custom_segments_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_exam_documents"
    ADD CONSTRAINT "client_exam_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_responsible_team_member_id_fkey" FOREIGN KEY ("responsible_team_member_id") REFERENCES "public"."team_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consent_records"
    ADD CONSTRAINT "consent_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consent_records"
    ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."degustacao_config"
    ADD CONSTRAINT "degustacao_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."establishment_areas"
    ADD CONSTRAINT "establishment_areas_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_areas"
    ADD CONSTRAINT "establishment_areas_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_compliance_deadlines"
    ADD CONSTRAINT "establishment_compliance_deadlines_checklist_template_id_fkey" FOREIGN KEY ("checklist_template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."establishment_compliance_deadlines"
    ADD CONSTRAINT "establishment_compliance_deadlines_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_pops"
    ADD CONSTRAINT "establishment_pops_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."establishment_pops"
    ADD CONSTRAINT "establishment_pops_source_template_id_fkey" FOREIGN KEY ("source_template_id") REFERENCES "public"."pop_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."establishments"
    ADD CONSTRAINT "establishments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_access_permissions"
    ADD CONSTRAINT "external_access_permissions_external_user_id_fkey" FOREIGN KEY ("external_user_id") REFERENCES "public"."external_portal_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_access_permissions"
    ADD CONSTRAINT "external_access_permissions_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_access_permissions"
    ADD CONSTRAINT "external_access_permissions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_portal_users"
    ADD CONSTRAINT "external_portal_users_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_portal_users"
    ADD CONSTRAINT "external_portal_users_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_charges"
    ADD CONSTRAINT "financial_charges_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_charges"
    ADD CONSTRAINT "financial_charges_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_adult_nutrition_assessments"
    ADD CONSTRAINT "patient_adult_nutrition_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_geriatric_assessments"
    ADD CONSTRAINT "patient_geriatric_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_nutrition_assessments"
    ADD CONSTRAINT "patient_nutrition_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_parental_consents"
    ADD CONSTRAINT "patient_parental_consents_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_parental_consents"
    ADD CONSTRAINT "patient_parental_consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_responsible_team_member_id_fkey" FOREIGN KEY ("responsible_team_member_id") REFERENCES "public"."team_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_announcements"
    ADD CONSTRAINT "platform_announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pop_versions"
    ADD CONSTRAINT "pop_versions_pop_id_fkey" FOREIGN KEY ("pop_id") REFERENCES "public"."establishment_pops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_raw_materials"
    ADD CONSTRAINT "professional_raw_materials_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_lgpd_blocked_by_fkey" FOREIGN KEY ("lgpd_blocked_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_lgpd_unblocked_by_fkey" FOREIGN KEY ("lgpd_unblocked_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_visits"
    ADD CONSTRAINT "scheduled_visits_assigned_team_member_id_fkey" FOREIGN KEY ("assigned_team_member_id") REFERENCES "public"."team_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scheduled_visits"
    ADD CONSTRAINT "scheduled_visits_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."scheduled_visits"
    ADD CONSTRAINT "scheduled_visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."scheduled_visits"
    ADD CONSTRAINT "scheduled_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_tenant_user_id_fkey" FOREIGN KEY ("tenant_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."technical_recipe_lines"
    ADD CONSTRAINT "technical_recipe_lines_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "public"."professional_raw_materials"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."technical_recipe_lines"
    ADD CONSTRAINT "technical_recipe_lines_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."technical_recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."technical_recipe_lines"
    ADD CONSTRAINT "technical_recipe_lines_taco_food_id_fkey" FOREIGN KEY ("taco_food_id") REFERENCES "public"."taco_reference_foods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."technical_recipe_template_favorites"
    ADD CONSTRAINT "technical_recipe_template_favorites_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."technical_recipe_template_favorites"
    ADD CONSTRAINT "technical_recipe_template_favorites_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."technical_recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."technical_recipes"
    ADD CONSTRAINT "technical_recipes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."technical_recipes"
    ADD CONSTRAINT "technical_recipes_establishment_id_fkey" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."technical_recipes"
    ADD CONSTRAINT "technical_recipes_repository_origin_id_fkey" FOREIGN KEY ("repository_origin_id") REFERENCES "public"."technical_recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenant_feature_overrides"
    ADD CONSTRAINT "tenant_feature_overrides_tenant_user_id_fkey" FOREIGN KEY ("tenant_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_feature_overrides"
    ADD CONSTRAINT "tenant_feature_overrides_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE "public"."admin_impersonation_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_impersonation_log_insert_super_admin" ON "public"."admin_impersonation_log" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "admin_impersonation_log_select_super_admin" ON "public"."admin_impersonation_log" FOR SELECT TO "authenticated" USING ("public"."is_super_admin"());



ALTER TABLE "public"."admin_tenant_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_tenant_notes_super_admin_only" ON "public"."admin_tenant_notes" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



ALTER TABLE "public"."api_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "api_tokens_insert_own" ON "public"."api_tokens" FOR INSERT TO "authenticated" WITH CHECK ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_super_admin"()));



CREATE POLICY "api_tokens_select_own_or_admin" ON "public"."api_tokens" FOR SELECT TO "authenticated" USING ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_super_admin"()));



CREATE POLICY "api_tokens_update_own_or_admin" ON "public"."api_tokens" FOR UPDATE TO "authenticated" USING ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_super_admin"())) WITH CHECK ((("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_super_admin"()));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_select_own" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "audit_log_select_workspace" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "audit_log_update_status" ON "public"."audit_log" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'active'::"text"))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'expired'::"text")));



ALTER TABLE "public"."auth_troubleshooting_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist_custom_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_custom_items_own" ON "public"."checklist_custom_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."checklist_custom_sections" "s"
     JOIN "public"."checklist_custom_templates" "t" ON (("t"."id" = "s"."custom_template_id")))
  WHERE (("s"."id" = "checklist_custom_items"."custom_section_id") AND ("t"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."checklist_custom_sections" "s"
     JOIN "public"."checklist_custom_templates" "t" ON (("t"."id" = "s"."custom_template_id")))
  WHERE (("s"."id" = "checklist_custom_items"."custom_section_id") AND ("t"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))))));



ALTER TABLE "public"."checklist_custom_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_custom_sections_own" ON "public"."checklist_custom_sections" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."checklist_custom_templates" "t"
  WHERE (("t"."id" = "checklist_custom_sections"."custom_template_id") AND ("t"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."checklist_custom_templates" "t"
  WHERE (("t"."id" = "checklist_custom_sections"."custom_template_id") AND ("t"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))))));



ALTER TABLE "public"."checklist_custom_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_custom_templates_own" ON "public"."checklist_custom_templates" TO "authenticated" USING (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))) WITH CHECK (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")));



ALTER TABLE "public"."checklist_establishment_recent" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_establishment_recent_delete_own" ON "public"."checklist_establishment_recent" FOR DELETE TO "authenticated" USING (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")));



CREATE POLICY "checklist_establishment_recent_insert_own" ON "public"."checklist_establishment_recent" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")) AND (EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "checklist_establishment_recent"."establishment_id") AND ("c"."owner_user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")) AND ("c"."kind" = 'pj'::"text"))))));



CREATE POLICY "checklist_establishment_recent_select_own" ON "public"."checklist_establishment_recent" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")));



CREATE POLICY "checklist_establishment_recent_update_own" ON "public"."checklist_establishment_recent" FOR UPDATE TO "authenticated" USING (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))) WITH CHECK ((("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")) AND (EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "checklist_establishment_recent"."establishment_id") AND ("c"."owner_user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")) AND ("c"."kind" = 'pj'::"text"))))));



ALTER TABLE "public"."checklist_fill_item_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_fill_item_photos_delete_own" ON "public"."checklist_fill_item_photos" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."checklist_fill_sessions" "s"
  WHERE (("s"."id" = "checklist_fill_item_photos"."session_id") AND ("s"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))))));



CREATE POLICY "checklist_fill_item_photos_insert_own" ON "public"."checklist_fill_item_photos" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")) AND (EXISTS ( SELECT 1
   FROM "public"."checklist_fill_sessions" "s"
  WHERE (("s"."id" = "checklist_fill_item_photos"."session_id") AND ("s"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")))))));



CREATE POLICY "checklist_fill_item_photos_select_own" ON "public"."checklist_fill_item_photos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."checklist_fill_sessions" "s"
  WHERE (("s"."id" = "checklist_fill_item_photos"."session_id") AND ("s"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))))));



ALTER TABLE "public"."checklist_fill_item_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_fill_item_responses_delete_own" ON "public"."checklist_fill_item_responses" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."checklist_fill_sessions" "s"
  WHERE (("s"."id" = "checklist_fill_item_responses"."session_id") AND ("s"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))))));



CREATE POLICY "checklist_fill_item_responses_insert_own" ON "public"."checklist_fill_item_responses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."checklist_fill_sessions" "s"
  WHERE (("s"."id" = "checklist_fill_item_responses"."session_id") AND ("s"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))))));



CREATE POLICY "checklist_fill_item_responses_select_own" ON "public"."checklist_fill_item_responses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."checklist_fill_sessions" "s"
  WHERE (("s"."id" = "checklist_fill_item_responses"."session_id") AND ("s"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))))));



CREATE POLICY "checklist_fill_item_responses_update_own" ON "public"."checklist_fill_item_responses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."checklist_fill_sessions" "s"
  WHERE (("s"."id" = "checklist_fill_item_responses"."session_id") AND ("s"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."checklist_fill_sessions" "s"
  WHERE (("s"."id" = "checklist_fill_item_responses"."session_id") AND ("s"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))))));



ALTER TABLE "public"."checklist_fill_pdf_exports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_fill_pdf_exports_insert_own" ON "public"."checklist_fill_pdf_exports" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")) AND (EXISTS ( SELECT 1
   FROM "public"."checklist_fill_sessions" "s"
  WHERE (("s"."id" = "checklist_fill_pdf_exports"."session_id") AND ("s"."user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")))))));



CREATE POLICY "checklist_fill_pdf_exports_select_own" ON "public"."checklist_fill_pdf_exports" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")));



CREATE POLICY "checklist_fill_pdf_exports_update_own" ON "public"."checklist_fill_pdf_exports" FOR UPDATE TO "authenticated" USING (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))) WITH CHECK (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")));



ALTER TABLE "public"."checklist_fill_session_reopen_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_fill_session_reopen_events_insert_workspace" ON "public"."checklist_fill_session_reopen_events" FOR INSERT TO "authenticated" WITH CHECK ((("reopened_by_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (EXISTS ( SELECT 1
   FROM (("public"."checklist_fill_sessions" "s"
     JOIN "public"."establishments" "e" ON (("e"."id" = "s"."establishment_id")))
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("s"."id" = "checklist_fill_session_reopen_events"."session_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))) AND ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("tm"."member_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."job_role" = 'gestao'::"text")))))));



CREATE POLICY "checklist_fill_session_reopen_events_select_workspace" ON "public"."checklist_fill_session_reopen_events" FOR SELECT TO "authenticated" USING ((("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) OR ("reopened_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."checklist_fill_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_fill_sessions_delete_own" ON "public"."checklist_fill_sessions" FOR DELETE TO "authenticated" USING (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")));



CREATE POLICY "checklist_fill_sessions_insert_own" ON "public"."checklist_fill_sessions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")));



CREATE POLICY "checklist_fill_sessions_select_establishment_owner" ON "public"."checklist_fill_sessions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "est"
     JOIN "public"."clients" "cl" ON (("cl"."id" = "est"."client_id")))
  WHERE (("est"."id" = "checklist_fill_sessions"."establishment_id") AND ("cl"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "checklist_fill_sessions_select_own" ON "public"."checklist_fill_sessions" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")));



CREATE POLICY "checklist_fill_sessions_update_own" ON "public"."checklist_fill_sessions" FOR UPDATE TO "authenticated" USING (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids"))) WITH CHECK (("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")));



ALTER TABLE "public"."checklist_template_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_template_items_select_authenticated" ON "public"."checklist_template_items" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."checklist_template_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_template_sections_select_authenticated" ON "public"."checklist_template_sections" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."checklist_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_templates_select_authenticated" ON "public"."checklist_templates" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."checklist_workspace_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_workspace_items_all" ON "public"."checklist_workspace_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."checklist_workspace_sections" "s"
     JOIN "public"."checklist_workspace_templates" "t" ON (("t"."id" = "s"."workspace_template_id")))
  WHERE (("s"."id" = "checklist_workspace_items"."workspace_section_id") AND ("t"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."checklist_workspace_sections" "s"
     JOIN "public"."checklist_workspace_templates" "t" ON (("t"."id" = "s"."workspace_template_id")))
  WHERE (("s"."id" = "checklist_workspace_items"."workspace_section_id") AND ("t"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



ALTER TABLE "public"."checklist_workspace_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_workspace_sections_all" ON "public"."checklist_workspace_sections" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."checklist_workspace_templates" "t"
  WHERE (("t"."id" = "checklist_workspace_sections"."workspace_template_id") AND ("t"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."checklist_workspace_templates" "t"
  WHERE (("t"."id" = "checklist_workspace_sections"."workspace_template_id") AND ("t"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



ALTER TABLE "public"."checklist_workspace_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_workspace_templates_delete" ON "public"."checklist_workspace_templates" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "checklist_workspace_templates_insert" ON "public"."checklist_workspace_templates" FOR INSERT TO "authenticated" WITH CHECK ((("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("created_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "checklist_workspace_templates_select" ON "public"."checklist_workspace_templates" FOR SELECT TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "checklist_workspace_templates_update" ON "public"."checklist_workspace_templates" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))) WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



ALTER TABLE "public"."client_contracts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_contracts_delete_own" ON "public"."client_contracts" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "client_contracts_insert_own" ON "public"."client_contracts" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "client_contracts_select_own" ON "public"."client_contracts" FOR SELECT TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "client_contracts_update_own" ON "public"."client_contracts" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))) WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



ALTER TABLE "public"."client_custom_segments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_custom_segments_workspace" ON "public"."client_custom_segments" TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))) WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



ALTER TABLE "public"."client_exam_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_exam_documents_delete_own" ON "public"."client_exam_documents" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_exam_documents"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "client_exam_documents_insert_own" ON "public"."client_exam_documents" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_exam_documents"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "client_exam_documents_select_own" ON "public"."client_exam_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_exam_documents"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_delete_own" ON "public"."clients" FOR DELETE TO "authenticated" USING ((("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))));



CREATE POLICY "clients_insert_own" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK ((("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "clients_select_admin" ON "public"."clients" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "pr"
  WHERE (("pr"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pr"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "clients_select_own" ON "public"."clients" FOR SELECT TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "clients_update_own" ON "public"."clients" FOR UPDATE TO "authenticated" USING ((("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))) WITH CHECK ((("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))));



CREATE POLICY "consent_insert_own" ON "public"."consent_records" FOR INSERT TO "authenticated" WITH CHECK (((NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE (("p"."id" = "consent_records"."patient_id") AND ("p"."user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))));



ALTER TABLE "public"."consent_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consent_select_own" ON "public"."consent_records" FOR SELECT TO "authenticated" USING (((NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE (("p"."id" = "consent_records"."patient_id") AND ("p"."user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))));



CREATE POLICY "consent_update_own" ON "public"."consent_records" FOR UPDATE TO "authenticated" USING (((NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND ("status" = 'active'::"public"."consent_status") AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE (("p"."id" = "consent_records"."patient_id") AND ("p"."user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))))) WITH CHECK (((NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (("status" = 'active'::"public"."consent_status") OR ("status" = 'revogado'::"public"."consent_status")) AND (EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE (("p"."id" = "consent_records"."patient_id") AND ("p"."user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))));



ALTER TABLE "public"."contract_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contract_templates_delete_own" ON "public"."contract_templates" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "contract_templates_insert_own" ON "public"."contract_templates" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "contract_templates_select_authenticated" ON "public"."contract_templates" FOR SELECT TO "authenticated" USING ((("owner_user_id" IS NULL) OR ("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))));



CREATE POLICY "contract_templates_update_own" ON "public"."contract_templates" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))) WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



ALTER TABLE "public"."degustacao_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "degustacao_config_manage_super_admin" ON "public"."degustacao_config" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "degustacao_config_select_authenticated" ON "public"."degustacao_config" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."establishment_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "establishment_areas_delete_own" ON "public"."establishment_areas" FOR DELETE TO "authenticated" USING (((NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_areas"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))));



CREATE POLICY "establishment_areas_insert_own" ON "public"."establishment_areas" FOR INSERT TO "authenticated" WITH CHECK (((NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND ("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_areas"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text"))))));



CREATE POLICY "establishment_areas_select_own" ON "public"."establishment_areas" FOR SELECT TO "authenticated" USING (((NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_areas"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))));



CREATE POLICY "establishment_areas_update_own" ON "public"."establishment_areas" FOR UPDATE TO "authenticated" USING (((NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_areas"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))))) WITH CHECK (((NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND ("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_areas"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text"))))));



ALTER TABLE "public"."establishment_compliance_deadlines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "establishment_compliance_deadlines_delete_own" ON "public"."establishment_compliance_deadlines" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_compliance_deadlines"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "establishment_compliance_deadlines_insert_own" ON "public"."establishment_compliance_deadlines" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_compliance_deadlines"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))));



CREATE POLICY "establishment_compliance_deadlines_select_own" ON "public"."establishment_compliance_deadlines" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_compliance_deadlines"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "establishment_compliance_deadlines_update_own" ON "public"."establishment_compliance_deadlines" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_compliance_deadlines"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_compliance_deadlines"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))));



ALTER TABLE "public"."establishment_pops" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "establishment_pops_delete_own" ON "public"."establishment_pops" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_pops"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "establishment_pops_insert_own" ON "public"."establishment_pops" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_pops"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))));



CREATE POLICY "establishment_pops_select_own" ON "public"."establishment_pops" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_pops"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "establishment_pops_update_own" ON "public"."establishment_pops" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_pops"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "establishment_pops"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))));



ALTER TABLE "public"."establishments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "establishments_delete_own" ON "public"."establishments" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "establishments"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))) AND (( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))));



CREATE POLICY "establishments_insert_own" ON "public"."establishments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "establishments"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))));



CREATE POLICY "establishments_select_own" ON "public"."establishments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "establishments"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "establishments_update_own" ON "public"."establishments" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "establishments"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))) AND (( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "establishments"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))) AND (( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))));



CREATE POLICY "ext_access_perm_delete_own" ON "public"."external_access_permissions" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "ext_access_perm_insert_own" ON "public"."external_access_permissions" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "ext_access_perm_select_own" ON "public"."external_access_permissions" FOR SELECT TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "ext_access_perm_update_own" ON "public"."external_access_permissions" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))) WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "ext_portal_users_delete_own" ON "public"."external_portal_users" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "ext_portal_users_insert_own" ON "public"."external_portal_users" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "ext_portal_users_select_own" ON "public"."external_portal_users" FOR SELECT TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "ext_portal_users_update_own" ON "public"."external_portal_users" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))) WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



ALTER TABLE "public"."external_access_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."external_portal_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_charges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_charges_delete_own" ON "public"."financial_charges" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "financial_charges_insert_own" ON "public"."financial_charges" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "financial_charges_select_own" ON "public"."financial_charges" FOR SELECT TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "financial_charges_update_own" ON "public"."financial_charges" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))) WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "owner via patient chain" ON "public"."patient_geriatric_assessments" USING (("patient_id" IN ( SELECT "p"."id"
   FROM "public"."patients" "p"
  WHERE ("p"."user_id" = ( SELECT "public"."workspace_account_owner_id"())))));



CREATE POLICY "owner via patient chain adult nutrition" ON "public"."patient_adult_nutrition_assessments" USING (("patient_id" IN ( SELECT "p"."id"
   FROM "public"."patients" "p"
  WHERE ("p"."user_id" = ( SELECT "public"."workspace_account_owner_id"())))));



ALTER TABLE "public"."patient_adult_nutrition_assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_consents_insert_own" ON "public"."patient_parental_consents" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "patient_consents_select_own" ON "public"."patient_parental_consents" FOR SELECT TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "patient_consents_update_own" ON "public"."patient_parental_consents" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))) WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



ALTER TABLE "public"."patient_geriatric_assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_naa_insert_own" ON "public"."patient_nutrition_assessments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE (("p"."id" = "patient_nutrition_assessments"."patient_id") AND ("p"."user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "patient_naa_select_own" ON "public"."patient_nutrition_assessments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."patients" "p"
  WHERE (("p"."id" = "patient_nutrition_assessments"."patient_id") AND ("p"."user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



ALTER TABLE "public"."patient_nutrition_assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_parental_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patients_delete_own" ON "public"."patients" FOR DELETE TO "authenticated" USING ((("user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))));



CREATE POLICY "patients_insert_own" ON "public"."patients" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "patients_select_admin" ON "public"."patients" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "pr"
  WHERE (("pr"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pr"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "patients_select_own" ON "public"."patients" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "patients_update_own" ON "public"."patients" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))) WITH CHECK ((("user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))));



ALTER TABLE "public"."platform_announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_announcements_manage_super_admin" ON "public"."platform_announcements" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "platform_announcements_select_active" ON "public"."platform_announcements" FOR SELECT TO "authenticated" USING ((("active_from" <= "now"()) AND (("active_until" IS NULL) OR ("active_until" > "now"()))));



ALTER TABLE "public"."pop_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pop_templates_select_authenticated" ON "public"."pop_templates" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."pop_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pop_versions_insert_own" ON "public"."pop_versions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."establishment_pops" "p"
     JOIN "public"."establishments" "e" ON (("e"."id" = "p"."establishment_id")))
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("p"."id" = "pop_versions"."pop_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))));



CREATE POLICY "pop_versions_select_own" ON "public"."pop_versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."establishment_pops" "p"
     JOIN "public"."establishments" "e" ON (("e"."id" = "p"."establishment_id")))
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("p"."id" = "pop_versions"."pop_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



ALTER TABLE "public"."professional_raw_materials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professional_raw_materials_delete_own" ON "public"."professional_raw_materials" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "professional_raw_materials_insert_own" ON "public"."professional_raw_materials" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "professional_raw_materials_select_own" ON "public"."professional_raw_materials" FOR SELECT TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "professional_raw_materials_update_own" ON "public"."professional_raw_materials" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))) WITH CHECK (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."scheduled_visits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scheduled_visits_delete_own" ON "public"."scheduled_visits" FOR DELETE TO "authenticated" USING ((("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "scheduled_visits_insert_own" ON "public"."scheduled_visits" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (("assigned_team_member_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."id" = "scheduled_visits"."assigned_team_member_id") AND ("tm"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))) AND ((("target_type" = 'establishment'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "scheduled_visits"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))) OR (("target_type" = 'patient'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."clients" "c" ON (("c"."id" = "p"."client_id")))
  WHERE (("p"."id" = "scheduled_visits"."patient_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))))));



CREATE POLICY "scheduled_visits_select_admin" ON "public"."scheduled_visits" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "pr"
  WHERE (("pr"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pr"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "scheduled_visits_select_own" ON "public"."scheduled_visits" FOR SELECT TO "authenticated" USING ((("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "scheduled_visits_update_own" ON "public"."scheduled_visits" FOR UPDATE TO "authenticated" USING ((("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK ((("user_id" IN ( SELECT "public"."workspace_member_user_ids"() AS "workspace_member_user_ids")) AND (NOT "public"."profile_lgpd_is_actively_blocked"(( SELECT "auth"."uid"() AS "uid"))) AND (("assigned_team_member_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."id" = "scheduled_visits"."assigned_team_member_id") AND ("tm"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))) AND ((("target_type" = 'establishment'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."establishments" "e"
     JOIN "public"."clients" "c" ON (("c"."id" = "e"."client_id")))
  WHERE (("e"."id" = "scheduled_visits"."establishment_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))) OR (("target_type" = 'patient'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."clients" "c" ON (("c"."id" = "p"."client_id")))
  WHERE (("p"."id" = "scheduled_visits"."patient_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))))));



ALTER TABLE "public"."subscription_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_events_insert_super_admin" ON "public"."subscription_events" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "subscription_events_select_own_or_admin" ON "public"."subscription_events" FOR SELECT TO "authenticated" USING ((("tenant_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_super_admin"()));



ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_plans_select_all" ON "public"."subscription_plans" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."taco_reference_foods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "taco_reference_foods_delete_admin" ON "public"."taco_reference_foods" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "taco_reference_foods_insert_admin" ON "public"."taco_reference_foods" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "taco_reference_foods_select_authenticated" ON "public"."taco_reference_foods" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "taco_reference_foods_update_admin" ON "public"."taco_reference_foods" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members_delete_own" ON "public"."team_members" FOR DELETE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "team_members_delete_workspace_managers" ON "public"."team_members" FOR DELETE TO "authenticated" USING ((("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "pr"
  WHERE (("pr"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pr"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))))));



CREATE POLICY "team_members_insert_own" ON "public"."team_members" FOR INSERT TO "authenticated" WITH CHECK (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "team_members_select_own" ON "public"."team_members" FOR SELECT TO "authenticated" USING (("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")));



CREATE POLICY "team_members_update_own" ON "public"."team_members" FOR UPDATE TO "authenticated" USING (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "team_members_update_self_profile_sync" ON "public"."team_members" FOR UPDATE TO "authenticated" USING ((("member_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))) WITH CHECK ((("member_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))));






ALTER TABLE "public"."technical_recipe_lines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "technical_recipe_lines_delete_own" ON "public"."technical_recipe_lines" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."technical_recipes" "r"
     JOIN "public"."clients" "c" ON (("c"."id" = "r"."client_id")))
  WHERE (("r"."id" = "technical_recipe_lines"."recipe_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "technical_recipe_lines_insert_own" ON "public"."technical_recipe_lines" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."technical_recipes" "r"
     JOIN "public"."clients" "c" ON (("c"."id" = "r"."client_id")))
  WHERE (("r"."id" = "technical_recipe_lines"."recipe_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))));



CREATE POLICY "technical_recipe_lines_select_own" ON "public"."technical_recipe_lines" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."technical_recipes" "r"
     JOIN "public"."clients" "c" ON (("c"."id" = "r"."client_id")))
  WHERE (("r"."id" = "technical_recipe_lines"."recipe_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "technical_recipe_lines_update_own" ON "public"."technical_recipe_lines" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."technical_recipes" "r"
     JOIN "public"."clients" "c" ON (("c"."id" = "r"."client_id")))
  WHERE (("r"."id" = "technical_recipe_lines"."recipe_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."technical_recipes" "r"
     JOIN "public"."clients" "c" ON (("c"."id" = "r"."client_id")))
  WHERE (("r"."id" = "technical_recipe_lines"."recipe_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))));



ALTER TABLE "public"."technical_recipe_template_favorites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "technical_recipe_template_favorites_delete_own" ON "public"."technical_recipe_template_favorites" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "technical_recipe_template_favorites"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "technical_recipe_template_favorites_insert_own" ON "public"."technical_recipe_template_favorites" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "technical_recipe_template_favorites"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))) AND (EXISTS ( SELECT 1
   FROM "public"."technical_recipes" "r"
  WHERE (("r"."id" = "technical_recipe_template_favorites"."recipe_id") AND ("r"."is_template" = true) AND ("r"."client_id" = "technical_recipe_template_favorites"."client_id"))))));



CREATE POLICY "technical_recipe_template_favorites_select_own" ON "public"."technical_recipe_template_favorites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "technical_recipe_template_favorites"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



ALTER TABLE "public"."technical_recipes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "technical_recipes_delete_own" ON "public"."technical_recipes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "technical_recipes"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "technical_recipes_insert_own" ON "public"."technical_recipes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "technical_recipes"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))));



CREATE POLICY "technical_recipes_select_own" ON "public"."technical_recipes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "technical_recipes"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id"))))));



CREATE POLICY "technical_recipes_update_own" ON "public"."technical_recipes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "technical_recipes"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "technical_recipes"."client_id") AND ("c"."owner_user_id" = ( SELECT "public"."workspace_account_owner_id"() AS "workspace_account_owner_id")) AND ("c"."kind" = 'pj'::"text")))));



ALTER TABLE "public"."tenant_feature_overrides" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_feature_overrides_manage_super_admin" ON "public"."tenant_feature_overrides" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "tenant_feature_overrides_select_own" ON "public"."tenant_feature_overrides" FOR SELECT TO "authenticated" USING ((("tenant_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_super_admin"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."admin_tenant_notes_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_tenant_notes_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_tenant_notes_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_degustacao_overrides"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_degustacao_overrides"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_degustacao_overrides"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_clients_ad"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_clients_ad"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_clients_ad"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_clients_ai"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_clients_ai"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_clients_ai"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_clients_au"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_clients_au"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_clients_au"() TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_clients_row_json"("c" "public"."clients") TO "anon";
GRANT ALL ON FUNCTION "public"."audit_clients_row_json"("c" "public"."clients") TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_clients_row_json"("c" "public"."clients") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_consent_records_ai"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_consent_records_ai"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_consent_records_ai"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_consent_records_au"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_consent_records_au"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_consent_records_au"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_log_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_log_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_log_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_and_store_session_score"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_and_store_session_score"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_and_store_session_score"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."checklist_custom_templates_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."checklist_custom_templates_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."checklist_custom_templates_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."checklist_establishment_recent_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."checklist_establishment_recent_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."checklist_establishment_recent_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."checklist_fill_block_mutations_if_dossier_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."checklist_fill_item_responses_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."checklist_fill_item_responses_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."checklist_fill_item_responses_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."checklist_fill_pdf_exports_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."checklist_fill_pdf_exports_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."checklist_fill_pdf_exports_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."checklist_fill_sessions_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."checklist_fill_sessions_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."checklist_fill_sessions_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."checklist_fill_touch_session_from_response"() TO "anon";
GRANT ALL ON FUNCTION "public"."checklist_fill_touch_session_from_response"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."checklist_fill_touch_session_from_response"() TO "service_role";



GRANT ALL ON FUNCTION "public"."checklist_workspace_templates_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."checklist_workspace_templates_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."checklist_workspace_templates_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."client_contracts_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."client_contracts_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."client_contracts_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clients_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."clients_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clients_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clients_validate_responsible_team_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."clients_validate_responsible_team_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clients_validate_responsible_team_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."consent_records_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."consent_records_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."consent_records_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."contract_templates_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."contract_templates_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."contract_templates_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."degustacao_config_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."degustacao_config_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."degustacao_config_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."end_impersonation_session"("p_log_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."end_impersonation_session"("p_log_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_impersonation_session"("p_log_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."establishment_areas_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."establishment_areas_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."establishment_areas_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."establishment_compliance_deadlines_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."establishment_compliance_deadlines_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."establishment_compliance_deadlines_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."establishment_pops_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."establishment_pops_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."establishment_pops_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."establishments_enforce_pj_client"() TO "anon";
GRANT ALL ON FUNCTION "public"."establishments_enforce_pj_client"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."establishments_enforce_pj_client"() TO "service_role";



GRANT ALL ON FUNCTION "public"."establishments_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."establishments_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."establishments_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ext_access_perm_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."ext_access_perm_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ext_access_perm_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."external_portal_users_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."external_portal_users_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."external_portal_users_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."financial_charges_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."financial_charges_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."financial_charges_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lgpd_admin_unblock_profile"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."lgpd_admin_unblock_profile"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lgpd_admin_unblock_profile"("p_profile_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."lgpd_audit_event"("p_subject_user_id" "uuid", "p_profile_id" "uuid", "p_event" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lgpd_audit_event"("p_subject_user_id" "uuid", "p_profile_id" "uuid", "p_event" "text", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."lgpd_audit_event"("p_subject_user_id" "uuid", "p_profile_id" "uuid", "p_event" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lgpd_audit_event"("p_subject_user_id" "uuid", "p_profile_id" "uuid", "p_event" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."lgpd_cancel_pending_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lgpd_cancel_pending_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lgpd_cancel_pending_by_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."lgpd_cancel_pending_closure"() TO "anon";
GRANT ALL ON FUNCTION "public"."lgpd_cancel_pending_closure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lgpd_cancel_pending_closure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lgpd_confirm_closure"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lgpd_confirm_closure"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lgpd_confirm_closure"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."lgpd_set_pending_closure"("p_token_hash" "text", "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."lgpd_set_pending_closure"("p_token_hash" "text", "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lgpd_set_pending_closure"("p_token_hash" "text", "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."mask_sensitive_fields"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."mask_sensitive_fields"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mask_sensitive_fields"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."patients_enforce_vinculo"() TO "anon";
GRANT ALL ON FUNCTION "public"."patients_enforce_vinculo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."patients_enforce_vinculo"() TO "service_role";



GRANT ALL ON FUNCTION "public"."patients_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."patients_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."patients_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."patients_validate_responsible_team_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."patients_validate_responsible_team_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."patients_validate_responsible_team_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."platform_announcements_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."platform_announcements_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_announcements_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."professional_raw_materials_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."professional_raw_materials_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."professional_raw_materials_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."profile_lgpd_is_actively_blocked"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."profile_lgpd_is_actively_blocked"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."profile_lgpd_is_actively_blocked"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."profiles_log_plan_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."profiles_log_plan_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."profiles_log_plan_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."scheduled_visits_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."scheduled_visits_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."scheduled_visits_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_workspace_tenant_logo_storage_path"("p_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_workspace_tenant_logo_storage_path"("p_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_workspace_tenant_logo_storage_path"("p_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."subscription_plans_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."subscription_plans_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."subscription_plans_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."team_members_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."team_members_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."team_members_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."technical_recipe_template_favorites_cleanup_on_untemplate"() TO "anon";
GRANT ALL ON FUNCTION "public"."technical_recipe_template_favorites_cleanup_on_untemplate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."technical_recipe_template_favorites_cleanup_on_untemplate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."technical_recipes_set_client_from_establishment"() TO "anon";
GRANT ALL ON FUNCTION "public"."technical_recipes_set_client_from_establishment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."technical_recipes_set_client_from_establishment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."technical_recipes_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."technical_recipes_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."technical_recipes_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tenant_feature_overrides_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."tenant_feature_overrides_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tenant_feature_overrides_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_parental_consent"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_parental_consent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_parental_consent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."workspace_account_owner_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."workspace_account_owner_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."workspace_account_owner_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."workspace_member_user_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."workspace_member_user_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."workspace_member_user_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."workspace_tenant_logo_storage_path"() TO "anon";
GRANT ALL ON FUNCTION "public"."workspace_tenant_logo_storage_path"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."workspace_tenant_logo_storage_path"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_impersonation_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_impersonation_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_impersonation_log" TO "service_role";



GRANT ALL ON TABLE "public"."api_tokens" TO "anon";
GRANT ALL ON TABLE "public"."api_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."api_tokens" TO "service_role";



GRANT UPDATE("last_used_at") ON TABLE "public"."api_tokens" TO "authenticated";



GRANT UPDATE("revoked_at") ON TABLE "public"."api_tokens" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("crn") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("updated_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("timezone") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("onboarding_completed_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("work_context") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("phone") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("photo_storage_path") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("tenant_logo_storage_path") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."scheduled_visits" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_visits" TO "service_role";



GRANT ALL ON TABLE "public"."technical_recipes" TO "anon";
GRANT ALL ON TABLE "public"."technical_recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."technical_recipes" TO "service_role";



GRANT ALL ON TABLE "public"."admin_platform_metrics" TO "anon";
GRANT ALL ON TABLE "public"."admin_platform_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_platform_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."establishments" TO "anon";
GRANT ALL ON TABLE "public"."establishments" TO "authenticated";
GRANT ALL ON TABLE "public"."establishments" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_events" TO "anon";
GRANT ALL ON TABLE "public"."subscription_events" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."admin_tenant_cockpit" TO "anon";
GRANT ALL ON TABLE "public"."admin_tenant_cockpit" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_tenant_cockpit" TO "service_role";



GRANT ALL ON TABLE "public"."admin_tenant_notes" TO "anon";
GRANT ALL ON TABLE "public"."admin_tenant_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_tenant_notes" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."auth_troubleshooting_logs" TO "anon";
GRANT ALL ON TABLE "public"."auth_troubleshooting_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_troubleshooting_logs" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_custom_items" TO "anon";
GRANT ALL ON TABLE "public"."checklist_custom_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_custom_items" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_custom_sections" TO "anon";
GRANT ALL ON TABLE "public"."checklist_custom_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_custom_sections" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_custom_templates" TO "anon";
GRANT ALL ON TABLE "public"."checklist_custom_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_custom_templates" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_establishment_recent" TO "anon";
GRANT ALL ON TABLE "public"."checklist_establishment_recent" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_establishment_recent" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_fill_item_photos" TO "anon";
GRANT ALL ON TABLE "public"."checklist_fill_item_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_fill_item_photos" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_fill_item_responses" TO "anon";
GRANT ALL ON TABLE "public"."checklist_fill_item_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_fill_item_responses" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_fill_pdf_exports" TO "anon";
GRANT ALL ON TABLE "public"."checklist_fill_pdf_exports" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_fill_pdf_exports" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_fill_session_reopen_events" TO "anon";
GRANT ALL ON TABLE "public"."checklist_fill_session_reopen_events" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_fill_session_reopen_events" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_fill_sessions" TO "anon";
GRANT ALL ON TABLE "public"."checklist_fill_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_fill_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_template_items" TO "anon";
GRANT ALL ON TABLE "public"."checklist_template_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_template_items" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_template_sections" TO "anon";
GRANT ALL ON TABLE "public"."checklist_template_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_template_sections" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_templates" TO "anon";
GRANT ALL ON TABLE "public"."checklist_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_templates" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_workspace_items" TO "anon";
GRANT ALL ON TABLE "public"."checklist_workspace_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_workspace_items" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_workspace_sections" TO "anon";
GRANT ALL ON TABLE "public"."checklist_workspace_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_workspace_sections" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_workspace_templates" TO "anon";
GRANT ALL ON TABLE "public"."checklist_workspace_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_workspace_templates" TO "service_role";



GRANT ALL ON TABLE "public"."client_contracts" TO "anon";
GRANT ALL ON TABLE "public"."client_contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."client_contracts" TO "service_role";



GRANT ALL ON TABLE "public"."client_custom_segments" TO "anon";
GRANT ALL ON TABLE "public"."client_custom_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."client_custom_segments" TO "service_role";



GRANT ALL ON TABLE "public"."client_exam_documents" TO "anon";
GRANT ALL ON TABLE "public"."client_exam_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."client_exam_documents" TO "service_role";



GRANT ALL ON TABLE "public"."consent_records" TO "anon";
GRANT ALL ON TABLE "public"."consent_records" TO "authenticated";
GRANT ALL ON TABLE "public"."consent_records" TO "service_role";



GRANT ALL ON TABLE "public"."contract_templates" TO "anon";
GRANT ALL ON TABLE "public"."contract_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_templates" TO "service_role";



GRANT ALL ON TABLE "public"."degustacao_config" TO "anon";
GRANT ALL ON TABLE "public"."degustacao_config" TO "authenticated";
GRANT ALL ON TABLE "public"."degustacao_config" TO "service_role";



GRANT ALL ON TABLE "public"."establishment_areas" TO "anon";
GRANT ALL ON TABLE "public"."establishment_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."establishment_areas" TO "service_role";



GRANT ALL ON TABLE "public"."establishment_compliance_deadlines" TO "anon";
GRANT ALL ON TABLE "public"."establishment_compliance_deadlines" TO "authenticated";
GRANT ALL ON TABLE "public"."establishment_compliance_deadlines" TO "service_role";



GRANT ALL ON TABLE "public"."establishment_pops" TO "anon";
GRANT ALL ON TABLE "public"."establishment_pops" TO "authenticated";
GRANT ALL ON TABLE "public"."establishment_pops" TO "service_role";



GRANT ALL ON TABLE "public"."external_access_permissions" TO "anon";
GRANT ALL ON TABLE "public"."external_access_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."external_access_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."external_portal_users" TO "anon";
GRANT ALL ON TABLE "public"."external_portal_users" TO "authenticated";
GRANT ALL ON TABLE "public"."external_portal_users" TO "service_role";



GRANT ALL ON TABLE "public"."financial_charges" TO "anon";
GRANT ALL ON TABLE "public"."financial_charges" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_charges" TO "service_role";



GRANT ALL ON TABLE "public"."patient_adult_nutrition_assessments" TO "anon";
GRANT ALL ON TABLE "public"."patient_adult_nutrition_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_adult_nutrition_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."patient_geriatric_assessments" TO "anon";
GRANT ALL ON TABLE "public"."patient_geriatric_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_geriatric_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."patient_nutrition_assessments" TO "anon";
GRANT ALL ON TABLE "public"."patient_nutrition_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_nutrition_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."patient_parental_consents" TO "anon";
GRANT ALL ON TABLE "public"."patient_parental_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_parental_consents" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";



GRANT ALL ON TABLE "public"."platform_announcements" TO "anon";
GRANT ALL ON TABLE "public"."platform_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."pop_templates" TO "anon";
GRANT ALL ON TABLE "public"."pop_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pop_templates" TO "service_role";



GRANT ALL ON TABLE "public"."pop_versions" TO "anon";
GRANT ALL ON TABLE "public"."pop_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."pop_versions" TO "service_role";



GRANT ALL ON TABLE "public"."professional_raw_materials" TO "anon";
GRANT ALL ON TABLE "public"."professional_raw_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."professional_raw_materials" TO "service_role";



GRANT ALL ON TABLE "public"."taco_reference_foods" TO "anon";
GRANT ALL ON TABLE "public"."taco_reference_foods" TO "authenticated";
GRANT ALL ON TABLE "public"."taco_reference_foods" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT UPDATE("full_name") ON TABLE "public"."team_members" TO "authenticated";



GRANT UPDATE("email") ON TABLE "public"."team_members" TO "authenticated";



GRANT UPDATE("phone") ON TABLE "public"."team_members" TO "authenticated";



GRANT UPDATE("professional_area") ON TABLE "public"."team_members" TO "authenticated";



GRANT UPDATE("job_role") ON TABLE "public"."team_members" TO "authenticated";



GRANT UPDATE("crn") ON TABLE "public"."team_members" TO "authenticated";



GRANT UPDATE("notes") ON TABLE "public"."team_members" TO "authenticated";



GRANT UPDATE("updated_at") ON TABLE "public"."team_members" TO "authenticated";



GRANT UPDATE("member_user_id") ON TABLE "public"."team_members" TO "authenticated";



GRANT ALL ON TABLE "public"."technical_recipe_lines" TO "anon";
GRANT ALL ON TABLE "public"."technical_recipe_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."technical_recipe_lines" TO "service_role";



GRANT ALL ON TABLE "public"."technical_recipe_template_favorites" TO "anon";
GRANT ALL ON TABLE "public"."technical_recipe_template_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."technical_recipe_template_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_feature_overrides" TO "anon";
GRANT ALL ON TABLE "public"."tenant_feature_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_feature_overrides" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































