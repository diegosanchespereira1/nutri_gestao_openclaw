-- Categorias de negócio personalizadas por workspace.
-- O campo clients.business_segment pode armazenar um slug builtin
-- (ex: 'padaria') ou o label de uma categoria personalizada.

-- Tabela de opções personalizadas por workspace (para reusar no dropdown)
create table if not exists public.client_custom_segments (
  id          uuid        primary key default gen_random_uuid(),
  owner_user_id uuid      not null references auth.users (id) on delete cascade,
  label       text        not null,
  created_at  timestamptz not null default now(),
  constraint client_custom_segments_label_length check (char_length(trim(label)) between 1 and 80),
  constraint client_custom_segments_owner_label_unique unique (owner_user_id, label)
);

create index if not exists client_custom_segments_owner_idx
  on public.client_custom_segments (owner_user_id);

alter table public.client_custom_segments enable row level security;

create policy "client_custom_segments_workspace"
  on public.client_custom_segments for all
  to authenticated
  using  (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

grant select, insert, delete on public.client_custom_segments to authenticated;

-- Remove restrição de valores fixos: o campo agora aceita slugs builtin
-- e labels personalizados (texto livre validado na aplicação)
alter table public.clients
  drop constraint if exists clients_business_segment_check;
