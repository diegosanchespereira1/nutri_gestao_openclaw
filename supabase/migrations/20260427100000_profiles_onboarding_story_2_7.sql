-- Story 2.7: wizard de onboarding — estado de conclusão e contexto de trabalho (FR55, FR56).

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists work_context text;

alter table public.profiles
  drop constraint if exists profiles_work_context_check;

alter table public.profiles
  add constraint profiles_work_context_check check (
    work_context is null
    or work_context in ('institutional', 'clinical', 'both')
  );

comment on column public.profiles.onboarding_completed_at is
  'NULL = utilizador deve concluir o wizard de onboarding (primeira sessão).';

comment on column public.profiles.work_context is
  'Preferência declarada no onboarding: institucional, clínico ou ambos.';

-- Contas já existentes na altura da migração: não forçar wizard.
update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, now())
where onboarding_completed_at is null;

revoke update on public.profiles from authenticated;
grant update (
  full_name,
  crn,
  timezone,
  updated_at,
  work_context,
  onboarding_completed_at
) on public.profiles to authenticated;
