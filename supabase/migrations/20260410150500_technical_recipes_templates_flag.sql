-- Adicionar flag de template em technical_recipes — permite que usuários criem templates para reutilizar

alter table public.technical_recipes
  add column if not exists is_template boolean not null default false;

-- Índice para buscar templates rapidamente
create index if not exists technical_recipes_is_template_idx
  on public.technical_recipes (is_template, establishment_id, created_at desc);
