-- Cadastro público (wizard) + billing Stripe.
-- Conta Auth só depois do pagamento (planos pagos). E-mail de confirmação
-- só depois disso. Rastreio de abandono no Checkout + notificação interna.

-- ── Planos: IDs Stripe (1 Product por plano; 2 Prices mês/ano) ───────────────

alter table public.subscription_plans
  add column if not exists stripe_product_id text,
  add column if not exists stripe_price_monthly_id text,
  add column if not exists stripe_price_annual_id text;

comment on column public.subscription_plans.stripe_product_id is
  'Product Stripe deste plano (starter, pro, …).';
comment on column public.subscription_plans.stripe_price_monthly_id is
  'Price recorrente mensal.';
comment on column public.subscription_plans.stripe_price_annual_id is
  'Price recorrente anual. Null = anual indisponível.';

-- Catálogo público (sem IDs Stripe) para a aba Cadastre-se.
grant select on public.subscription_plans to anon;

drop policy if exists "subscription_plans_select_anon" on public.subscription_plans;
create policy "subscription_plans_select_anon"
  on public.subscription_plans
  for select
  to anon
  using (is_active = true);

-- ── Intervalo de cobrança no perfil ──────────────────────────────────────────

alter table public.profiles
  add column if not exists billing_interval text;

alter table public.profiles
  drop constraint if exists profiles_billing_interval_check;

alter table public.profiles
  add constraint profiles_billing_interval_check
  check (billing_interval is null or billing_interval in ('month', 'year'));

-- ── Intent de cadastro (PII + funil; senha cifrada só no Checkout) ───────────

create table if not exists public.signup_intents (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'dados'
    constraint signup_intents_status_check
    check (status in ('dados', 'plano', 'checkout', 'abandonado', 'pago', 'conta_criada')),
  person_kind text not null
    constraint signup_intents_person_kind_check
    check (person_kind in ('pf', 'pj')),
  full_name text,
  legal_name text,
  responsible_name text,
  email text not null,
  phone text not null,
  document_kind text not null
    constraint signup_intents_document_kind_check
    check (document_kind in ('cpf', 'cnpj')),
  document_id text not null,
  password_cipher text,
  plan_slug text,
  billing_interval text
    constraint signup_intents_billing_interval_check
    check (billing_interval is null or billing_interval in ('month', 'year')),
  stripe_checkout_session_id text,
  stripe_customer_id text,
  checkout_expires_at timestamptz,
  abandoned_at timestamptz,
  notified_at timestamptz,
  paid_at timestamptz,
  created_user_id uuid references auth.users (id) on delete set null,
  confirmation_email_sent_at timestamptz,
  last_error text,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.signup_intents is
  'Tentativas de cadastro público. PII com TTL 30 dias se não convertidas. Senha só cifrada após ir ao Checkout.';

create index if not exists signup_intents_email_idx
  on public.signup_intents (email);

create index if not exists signup_intents_status_created_idx
  on public.signup_intents (status, created_at desc);

create index if not exists signup_intents_created_user_id_idx
  on public.signup_intents (created_user_id);

create unique index if not exists signup_intents_stripe_session_uidx
  on public.signup_intents (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists signup_intents_open_checkout_idx
  on public.signup_intents (checkout_expires_at)
  where status = 'checkout';

create or replace function public.signup_intents_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists signup_intents_set_updated_at on public.signup_intents;
create trigger signup_intents_set_updated_at
  before update on public.signup_intents
  for each row execute function public.signup_intents_touch_updated_at();

alter table public.signup_intents enable row level security;

revoke all on table public.signup_intents from public, anon, authenticated;
grant all on table public.signup_intents to service_role;
grant select on table public.signup_intents to authenticated;

drop policy if exists "signup_intents_select_super_admin" on public.signup_intents;
create policy "signup_intents_select_super_admin"
  on public.signup_intents
  for select
  to authenticated
  using (public.is_super_admin());

-- ── Billing do tenant (fonte da verdade pós-webhook) ─────────────────────────

create table if not exists public.tenant_billing (
  tenant_user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text,
  billing_interval text
    constraint tenant_billing_interval_check
    check (billing_interval is null or billing_interval in ('month', 'year')),
  plan_slug text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.tenant_billing is
  'Assinatura Stripe do tenant. Escrita só via service_role (webhook).';

create index if not exists tenant_billing_stripe_customer_idx
  on public.tenant_billing (stripe_customer_id);

create or replace function public.tenant_billing_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenant_billing_set_updated_at on public.tenant_billing;
create trigger tenant_billing_set_updated_at
  before update on public.tenant_billing
  for each row execute function public.tenant_billing_touch_updated_at();

alter table public.tenant_billing enable row level security;

revoke all on table public.tenant_billing from public, anon, authenticated;
grant all on table public.tenant_billing to service_role;
grant select on table public.tenant_billing to authenticated;

drop policy if exists "tenant_billing_select_own_or_admin" on public.tenant_billing;
create policy "tenant_billing_select_own_or_admin"
  on public.tenant_billing
  for select
  to authenticated
  using (
    tenant_user_id = (select public.workspace_account_owner_id())
    or public.is_super_admin()
  );

-- ── Idempotência de webhook Stripe ───────────────────────────────────────────

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb
);

comment on table public.stripe_webhook_events is
  'IDs evt_ já processados. Sem acesso Data API para anon/authenticated.';

alter table public.stripe_webhook_events enable row level security;

revoke all on table public.stripe_webhook_events from public, anon, authenticated;
grant all on table public.stripe_webhook_events to service_role;

-- ── handle_new_user: plano pago público não recebe degustação ────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name       text;
  v_source          text;
  v_acquisition     text;
  v_is_team_member  boolean;
  v_is_self_service boolean;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_source    := coalesce(new.raw_user_meta_data ->> 'source', '');

  v_is_team_member :=
    v_source = 'team_menu'
    or coalesce(new.raw_user_meta_data ->> 'acquisition_source', '') = 'team_member';

  if v_is_team_member then
    v_acquisition := 'team_member';
    v_is_self_service := false;
  else
    v_acquisition := coalesce(
      new.raw_user_meta_data ->> 'acquisition_source',
      'self_service'
    );
    v_is_self_service :=
      v_acquisition is distinct from 'admin_created'
      and v_acquisition is distinct from 'public_paid';
  end if;

  insert into public.profiles (
    user_id,
    full_name,
    acquisition_source,
    trial_started_at,
    onboarding_completed_at,
    timezone,
    created_at
  )
  values (
    new.id,
    v_full_name,
    v_acquisition,
    case when v_is_self_service then now() else null end,
    case when v_is_team_member then now() else null end,
    'America/Sao_Paulo',
    now()
  )
  on conflict (user_id) do update
    set
      acquisition_source = excluded.acquisition_source,
      trial_started_at = coalesce(profiles.trial_started_at, excluded.trial_started_at),
      onboarding_completed_at = coalesce(
        profiles.onboarding_completed_at,
        excluded.onboarding_completed_at
      );

  if not v_is_team_member then
    insert into public.subscription_events (
      tenant_user_id, event_type, new_value, metadata
    )
    values (
      new.id,
      'tenant_created',
      v_acquisition,
      jsonb_build_object('email', new.email, 'acquisition_source', v_acquisition)
    );
  end if;

  if v_is_self_service then
    perform public.apply_degustacao_overrides(new.id);
  end if;

  return new;
end;
$$;

revoke all on function public.signup_intents_touch_updated_at() from public, anon, authenticated;
revoke all on function public.tenant_billing_touch_updated_at() from public, anon, authenticated;
