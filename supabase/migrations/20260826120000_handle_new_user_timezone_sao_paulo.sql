-- Novos perfis (self-service, admin, equipa) nascem com fuso Brasil (São Paulo).

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
    onboarding_completed_at,
    timezone,
    created_at
  )
  values (
    new.id,
    v_full_name,
    v_acquisition,
    case when v_is_self_service then now() else null end,
    case when v_is_team_member  then now() else null end,
    'America/Sao_Paulo',
    now()
  )
  on conflict (user_id) do update
    set
      acquisition_source      = excluded.acquisition_source,
      trial_started_at        = coalesce(profiles.trial_started_at, excluded.trial_started_at),
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
