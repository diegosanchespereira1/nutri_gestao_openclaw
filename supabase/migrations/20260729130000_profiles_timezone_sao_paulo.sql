-- Fuso horário padrão para novos perfis (tenants): Brasil (São Paulo).

alter table public.profiles
  alter column timezone set default 'America/Sao_Paulo';
