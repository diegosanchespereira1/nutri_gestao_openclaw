-- Receitas ao nível do cliente PJ (sem estabelecimento) para reutilização em vários estabelecimentos.
-- client_id obrigatório; establishment_id opcional (NULL = catálogo do cliente).

alter table public.technical_recipes
  add column if not exists client_id uuid references public.clients (id) on delete restrict;

update public.technical_recipes r
set client_id = e.client_id
from public.establishments e
where
  r.establishment_id is not null
  and e.id = r.establishment_id
  and r.client_id is null;

alter table public.technical_recipes
  alter column client_id set not null;

alter table public.technical_recipes
  alter column establishment_id drop not null;

create index if not exists technical_recipes_client_created_idx
  on public.technical_recipes (client_id, created_at desc);

create index if not exists technical_recipes_client_null_est_idx
  on public.technical_recipes (client_id, created_at desc)
  where establishment_id is null;

create or replace function public.technical_recipes_set_client_from_establishment ()
returns trigger
language plpgsql
as $$
begin
  if new.establishment_id is not null then
    select e.client_id into new.client_id
    from public.establishments e
    where e.id = new.establishment_id;
    if new.client_id is null then
      raise exception 'technical_recipes: establishment_id inválido';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists technical_recipes_bi_set_client_id on public.technical_recipes;

create trigger technical_recipes_bi_set_client_id
before insert or update of establishment_id on public.technical_recipes
for each row
execute function public.technical_recipes_set_client_from_establishment ();

-- RLS: technical_recipes
drop policy if exists "technical_recipes_select_own" on public.technical_recipes;
drop policy if exists "technical_recipes_insert_own" on public.technical_recipes;
drop policy if exists "technical_recipes_update_own" on public.technical_recipes;
drop policy if exists "technical_recipes_delete_own" on public.technical_recipes;

create policy "technical_recipes_select_own"
  on public.technical_recipes for select
  to authenticated
  using (
    (
      establishment_id is not null
      and exists (
        select 1
        from public.establishments e
        join public.clients c on c.id = e.client_id
        where
          e.id = establishment_id
          and c.owner_user_id = (select auth.uid())
      )
    )
    or (
      establishment_id is null
      and exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select auth.uid())
      )
    )
  );

create policy "technical_recipes_insert_own"
  on public.technical_recipes for insert
  to authenticated
  with check (
    (
      establishment_id is not null
      and exists (
        select 1
        from public.establishments e
        join public.clients c on c.id = e.client_id
        where
          e.id = establishment_id
          and c.owner_user_id = (select auth.uid())
          and c.kind = 'pj'
      )
    )
    or (
      establishment_id is null
      and exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select auth.uid())
          and c.kind = 'pj'
      )
    )
  );

create policy "technical_recipes_update_own"
  on public.technical_recipes for update
  to authenticated
  using (
    (
      establishment_id is not null
      and exists (
        select 1
        from public.establishments e
        join public.clients c on c.id = e.client_id
        where
          e.id = establishment_id
          and c.owner_user_id = (select auth.uid())
      )
    )
    or (
      establishment_id is null
      and exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select auth.uid())
      )
    )
  )
  with check (
    (
      establishment_id is not null
      and exists (
        select 1
        from public.establishments e
        join public.clients c on c.id = e.client_id
        where
          e.id = establishment_id
          and c.owner_user_id = (select auth.uid())
          and c.kind = 'pj'
      )
    )
    or (
      establishment_id is null
      and exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select auth.uid())
          and c.kind = 'pj'
      )
    )
  );

create policy "technical_recipes_delete_own"
  on public.technical_recipes for delete
  to authenticated
  using (
    (
      establishment_id is not null
      and exists (
        select 1
        from public.establishments e
        join public.clients c on c.id = e.client_id
        where
          e.id = establishment_id
          and c.owner_user_id = (select auth.uid())
      )
    )
    or (
      establishment_id is null
      and exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select auth.uid())
      )
    )
  );

-- RLS: technical_recipe_lines (acesso via receita com estabelecimento OU só cliente)
drop policy if exists "technical_recipe_lines_select_own" on public.technical_recipe_lines;
drop policy if exists "technical_recipe_lines_insert_own" on public.technical_recipe_lines;
drop policy if exists "technical_recipe_lines_update_own" on public.technical_recipe_lines;
drop policy if exists "technical_recipe_lines_delete_own" on public.technical_recipe_lines;

create policy "technical_recipe_lines_select_own"
  on public.technical_recipe_lines for select
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              join public.clients c on c.id = e.client_id
              where
                e.id = r.establishment_id
                and c.owner_user_id = (select auth.uid())
            )
          )
          or (
            r.establishment_id is null
            and exists (
              select 1
              from public.clients c
              where
                c.id = r.client_id
                and c.owner_user_id = (select auth.uid())
            )
          )
        )
    )
  );

create policy "technical_recipe_lines_insert_own"
  on public.technical_recipe_lines for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              join public.clients c on c.id = e.client_id
              where
                e.id = r.establishment_id
                and c.owner_user_id = (select auth.uid())
                and c.kind = 'pj'
            )
          )
          or (
            r.establishment_id is null
            and exists (
              select 1
              from public.clients c
              where
                c.id = r.client_id
                and c.owner_user_id = (select auth.uid())
                and c.kind = 'pj'
            )
          )
        )
    )
  );

create policy "technical_recipe_lines_update_own"
  on public.technical_recipe_lines for update
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              join public.clients c on c.id = e.client_id
              where
                e.id = r.establishment_id
                and c.owner_user_id = (select auth.uid())
            )
          )
          or (
            r.establishment_id is null
            and exists (
              select 1
              from public.clients c
              where
                c.id = r.client_id
                and c.owner_user_id = (select auth.uid())
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              join public.clients c on c.id = e.client_id
              where
                e.id = r.establishment_id
                and c.owner_user_id = (select auth.uid())
                and c.kind = 'pj'
            )
          )
          or (
            r.establishment_id is null
            and exists (
              select 1
              from public.clients c
              where
                c.id = r.client_id
                and c.owner_user_id = (select auth.uid())
                and c.kind = 'pj'
            )
          )
        )
    )
  );

create policy "technical_recipe_lines_delete_own"
  on public.technical_recipe_lines for delete
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              join public.clients c on c.id = e.client_id
              where
                e.id = r.establishment_id
                and c.owner_user_id = (select auth.uid())
            )
          )
          or (
            r.establishment_id is null
            and exists (
              select 1
              from public.clients c
              where
                c.id = r.client_id
                and c.owner_user_id = (select auth.uid())
            )
          )
        )
    )
  );

-- Favoritos: permitir templates ao nível do cliente (sem estabelecimento).
drop policy if exists "technical_recipe_template_favorites_insert_own"
  on public.technical_recipe_template_favorites;

create policy "technical_recipe_template_favorites_insert_own"
  on public.technical_recipe_template_favorites for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and r.is_template = true
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              where
                e.id = r.establishment_id
                and e.client_id = client_id
            )
          )
          or (
            r.establishment_id is null
            and r.client_id = client_id
          )
        )
    )
  );
