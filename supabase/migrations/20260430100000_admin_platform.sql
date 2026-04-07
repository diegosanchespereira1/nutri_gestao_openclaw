-- Epic 10 — Administração da plataforma
-- Stories 10.1 (tenants), 10.2 (planos), 10.3 (métricas), 10.4 (catálogo), 10.5-10.6 (checklists)

-- ── 10.2 — Planos de assinatura ──────────────────────────────────────────────

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,               -- 'free' | 'starter' | 'pro' | 'enterprise'
  description text,
  price_monthly_cents bigint not null default 0,
  price_annual_cents bigint,

  -- Feature flags / limites
  max_clients int not null default 5,
  max_establishments int not null default 2,
  max_team_members int not null default 1,
  max_patients int not null default 20,
  max_storage_mb int not null default 500,

  -- Add-ons habilitados
  feature_portal_externo boolean not null default false,
  feature_pdf_export boolean not null default true,
  feature_csv_import boolean not null default false,
  feature_api_access boolean not null default false,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Apenas super_admin gerencia planos (sem RLS para authenticated em geral)
alter table public.subscription_plans enable row level security;

create policy "subscription_plans_select_all"
  on public.subscription_plans for select
  to authenticated
  using (is_active = true);

grant select on public.subscription_plans to authenticated;

-- Seed: planos base
insert into public.subscription_plans (name, slug, description, price_monthly_cents, max_clients, max_establishments, max_team_members, max_patients, max_storage_mb, feature_portal_externo, feature_csv_import)
values
  ('Gratuito', 'free', 'Para começar — sem cartão de crédito', 0, 3, 1, 0, 10, 200, false, false),
  ('Starter', 'starter', 'Para profissionais autônomos', 4900, 15, 3, 1, 50, 1000, false, true),
  ('Pro', 'pro', 'Para consultórios e equipes pequenas', 9900, 50, 10, 5, 200, 5000, true, true),
  ('Enterprise', 'enterprise', 'Sob consulta — sem limites', 0, -1, -1, -1, -1, -1, true, true)
on conflict (slug) do nothing;

-- ── 10.1 — Referência ao plano no profile do tenant ──────────────────────────

alter table public.profiles
  add column if not exists plan_slug text not null default 'free',
  add column if not exists plan_expires_at timestamptz,
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_reason text;

-- ── 10.3 — Métricas (view somente leitura para super_admin) ──────────────────
-- A view agrega dados de tenants sem expor dados clínicos individuais.

create or replace view public.admin_platform_metrics as
select
  (select count(*) from public.profiles where role not in ('admin', 'super_admin')) as total_tenants,
  (select count(*) from public.profiles where role not in ('admin', 'super_admin') and is_suspended = false) as active_tenants,
  (select count(*) from public.profiles where role not in ('admin', 'super_admin') and is_suspended = true) as suspended_tenants,
  (select count(*) from public.profiles where plan_slug = 'free') as free_plan_count,
  (select count(*) from public.profiles where plan_slug = 'starter') as starter_plan_count,
  (select count(*) from public.profiles where plan_slug = 'pro') as pro_plan_count,
  (select count(*) from public.profiles where plan_slug = 'enterprise') as enterprise_plan_count,
  (select count(*) from public.clients) as total_clients,
  (select count(*) from public.scheduled_visits) as total_visits,
  (select count(*) from public.technical_recipes) as total_recipes;

-- View só é acessível via super_admin role (aplicado na camada de aplicação)

-- ── Updated_at triggers ───────────────────────────────────────────────────────

create or replace function public.subscription_plans_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists subscription_plans_set_updated_at on public.subscription_plans;
create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row execute function public.subscription_plans_touch_updated_at();
