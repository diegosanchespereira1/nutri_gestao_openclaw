-- Correcção: índice de platform_announcements sem predicado NOW() (não é IMMUTABLE)
-- A migration 20260630130000 falhou a partir daqui; este ficheiro completa o que faltou.

-- Índice corrigido (sem where clause)
create index if not exists platform_announcements_active_idx
  on public.platform_announcements (active_from, active_until);

alter table public.platform_announcements enable row level security;

drop policy if exists "platform_announcements_select_active" on public.platform_announcements;
create policy "platform_announcements_select_active"
  on public.platform_announcements for select
  to authenticated
  using (
    active_from <= now()
    and (active_until is null or active_until > now())
  );

drop policy if exists "platform_announcements_manage_super_admin" on public.platform_announcements;
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

-- ── api_tokens (tudo abaixo do ponto de falha) ───────────────────────────────

create table if not exists public.api_tokens (
  id              uuid        primary key default gen_random_uuid(),
  owner_user_id   uuid        not null references auth.users (id) on delete cascade,
  name            text        not null,
  token_hash      text        not null unique,
  token_prefix    text        not null,
  scopes          text[]      not null default '{}',
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists api_tokens_owner_idx
  on public.api_tokens (owner_user_id, revoked_at) where revoked_at is null;

alter table public.api_tokens enable row level security;

drop policy if exists "api_tokens_select_own_or_admin" on public.api_tokens;
create policy "api_tokens_select_own_or_admin"
  on public.api_tokens for select
  to authenticated
  using (owner_user_id = (select auth.uid()) or public.is_super_admin());

drop policy if exists "api_tokens_insert_own" on public.api_tokens;
create policy "api_tokens_insert_own"
  on public.api_tokens for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()) or public.is_super_admin());

drop policy if exists "api_tokens_update_own_or_admin" on public.api_tokens;
create policy "api_tokens_update_own_or_admin"
  on public.api_tokens for update
  to authenticated
  using (owner_user_id = (select auth.uid()) or public.is_super_admin())
  with check (owner_user_id = (select auth.uid()) or public.is_super_admin());

grant select, insert, update (revoked_at, last_used_at) on public.api_tokens to authenticated;

-- ── admin_tenant_notes ───────────────────────────────────────────────────────

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

drop policy if exists "admin_tenant_notes_super_admin_only" on public.admin_tenant_notes;
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

-- ── admin_impersonation_log ──────────────────────────────────────────────────

create table if not exists public.admin_impersonation_log (
  id                uuid        primary key default gen_random_uuid(),
  admin_user_id     uuid        not null references auth.users (id) on delete set null,
  target_user_id    uuid        not null references auth.users (id) on delete set null,
  justification     text        not null,
  session_token     text,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  ip_address        inet,
  user_agent        text
);

create index if not exists admin_impersonation_log_admin_idx
  on public.admin_impersonation_log (admin_user_id, started_at desc);

create index if not exists admin_impersonation_log_target_idx
  on public.admin_impersonation_log (target_user_id, started_at desc);

alter table public.admin_impersonation_log enable row level security;

drop policy if exists "admin_impersonation_log_select_super_admin" on public.admin_impersonation_log;
create policy "admin_impersonation_log_select_super_admin"
  on public.admin_impersonation_log for select
  to authenticated
  using (public.is_super_admin());

drop policy if exists "admin_impersonation_log_insert_super_admin" on public.admin_impersonation_log;
create policy "admin_impersonation_log_insert_super_admin"
  on public.admin_impersonation_log for insert
  to authenticated
  with check (public.is_super_admin());

grant select, insert on public.admin_impersonation_log to authenticated;

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
  where id = p_log_id and ended_at is null;
end;
$$;

-- ── Views ────────────────────────────────────────────────────────────────────

drop view if exists public.admin_tenant_cockpit;
create view public.admin_tenant_cockpit as
select
  p.user_id,
  p.full_name,
  p.crn,
  p.plan_slug,
  p.is_suspended,
  p.suspended_reason,
  p.trial_started_at,
  p.last_active_at,
  p.acquisition_source,
  p.created_at           as registered_at,
  sp.name                as plan_name,
  sp.trial_days,
  (select count(*) from public.clients c where c.owner_user_id = p.user_id)              as clients_count,
  (select count(*)
   from public.establishments e
   join public.clients c on c.id = e.client_id
   where c.owner_user_id = p.user_id)                                                     as establishments_count,
  (select count(*) from public.scheduled_visits sv where sv.user_id = p.user_id)          as visits_count,
  (select se.event_type from public.subscription_events se
   where se.tenant_user_id = p.user_id
   order by se.created_at desc limit 1)                                                   as last_event_type,
  (select se.created_at from public.subscription_events se
   where se.tenant_user_id = p.user_id
   order by se.created_at desc limit 1)                                                   as last_event_at
from public.profiles p
left join public.subscription_plans sp on sp.slug = p.plan_slug
where p.role not in ('admin', 'super_admin');

drop view if exists public.admin_platform_metrics;
create view public.admin_platform_metrics as
select
  (select count(*) from public.profiles
   where role not in ('admin', 'super_admin'))                                        as total_tenants,
  (select count(*) from public.profiles
   where role not in ('admin', 'super_admin') and is_suspended = false)              as active_tenants,
  (select count(*) from public.profiles
   where role not in ('admin', 'super_admin') and is_suspended = true)              as suspended_tenants,
  (select count(*) from public.profiles
   where role not in ('admin', 'super_admin')
     and trial_started_at is not null
     and plan_expires_at > now())                                                     as in_trial_count,
  (select count(*) from public.profiles where plan_slug = 'free')                   as free_plan_count,
  (select count(*) from public.profiles where plan_slug = 'starter')                as starter_plan_count,
  (select count(*) from public.profiles where plan_slug = 'pro')                    as pro_plan_count,
  (select count(*) from public.profiles where plan_slug = 'enterprise')             as enterprise_plan_count,
  (select count(*) from public.profiles
   where role not in ('admin', 'super_admin')
     and last_active_at > now() - interval '30 days')                                as active_last_30d,
  (select count(*) from public.clients)                                              as total_clients,
  (select count(*) from public.scheduled_visits)                                    as total_visits,
  (select count(*) from public.technical_recipes)                                   as total_recipes,
  (select count(*) from public.api_tokens where revoked_at is null)                 as active_api_tokens;
