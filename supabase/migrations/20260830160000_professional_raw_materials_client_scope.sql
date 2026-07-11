-- Isolamento por cliente/estabelecimento em matérias-primas (espelha o modelo
-- já existente em technical_recipes — ver 20260523140000, 20260524100000).
-- Ver _bmad-output/planning-artifacts/plano-isolamento-cliente-receitas-materias-primas.md.
--
-- FASE 1 do plano — aditiva e sem regressão: client_id/establishment_id/contexto
-- nascem NULLABLE. Linhas com client_id IS NULL (todo o dado existente hoje)
-- continuam com o comportamento atual (visíveis a todo o tenant do dono) até
-- serem reatribuídas via planilha (scripts/database/audit-raw-materials-cross-client.sql
-- + o wizard de atualização de preços em massa estendido). Só depois de zero
-- linhas com client_id nulo é que uma migração de fechamento torna a coluna
-- NOT NULL e remove esse fallback (FASE 4).
--
-- Invariante inegociável (repetida do plano): "usar em todos os estabelecimentos"
-- nunca cruza cliente — contexto = 'REPOSITORIO' sempre carrega um client_id
-- fixo e nunca aparece para outro cliente do mesmo tenant.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. COLUNAS NOVAS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.professional_raw_materials
  add column if not exists client_id uuid references public.clients (id) on delete restrict;

alter table public.professional_raw_materials
  add column if not exists establishment_id uuid references public.establishments (id) on delete restrict;

-- Reaproveita o enum já criado para technical_recipes (mesmos dois valores,
-- mesmo significado conceitual — não há motivo para duplicar o tipo).
alter table public.professional_raw_materials
  add column if not exists contexto public.recipe_context;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CHECK: coerência entre contexto / client_id / establishment_id
--    Três estados válidos:
--    a) não migrado ainda (legado): contexto, client_id e establishment_id nulos
--    b) estabelecimento: contexto = ESTABELECIMENTO, client_id e establishment_id preenchidos
--    c) repositório do cliente: contexto = REPOSITORIO, client_id preenchido, establishment_id nulo
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.professional_raw_materials
  drop constraint if exists professional_raw_materials_contexto_check;

alter table public.professional_raw_materials
  add constraint professional_raw_materials_contexto_check
  check (
    (contexto is null and client_id is null and establishment_id is null)
    or (contexto = 'ESTABELECIMENTO' and client_id is not null and establishment_id is not null)
    or (contexto = 'REPOSITORIO' and client_id is not null and establishment_id is null)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TRIGGER: deriva client_id a partir de establishment_id (evita inconsistência
--    entre os dois campos), espelhando technical_recipes_set_client_from_establishment.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.professional_raw_materials_set_client_from_establishment ()
returns trigger
language plpgsql
as $$
begin
  if new.establishment_id is not null then
    select e.client_id into new.client_id
    from public.establishments e
    where e.id = new.establishment_id;
    if new.client_id is null then
      raise exception 'professional_raw_materials: establishment_id inválido';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists professional_raw_materials_bi_set_client_id on public.professional_raw_materials;

create trigger professional_raw_materials_bi_set_client_id
before insert or update of establishment_id on public.professional_raw_materials
for each row
execute function public.professional_raw_materials_set_client_from_establishment ();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ÍNDICES
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists professional_raw_materials_client_idx
  on public.professional_raw_materials (client_id, name)
  where client_id is not null;

create index if not exists professional_raw_materials_establishment_idx
  on public.professional_raw_materials (establishment_id)
  where establishment_id is not null;

create index if not exists professional_raw_materials_repositorio_client_idx
  on public.professional_raw_materials (client_id, name)
  where contexto = 'REPOSITORIO';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ÍNDICES ÚNICOS DE NOME — substitui o único índice único tenant-wide por
--    três índices parciais: legado (client_id nulo), repositório (por cliente)
--    e estabelecimento (por estabelecimento). Permite o mesmo nome em clientes
--    diferentes — hoje proibido sem necessidade.
-- ─────────────────────────────────────────────────────────────────────────────
drop index if exists public.professional_raw_materials_owner_name_uniq;

create unique index if not exists professional_raw_materials_legacy_name_uniq
  on public.professional_raw_materials (owner_user_id, lower(btrim(name)))
  where client_id is null;

create unique index if not exists professional_raw_materials_repositorio_name_uniq
  on public.professional_raw_materials (client_id, lower(btrim(name)))
  where contexto = 'REPOSITORIO';

create unique index if not exists professional_raw_materials_estabelecimento_name_uniq
  on public.professional_raw_materials (establishment_id, lower(btrim(name)))
  where contexto = 'ESTABELECIMENTO';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS — client_id (quando presente) é o pivot de ownership, igual a
--    technical_recipes (20260617120100). client_id IS NULL cai no fallback
--    "visível a todo o tenant do dono", igual ao comportamento anterior a esta
--    migração — nenhuma regressão para o dado ainda não migrado.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "professional_raw_materials_select_own" on public.professional_raw_materials;
drop policy if exists "professional_raw_materials_insert_own" on public.professional_raw_materials;
drop policy if exists "professional_raw_materials_update_own" on public.professional_raw_materials;
drop policy if exists "professional_raw_materials_delete_own" on public.professional_raw_materials;

create policy "professional_raw_materials_select_own"
  on public.professional_raw_materials for select
  to authenticated
  using (
    (
      client_id is null
      and owner_user_id = (select public.workspace_account_owner_id())
    )
    or (
      client_id is not null
      and exists (
        select 1 from public.clients c
        where c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
  );

create policy "professional_raw_materials_insert_own"
  on public.professional_raw_materials for insert
  to authenticated
  with check (
    (
      client_id is null
      and owner_user_id = (select public.workspace_account_owner_id())
    )
    or (
      client_id is not null
      and owner_user_id = (select public.workspace_account_owner_id())
      and exists (
        select 1 from public.clients c
        where c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
          and c.kind = 'pj'
      )
    )
  );

create policy "professional_raw_materials_update_own"
  on public.professional_raw_materials for update
  to authenticated
  using (
    (
      client_id is null
      and owner_user_id = (select public.workspace_account_owner_id())
    )
    or (
      client_id is not null
      and exists (
        select 1 from public.clients c
        where c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
  )
  with check (
    (
      client_id is null
      and owner_user_id = (select public.workspace_account_owner_id())
    )
    or (
      client_id is not null
      and owner_user_id = (select public.workspace_account_owner_id())
      and exists (
        select 1 from public.clients c
        where c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
          and c.kind = 'pj'
      )
    )
  );

create policy "professional_raw_materials_delete_own"
  on public.professional_raw_materials for delete
  to authenticated
  using (
    (
      client_id is null
      and owner_user_id = (select public.workspace_account_owner_id())
    )
    or (
      client_id is not null
      and exists (
        select 1 from public.clients c
        where c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. COMENTÁRIOS
-- ─────────────────────────────────────────────────────────────────────────────
comment on column public.professional_raw_materials.client_id is
  'Cliente dono da matéria-prima. NULL = ainda não migrado (legado, visível a todo o tenant até reatribuição). Depois da fase de fechamento do plano, torna-se NOT NULL.';

comment on column public.professional_raw_materials.establishment_id is
  'Estabelecimento específico, quando contexto = ESTABELECIMENTO. NULL quando contexto = REPOSITORIO (padrão de todos os estabelecimentos DESTE cliente — nunca de outros clientes do tenant).';

comment on column public.professional_raw_materials.contexto is
  'ESTABELECIMENTO = vinculada a um estabelecimento específico. REPOSITORIO = padrão do cliente, reutilizável em todos os estabelecimentos DESTE cliente. NULL = legado, ainda não migrado.';
