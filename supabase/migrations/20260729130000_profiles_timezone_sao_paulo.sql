-- Padroniza fuso horário de todos os perfis para Brasil (São Paulo).

update public.profiles
set
  timezone = 'America/Sao_Paulo',
  updated_at = now();

alter table public.profiles
  alter column timezone set default 'America/Sao_Paulo';
