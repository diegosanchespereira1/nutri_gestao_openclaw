-- HOTFIX 2026-06-16: corrige bug de produção onde iniciar preenchimento de
-- checklist falha silenciosamente porque a coluna area_id não existe em
-- checklist_fill_sessions e a tabela establishment_areas não existe.
--
-- Contexto: o código deployado já inclui area_id no INSERT de
-- checklist_fill_sessions. As migrations 20260618100000 e 20260618110000
-- têm data futura e ainda não foram aplicadas em produção.
-- Este hotfix aplica o mínimo necessário para desbloquear o fluxo.
--
-- Idempotente: usa IF NOT EXISTS em todos os comandos.

begin;

-- ── 1. Tabela establishment_areas ────────────────────────────────────────────

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

create index if not exists establishment_areas_establishment_idx
  on public.establishment_areas (establishment_id, position);

create index if not exists establishment_areas_owner_idx
  on public.establishment_areas (owner_user_id);

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

do $$
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'establishment_areas'
      and rowsecurity = true
  ) then
    alter table public.establishment_areas enable row level security;
  end if;
end;
$$;

-- RLS (drop + recreate é idempotente)
drop policy if exists "establishment_areas_select_own" on public.establishment_areas;
create policy "establishment_areas_select_own"
  on public.establishment_areas for select
  using (owner_user_id = auth.uid());

drop policy if exists "establishment_areas_insert_own" on public.establishment_areas;
create policy "establishment_areas_insert_own"
  on public.establishment_areas for insert
  with check (owner_user_id = auth.uid());

drop policy if exists "establishment_areas_update_own" on public.establishment_areas;
create policy "establishment_areas_update_own"
  on public.establishment_areas for update
  using  (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists "establishment_areas_delete_own" on public.establishment_areas;
create policy "establishment_areas_delete_own"
  on public.establishment_areas for delete
  using (owner_user_id = auth.uid());

-- ── 2. Coluna area_id em checklist_fill_sessions ──────────────────────────

alter table public.checklist_fill_sessions
  add column if not exists area_id uuid
    references public.establishment_areas (id) on delete set null;

create index if not exists checklist_fill_sessions_area_id_idx
  on public.checklist_fill_sessions (area_id)
  where area_id is not null;

commit;
