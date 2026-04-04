-- Matéria-prima e custo unitário (Story 6.3 / FR28).

create table if not exists public.professional_raw_materials (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  price_unit text not null,
  unit_price_brl numeric(14, 4) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_raw_materials_name_len check (char_length(trim(name)) > 0),
  constraint professional_raw_materials_price_unit_check check (
    price_unit in ('g', 'kg', 'ml', 'l', 'un')
  ),
  constraint professional_raw_materials_unit_price_pos check (unit_price_brl > 0)
);

create index if not exists professional_raw_materials_owner_name_idx
  on public.professional_raw_materials (owner_user_id, lower(name));

alter table public.professional_raw_materials enable row level security;

create policy "professional_raw_materials_select_own"
  on public.professional_raw_materials for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "professional_raw_materials_insert_own"
  on public.professional_raw_materials for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "professional_raw_materials_update_own"
  on public.professional_raw_materials for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "professional_raw_materials_delete_own"
  on public.professional_raw_materials for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

create or replace function public.professional_raw_materials_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists professional_raw_materials_set_updated_at on public.professional_raw_materials;

create trigger professional_raw_materials_set_updated_at
before update on public.professional_raw_materials
for each row
execute function public.professional_raw_materials_touch_updated_at ();

grant select, insert, update, delete on public.professional_raw_materials to authenticated;

alter table public.technical_recipe_lines
  add column if not exists raw_material_id uuid references public.professional_raw_materials (id) on delete set null;

create index if not exists technical_recipe_lines_raw_material_idx
  on public.technical_recipe_lines (raw_material_id)
  where raw_material_id is not null;
