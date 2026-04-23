-- Story 1.1 — Áreas físicas por estabelecimento.
--
-- Permite ao nutricionista cadastrar as áreas de um estabelecimento
-- (ex.: Área de Preparo Quente, Almoxarifado, Refeitório) para que cada
-- checklist possa ser aplicado individualmente por área, gerando dossiês
-- e pontuações separadas por ambiente.

create table if not exists public.establishment_areas (
  id               uuid        primary key default gen_random_uuid(),
  establishment_id uuid        not null references public.establishments (id) on delete cascade,
  owner_user_id    uuid        not null references auth.users (id) on delete cascade,
  name             text        not null check (char_length(trim(name)) > 0),
  description      text,
  position         integer     not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.establishment_areas is
  'Áreas físicas de um estabelecimento (ex.: Preparo Quente, Almoxarifado). '
  'Cada área pode ter checklists aplicados de forma independente.';

comment on column public.establishment_areas.position is
  'Ordem de exibição das áreas na UI (menor = primeiro).';

-- Índices
create index if not exists establishment_areas_establishment_idx
  on public.establishment_areas (establishment_id, position);

create index if not exists establishment_areas_owner_idx
  on public.establishment_areas (owner_user_id);

-- Atualização automática de updated_at
create or replace function public.establishment_areas_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists establishment_areas_updated_at_trg on public.establishment_areas;
create trigger establishment_areas_updated_at_trg
  before update on public.establishment_areas
  for each row execute function public.establishment_areas_set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.establishment_areas enable row level security;

-- Leitura: apenas o owner
create policy "establishment_areas_select_own"
  on public.establishment_areas
  for select
  using (owner_user_id = auth.uid());

-- Inserção: apenas o owner
create policy "establishment_areas_insert_own"
  on public.establishment_areas
  for insert
  with check (owner_user_id = auth.uid());

-- Atualização: apenas o owner
create policy "establishment_areas_update_own"
  on public.establishment_areas
  for update
  using  (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Exclusão: apenas o owner
create policy "establishment_areas_delete_own"
  on public.establishment_areas
  for delete
  using (owner_user_id = auth.uid());
