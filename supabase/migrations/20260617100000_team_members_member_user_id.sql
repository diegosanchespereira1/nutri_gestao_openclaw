-- Vínculo automático entre membro de equipe e utilizador autenticável.

alter table public.team_members
  add column if not exists member_user_id uuid references auth.users (id) on delete set null;

create index if not exists team_members_member_user_id_idx
  on public.team_members (member_user_id)
  where member_user_id is not null;
