-- Papel do utilizador para controlar acesso à área /admin.
-- Promover manualmente no SQL Editor (como postgres): update public.profiles set role = 'admin' where user_id = '<uuid>';

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (
    role in ('user', 'admin', 'super_admin')
  );

-- Utilizadores autenticados não podem alterar `role` via PostgREST (só full_name, crn, updated_at).
revoke update on public.profiles from authenticated;
grant update (full_name, crn, updated_at) on public.profiles to authenticated;
