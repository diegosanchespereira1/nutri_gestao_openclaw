-- Limites por tenant — clientes, pacientes e membros de equipe.
-- Plano: docs/plano-limites-tenant-e-billing.md §4.2
--
-- Tabela dedicada, e não colunas em `profiles`, porque:
--   • audita quem mudou o quê (updated_by / updated_at);
--   • não infla uma tabela que já tem ~25 colunas;
--   • permite RLS própria: o tenant lê, só o super_admin escreve.
--
-- Regra central: NÃO existe configuração global de limite. Cada tenant tem a sua
-- linha, criada por trigger, com os valores explicitamente gravados.

create table if not exists public.tenant_limits (
  tenant_user_id uuid primary key references auth.users (id) on delete cascade,

  -- Clientes
  clients_limit_enabled  boolean not null default true,
  clients_limit          integer not null default 25
    constraint tenant_limits_clients_limit_check check (clients_limit >= 0),

  -- Pacientes — limite independente do de clientes
  patients_limit_enabled boolean not null default true,
  patients_limit         integer not null default 25
    constraint tenant_limits_patients_limit_check check (patients_limit >= 0),

  -- Membros de equipe
  team_members_enabled   boolean not null default false,
  team_members_unlimited boolean not null default false,
  team_members_limit     integer not null default 0
    constraint tenant_limits_team_members_limit_check check (team_members_limit >= 0),

  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.tenant_limits is
  'Limites explícitos por tenant. Uma linha por profile, criada por trigger. Nunca configuração global.';

alter table public.tenant_limits enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: o tenant (e a sua equipe) lê os próprios limites; só super_admin escreve
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "tenant_limits_select_own_or_admin" on public.tenant_limits;
create policy "tenant_limits_select_own_or_admin"
  on public.tenant_limits for select
  to authenticated
  using (
    tenant_user_id = (select public.workspace_account_owner_id())
    or public.is_super_admin()
  );

drop policy if exists "tenant_limits_manage_super_admin" on public.tenant_limits;
create policy "tenant_limits_manage_super_admin"
  on public.tenant_limits for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.tenant_limits to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at automático (mesmo padrão de tenant_feature_overrides)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.tenant_limits_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists tenant_limits_set_updated_at on public.tenant_limits;
create trigger tenant_limits_set_updated_at
  before update on public.tenant_limits
  for each row execute function public.tenant_limits_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Garantia de que TODO tenant tem limites explícitos
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.profiles_ensure_tenant_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenant_limits (tenant_user_id)
  values (new.user_id)
  on conflict (tenant_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_tenant_limits on public.profiles;
create trigger profiles_create_tenant_limits
  after insert on public.profiles
  for each row execute function public.profiles_ensure_tenant_limits();

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill dos tenants existentes: TUDO DESLIGADO.
-- Quem já usa o sistema não pode ser bloqueado por uma migração. O super_admin
-- liga caso a caso pelo painel. Tenant NOVO nasce com os defaults da tabela
-- (25 clientes / 25 pacientes / equipe desabilitada).
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.tenant_limits (
  tenant_user_id,
  clients_limit_enabled,
  patients_limit_enabled,
  team_members_enabled,
  team_members_unlimited,
  notes
)
select
  p.user_id,
  false,
  false,
  true,
  true,
  'Backfill 20261001121000 — tenant anterior à introdução de limites.'
from public.profiles p
on conflict (tenant_user_id) do nothing;
