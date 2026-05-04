-- Super Admin — Phase 1: tabelas e colunas para o painel de administração da plataforma
-- Tabelas: tenant_feature_overrides, api_tokens, subscription_events,
--          admin_tenant_notes, platform_announcements, admin_impersonation_log,
--          degustacao_config
-- Colunas adicionais em: profiles, subscription_plans

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: is_super_admin()  — evita repetição nas RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid())
      and role = 'super_admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Colunas adicionais em profiles
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists trial_started_at   timestamptz,
  add column if not exists last_active_at      timestamptz,
  add column if not exists acquisition_source  text;        -- 'self_service' | 'admin_created' | 'invite' | null

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Colunas adicionais em subscription_plans
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.subscription_plans
  add column if not exists trial_days integer not null default 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. degustacao_config — features disponíveis em self-service / degustação
--    Admin configura quais feature flags ficam activas para novos tenants
--    que se registam sem um plano pago.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.degustacao_config (
  id            uuid        primary key default gen_random_uuid(),
  feature_key   text        not null unique,   -- ex: 'feature_pdf_export', 'feature_csv_import'
  enabled       boolean     not null default false,
  label         text,                          -- descrição legível para o painel
  updated_at    timestamptz not null default now(),
  updated_by    uuid        references auth.users (id) on delete set null
);

alter table public.degustacao_config enable row level security;

-- Super admin gere; autenticados lêem (precisam saber o que está activo)
create policy "degustacao_config_select_authenticated"
  on public.degustacao_config for select
  to authenticated
  using (true);

create policy "degustacao_config_manage_super_admin"
  on public.degustacao_config for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.degustacao_config to authenticated;

-- Seed inicial: mapeia as colunas de feature flag que existem em subscription_plans
insert into public.degustacao_config (feature_key, enabled, label)
values
  ('feature_portal_externo',  false, 'Portal externo para pacientes'),
  ('feature_pdf_export',      true,  'Exportação de PDF de dossiês'),
  ('feature_csv_import',      false, 'Importação de dados via CSV'),
  ('feature_api_access',      false, 'Acesso à API / tokens')
on conflict (feature_key) do nothing;

create or replace function public.degustacao_config_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists degustacao_config_set_updated_at on public.degustacao_config;
create trigger degustacao_config_set_updated_at
  before update on public.degustacao_config
  for each row execute function public.degustacao_config_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. tenant_feature_overrides — overrides por tenant além do plano base
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.tenant_feature_overrides (
  id              uuid        primary key default gen_random_uuid(),
  tenant_user_id  uuid        not null references auth.users (id) on delete cascade,
  feature_key     text        not null,
  enabled         boolean     not null,
  reason          text,                          -- nota interna do admin
  updated_at      timestamptz not null default now(),
  updated_by      uuid        references auth.users (id) on delete set null,
  constraint tenant_feature_overrides_unique unique (tenant_user_id, feature_key)
);

create index if not exists tenant_feature_overrides_tenant_idx
  on public.tenant_feature_overrides (tenant_user_id);

alter table public.tenant_feature_overrides enable row level security;

-- Tenant lê os seus próprios overrides; super_admin gere tudo
create policy "tenant_feature_overrides_select_own"
  on public.tenant_feature_overrides for select
  to authenticated
  using (tenant_user_id = (select auth.uid()) or public.is_super_admin());

create policy "tenant_feature_overrides_manage_super_admin"
  on public.tenant_feature_overrides for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.tenant_feature_overrides to authenticated;

create or replace function public.tenant_feature_overrides_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists tenant_feature_overrides_set_updated_at on public.tenant_feature_overrides;
create trigger tenant_feature_overrides_set_updated_at
  before update on public.tenant_feature_overrides
  for each row execute function public.tenant_feature_overrides_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. subscription_events — histórico imutável de eventos de subscrição
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.subscription_events (
  id              uuid        primary key default gen_random_uuid(),
  tenant_user_id  uuid        not null references auth.users (id) on delete cascade,
  event_type      text        not null,   -- 'plan_changed' | 'suspended' | 'unsuspended' |
                                          -- 'payment_received' | 'trial_started' | 'trial_expired' |
                                          -- 'feature_override_set' | 'tenant_created'
  old_value       text,                   -- valor anterior (ex: plano anterior)
  new_value       text,                   -- novo valor
  metadata        jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  created_by      uuid        references auth.users (id) on delete set null,

  constraint subscription_events_event_type_check check (
    event_type in (
      'plan_changed', 'suspended', 'unsuspended',
      'payment_received', 'trial_started', 'trial_expired',
      'feature_override_set', 'tenant_created', 'tenant_blocked_lgpd',
      'tenant_unblocked_lgpd', 'account_deleted'
    )
  )
);

create index if not exists subscription_events_tenant_idx
  on public.subscription_events (tenant_user_id, created_at desc);

alter table public.subscription_events enable row level security;

-- Tenant vê os seus próprios eventos; super_admin vê tudo
create policy "subscription_events_select_own_or_admin"
  on public.subscription_events for select
  to authenticated
  using (tenant_user_id = (select auth.uid()) or public.is_super_admin());

-- Apenas super_admin (ou funções SECURITY DEFINER) inserem
create policy "subscription_events_insert_super_admin"
  on public.subscription_events for insert
  to authenticated
  with check (public.is_super_admin());

-- Imutável: sem UPDATE nem DELETE mesmo para super_admin
grant select on public.subscription_events to authenticated;

-- Trigger automático: quando plan_slug muda em profiles, grava subscription_event
create or replace function public.profiles_log_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

drop trigger if exists profiles_audit_plan_change on public.profiles;
create trigger profiles_audit_plan_change
  after update on public.profiles
  for each row execute function public.profiles_log_plan_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. api_tokens — tokens de API para tenants e integração BI
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.api_tokens (
  id              uuid        primary key default gen_random_uuid(),
  owner_user_id   uuid        not null references auth.users (id) on delete cascade,
  name            text        not null,
  token_hash      text        not null unique,   -- SHA-256 hex do token; nunca o token em plain
  token_prefix    text        not null,           -- primeiros 8 chars do token (exibição)
  scopes          text[]      not null default '{}',
  -- ex: 'read:checklist', 'read:clients', 'write:responses', 'read:analytics'
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists api_tokens_owner_idx
  on public.api_tokens (owner_user_id, revoked_at) where revoked_at is null;

alter table public.api_tokens enable row level security;

-- Tenant gere os seus próprios tokens; super_admin gere todos
create policy "api_tokens_select_own_or_admin"
  on public.api_tokens for select
  to authenticated
  using (owner_user_id = (select auth.uid()) or public.is_super_admin());

create policy "api_tokens_insert_own"
  on public.api_tokens for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()) or public.is_super_admin());

-- Update apenas para revogar (revoked_at) ou actualizar last_used_at
create policy "api_tokens_update_own_or_admin"
  on public.api_tokens for update
  to authenticated
  using (owner_user_id = (select auth.uid()) or public.is_super_admin())
  with check (owner_user_id = (select auth.uid()) or public.is_super_admin());

-- Sem DELETE — apenas revogação via revoked_at
grant select, insert, update (revoked_at, last_used_at) on public.api_tokens to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. admin_tenant_notes — notas CRM por tenant (apenas super_admin)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.admin_tenant_notes (
  id              uuid        primary key default gen_random_uuid(),
  tenant_user_id  uuid        not null references auth.users (id) on delete cascade,
  body            text        not null,
  created_by      uuid        not null references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists admin_tenant_notes_tenant_idx
  on public.admin_tenant_notes (tenant_user_id, created_at desc);

alter table public.admin_tenant_notes enable row level security;

create policy "admin_tenant_notes_super_admin_only"
  on public.admin_tenant_notes for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select, insert, update, delete on public.admin_tenant_notes to authenticated;

create or replace function public.admin_tenant_notes_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists admin_tenant_notes_set_updated_at on public.admin_tenant_notes;
create trigger admin_tenant_notes_set_updated_at
  before update on public.admin_tenant_notes
  for each row execute function public.admin_tenant_notes_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. platform_announcements — banners e anúncios in-app
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.platform_announcements (
  id                  uuid        primary key default gen_random_uuid(),
  title               text        not null,
  body                text        not null,
  kind                text        not null default 'info',   -- 'info' | 'warning' | 'critical'
  target_plan_slugs   text[],                                -- null = todos os planos
  active_from         timestamptz not null default now(),
  active_until        timestamptz,                           -- null = sem expiração
  is_dismissible      boolean     not null default true,
  created_by          uuid        references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint platform_announcements_kind_check check (
    kind in ('info', 'warning', 'critical')
  )
);

-- Índice simples (sem predicado): now() não é IMMUTABLE e não pode ser usado
-- em partial index. O filtro de datas activas é aplicado na query/policy.
create index if not exists platform_announcements_active_idx
  on public.platform_announcements (active_from, active_until);

alter table public.platform_announcements enable row level security;

-- Autenticados vêem anúncios activos
create policy "platform_announcements_select_active"
  on public.platform_announcements for select
  to authenticated
  using (
    active_from <= now()
    and (active_until is null or active_until > now())
  );

-- Super admin gere tudo (inclui ver anúncios futuros/expirados)
create policy "platform_announcements_manage_super_admin"
  on public.platform_announcements for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.platform_announcements to authenticated;

create or replace function public.platform_announcements_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists platform_announcements_set_updated_at on public.platform_announcements;
create trigger platform_announcements_set_updated_at
  before update on public.platform_announcements
  for each row execute function public.platform_announcements_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. admin_impersonation_log — LGPD-crítico: registo imutável de impersonações
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.admin_impersonation_log (
  id                uuid        primary key default gen_random_uuid(),
  admin_user_id     uuid        not null references auth.users (id) on delete set null,
  target_user_id    uuid        not null references auth.users (id) on delete set null,
  justification     text        not null,  -- obrigatório por LGPD
  session_token     text,                  -- referência opaca à sessão Supabase
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,           -- preenchido ao terminar impersonação
  ip_address        inet,
  user_agent        text
);

create index if not exists admin_impersonation_log_admin_idx
  on public.admin_impersonation_log (admin_user_id, started_at desc);

create index if not exists admin_impersonation_log_target_idx
  on public.admin_impersonation_log (target_user_id, started_at desc);

alter table public.admin_impersonation_log enable row level security;

-- Apenas super_admin lê; nenhum utilizador faz UPDATE ou DELETE
-- (ended_at é preenchido via função SECURITY DEFINER)
create policy "admin_impersonation_log_select_super_admin"
  on public.admin_impersonation_log for select
  to authenticated
  using (public.is_super_admin());

create policy "admin_impersonation_log_insert_super_admin"
  on public.admin_impersonation_log for insert
  to authenticated
  with check (public.is_super_admin());

-- Sem UPDATE/DELETE via RLS — apenas via função SECURITY DEFINER
grant select, insert on public.admin_impersonation_log to authenticated;

-- Função SECURITY DEFINER para encerrar sessão de impersonação (preenche ended_at)
create or replace function public.end_impersonation_session(p_log_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Acesso negado';
  end if;

  update public.admin_impersonation_log
  set ended_at = now()
  where id = p_log_id
    and ended_at is null;
end;
$$;

-- Views 10 e 11 movidas para 20260630150000_fix_announcements_index.sql
-- (dependem de profiles.created_at que só é adicionado em 20260630140000)
