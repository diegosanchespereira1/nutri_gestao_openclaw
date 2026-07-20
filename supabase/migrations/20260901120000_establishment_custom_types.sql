-- Tipos de estabelecimento personalizados por workspace.
-- establishments.establishment_type passa a aceitar slugs built-in ou custom.

create table if not exists public.establishment_custom_types (
  id            uuid        primary key default gen_random_uuid(),
  owner_user_id uuid        not null references auth.users (id) on delete cascade,
  category      text        not null,
  label         text        not null,
  slug          text        not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint establishment_custom_types_category_check
    check (category in ('atendimento_nutricional', 'assessoria_alimentacao')),
  constraint establishment_custom_types_label_length
    check (char_length(trim(label)) between 1 and 80),
  constraint establishment_custom_types_slug_length
    check (char_length(slug) between 1 and 64),
  constraint establishment_custom_types_owner_slug_unique
    unique (owner_user_id, slug)
);

create index if not exists establishment_custom_types_owner_category_idx
  on public.establishment_custom_types (owner_user_id, category);

create unique index if not exists establishment_custom_types_owner_label_ci_idx
  on public.establishment_custom_types (owner_user_id, lower(label));

alter table public.establishment_custom_types enable row level security;

create policy "establishment_custom_types_workspace"
  on public.establishment_custom_types for all
  to authenticated
  using  (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

grant select, insert, update, delete on public.establishment_custom_types to authenticated;

-- Permite slugs custom (validação na aplicação).
alter table public.establishments
  drop constraint if exists establishments_type_check;

-- pop_templates mantém CHECK só com built-ins (POPs globais).
