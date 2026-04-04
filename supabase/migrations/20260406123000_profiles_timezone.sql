-- Fuso horário IANA por profissional (agenda, «hoje», formatação).

alter table public.profiles
  add column if not exists timezone text not null default 'Europe/Lisbon';

revoke update on public.profiles from authenticated;
grant update (full_name, crn, timezone, updated_at) on public.profiles to authenticated;
