-- 1. Grant UPDATE so rename action can work (previously only select/insert/delete)
grant update on public.client_custom_segments to authenticated;

-- 2. Column to track which built-in key a row overrides (null = fully custom)
alter table public.client_custom_segments
  add column if not exists built_in_key text;

-- 3. Enforce at most one override per built-in key per workspace
create unique index if not exists client_custom_segments_owner_builtin_unique
  on public.client_custom_segments (owner_user_id, built_in_key)
  where built_in_key is not null;
