-- Membros de equipa não devem ser enviados para o wizard de onboarding do titular.
-- 1) Corrige handle_new_user para marcar onboarding como concluído para novos membros.
-- 2) Backfill: membros existentes com onboarding_completed_at IS NULL.

-- 1) Atualiza o trigger para definir onboarding_completed_at = now() para membros.
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
    v_acquisition := coalesce(new.raw_user_meta_data ->> 'acquisition_source', 'self_service');
    v_is_self_service := v_acquisition <> 'admin_created';
  end if;

  insert into public.profiles (
    user_id,
    full_name,
    acquisition_source,
    trial_started_at,
    -- Membros de equipa não passam pelo onboarding do titular.
    onboarding_completed_at,
    created_at
  )
  values (
    new.id,
    v_full_name,
    v_acquisition,
    case when v_is_self_service then now() else null end,
    case when v_is_team_member  then now() else null end,
    now()
  )
  on conflict (user_id) do update
    set
      acquisition_source      = excluded.acquisition_source,
      trial_started_at        = coalesce(profiles.trial_started_at, excluded.trial_started_at),
      -- Se era membro e onboarding estava null, marca como concluído agora.
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

-- 2) Backfill: membros de equipa existentes com onboarding_completed_at IS NULL.
update public.profiles p
set onboarding_completed_at = now()
from public.team_members tm
where p.user_id = tm.member_user_id
  and tm.member_user_id is not null
  and p.onboarding_completed_at is null;
