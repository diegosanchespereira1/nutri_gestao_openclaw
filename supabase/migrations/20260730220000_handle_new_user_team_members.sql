-- Membros da equipe (source=team_menu) não são tenants: sem trial, evento tenant_created ou degustação.

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

-- Corrigir contas de membros já criadas como tenant por engano.
update public.profiles p
set
  acquisition_source = 'team_member',
  trial_started_at = null
from auth.users u
where p.user_id = u.id
  and coalesce(u.raw_user_meta_data ->> 'source', '') = 'team_menu'
  and coalesce(p.acquisition_source, '') is distinct from 'team_member';

update public.profiles p
set
  acquisition_source = 'team_member',
  trial_started_at = null
from public.team_members tm
where p.user_id = tm.member_user_id
  and tm.member_user_id is not null
  and coalesce(p.acquisition_source, '') is distinct from 'team_member';

delete from public.subscription_events se
using public.profiles p
where se.tenant_user_id = p.user_id
  and se.event_type = 'tenant_created'
  and p.acquisition_source = 'team_member';

delete from public.tenant_feature_overrides tfo
using public.profiles p
where tfo.tenant_user_id = p.user_id
  and p.acquisition_source = 'team_member';

-- Views admin: excluir perfis de membros da equipe da contagem/listagem de tenants.
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
where p.role not in ('admin', 'super_admin')
  and coalesce(p.acquisition_source, '') <> 'team_member';

alter view public.admin_tenant_cockpit
  set (security_invoker = true);

revoke all on table public.admin_tenant_cockpit from anon;
revoke all on table public.admin_tenant_cockpit from authenticated;
grant select on table public.admin_tenant_cockpit to service_role;

drop view if exists public.admin_platform_metrics;
create view public.admin_platform_metrics as
select
  (select count(*) from public.profiles
   where role not in ('admin', 'super_admin')
     and coalesce(acquisition_source, '') <> 'team_member')                             as total_tenants,
  (select count(*) from public.profiles
   where role not in ('admin', 'super_admin')
     and coalesce(acquisition_source, '') <> 'team_member'
     and is_suspended = false)                                                         as active_tenants,
  (select count(*) from public.profiles
   where role not in ('admin', 'super_admin')
     and coalesce(acquisition_source, '') <> 'team_member'
     and is_suspended = true)                                                          as suspended_tenants,
  (select count(*) from public.profiles
   where role not in ('admin', 'super_admin')
     and coalesce(acquisition_source, '') <> 'team_member'
     and trial_started_at is not null
     and plan_expires_at > now())                                                       as in_trial_count,
  (select count(*) from public.profiles
   where coalesce(acquisition_source, '') <> 'team_member'
     and plan_slug = 'free')                                                           as free_plan_count,
  (select count(*) from public.profiles
   where coalesce(acquisition_source, '') <> 'team_member'
     and plan_slug = 'starter')                                                        as starter_plan_count,
  (select count(*) from public.profiles
   where coalesce(acquisition_source, '') <> 'team_member'
     and plan_slug = 'pro')                                                            as pro_plan_count,
  (select count(*) from public.profiles
   where coalesce(acquisition_source, '') <> 'team_member'
     and plan_slug = 'enterprise')                                                     as enterprise_plan_count,
  (select count(*) from public.profiles
   where role not in ('admin', 'super_admin')
     and coalesce(acquisition_source, '') <> 'team_member'
     and last_active_at > now() - interval '30 days')                                  as active_last_30d,
  (select count(*) from public.clients)                                                as total_clients,
  (select count(*) from public.scheduled_visits)                                      as total_visits,
  (select count(*) from public.technical_recipes)                                     as total_recipes,
  (select count(*) from public.api_tokens where revoked_at is null)                   as active_api_tokens;

alter view public.admin_platform_metrics
  set (security_invoker = true);

revoke all on table public.admin_platform_metrics from anon;
revoke all on table public.admin_platform_metrics from authenticated;
grant select on table public.admin_platform_metrics to service_role;
