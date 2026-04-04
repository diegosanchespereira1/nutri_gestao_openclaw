-- Receitas (ficha técnica) e linhas de ingrediente — Story 6.1 (FR26).

create table if not exists public.technical_recipes (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint technical_recipes_status_check check (
    status in ('draft', 'published')
  ),
  constraint technical_recipes_name_len check (char_length(trim(name)) > 0)
);

create index if not exists technical_recipes_establishment_created_idx
  on public.technical_recipes (establishment_id, created_at desc);

alter table public.technical_recipes enable row level security;

create policy "technical_recipes_select_own"
  on public.technical_recipes for select
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "technical_recipes_insert_own"
  on public.technical_recipes for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "technical_recipes_update_own"
  on public.technical_recipes for update
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "technical_recipes_delete_own"
  on public.technical_recipes for delete
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create table if not exists public.technical_recipe_lines (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.technical_recipes (id) on delete cascade,
  sort_order int not null,
  ingredient_name text not null,
  quantity numeric(14, 4) not null,
  unit text not null,
  notes text,
  constraint technical_recipe_lines_sort_nonneg check (sort_order >= 0),
  constraint technical_recipe_lines_quantity_pos check (quantity > 0),
  constraint technical_recipe_lines_ingredient_len check (char_length(trim(ingredient_name)) > 0),
  constraint technical_recipe_lines_unit_check check (
    unit in ('g', 'kg', 'ml', 'l', 'un')
  )
);

create index if not exists technical_recipe_lines_recipe_sort_idx
  on public.technical_recipe_lines (recipe_id, sort_order);

alter table public.technical_recipe_lines enable row level security;

create policy "technical_recipe_lines_select_own"
  on public.technical_recipe_lines for select
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      join public.establishments e on e.id = r.establishment_id
      join public.clients c on c.id = e.client_id
      where
        r.id = recipe_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "technical_recipe_lines_insert_own"
  on public.technical_recipe_lines for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.technical_recipes r
      join public.establishments e on e.id = r.establishment_id
      join public.clients c on c.id = e.client_id
      where
        r.id = recipe_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "technical_recipe_lines_update_own"
  on public.technical_recipe_lines for update
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      join public.establishments e on e.id = r.establishment_id
      join public.clients c on c.id = e.client_id
      where
        r.id = recipe_id
        and c.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.technical_recipes r
      join public.establishments e on e.id = r.establishment_id
      join public.clients c on c.id = e.client_id
      where
        r.id = recipe_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "technical_recipe_lines_delete_own"
  on public.technical_recipe_lines for delete
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      join public.establishments e on e.id = r.establishment_id
      join public.clients c on c.id = e.client_id
      where
        r.id = recipe_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create or replace function public.technical_recipes_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists technical_recipes_set_updated_at on public.technical_recipes;

create trigger technical_recipes_set_updated_at
before update on public.technical_recipes
for each row
execute function public.technical_recipes_touch_updated_at ();

grant select, insert, update, delete on public.technical_recipes to authenticated;
grant select, insert, update, delete on public.technical_recipe_lines to authenticated;
