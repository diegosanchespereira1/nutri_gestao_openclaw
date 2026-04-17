-- Corrige divergência de nome em membros vinculados a contas Auth existentes.
-- Fonte canônica: auth.users.raw_user_meta_data->>'full_name'

update public.team_members as tm
set
  full_name = canonical.full_name,
  updated_at = now()
from (
  select
    u.id as auth_user_id,
    trim(u.raw_user_meta_data ->> 'full_name') as full_name
  from auth.users as u
  where nullif(trim(u.raw_user_meta_data ->> 'full_name'), '') is not null
) as canonical
where tm.member_user_id = canonical.auth_user_id
  and tm.full_name is distinct from canonical.full_name;
