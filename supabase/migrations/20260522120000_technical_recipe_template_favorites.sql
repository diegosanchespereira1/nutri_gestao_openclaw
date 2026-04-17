-- Favoritos de templates por cliente PJ (org = client_id), partilhados entre estabelecimentos do mesmo cliente.
-- RLS: só o owner_user_id do client vê e altera; receita tem de ser template e pertencer ao mesmo client_id.

create table if not exists public.technical_recipe_template_favorites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  recipe_id uuid not null references public.technical_recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint technical_recipe_template_favorites_unique unique (client_id, recipe_id)
);

create index if not exists technical_recipe_template_favorites_client_idx
  on public.technical_recipe_template_favorites (client_id);

create index if not exists technical_recipe_template_favorites_recipe_idx
  on public.technical_recipe_template_favorites (recipe_id);

alter table public.technical_recipe_template_favorites enable row level security;

create policy "technical_recipe_template_favorites_select_own"
  on public.technical_recipe_template_favorites for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

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
      join public.establishments e on e.id = r.establishment_id
      where
        r.id = recipe_id
        and r.is_template = true
        and e.client_id = technical_recipe_template_favorites.client_id
    )
  );

create policy "technical_recipe_template_favorites_delete_own"
  on public.technical_recipe_template_favorites for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

grant select, insert, delete on public.technical_recipe_template_favorites to authenticated;

create or replace function public.technical_recipe_template_favorites_cleanup_on_untemplate ()
returns trigger
language plpgsql
as $$
begin
  if new.is_template = false and old.is_template = true then
    delete from public.technical_recipe_template_favorites
    where recipe_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists technical_recipes_clear_favorites_on_untemplate on public.technical_recipes;

create trigger technical_recipes_clear_favorites_on_untemplate
after update of is_template on public.technical_recipes
for each row
execute function public.technical_recipe_template_favorites_cleanup_on_untemplate ();
