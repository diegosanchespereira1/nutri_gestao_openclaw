-- Super Admin — Phase 3: self-service com degustação + criação de tenant pelo admin
-- • Adiciona created_at à tabela profiles (era coluna inexistente, causava erro em runtime)
-- • Actualiza handle_new_user para: acquisition_source, trial_started_at,
--   overrides de degustação e evento subscription_events
-- • Garante que tenant criado via admin não recebe overrides de degustação

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Adicionar created_at a profiles (backfill via auth.users)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

-- Backfill: copiar created_at de auth.users para perfis existentes
update public.profiles p
set created_at = u.created_at
from auth.users u
where p.user_id = u.id
  and p.created_at = p.updated_at;   -- só linhas com valor padrão (ainda não preenchido)

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Função auxiliar: aplica overrides de degustação para um user_id
--    Lê degustacao_config (features activas) e insere tenant_feature_overrides.
--    Só actua se o utilizador ainda não tiver overrides (idempotente).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.apply_degustacao_overrides(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Actualizar handle_new_user para suportar acquisition_source + degustação
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- O trigger já existe (criado em 20260331120000_profiles.sql); apenas a função foi substituída.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Grant para o trigger (security definer já eleva, mas por clareza)
-- ─────────────────────────────────────────────────────────────────────────────

grant execute on function public.apply_degustacao_overrides(uuid) to service_role;
grant execute on function public.handle_new_user() to service_role;
