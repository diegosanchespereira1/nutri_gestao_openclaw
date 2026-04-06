-- Preço por porção: rendimento, margem e impostos — Story 6.5 (FR30–FR33).

alter table public.technical_recipes
  add column if not exists portions_yield integer not null default 1,
  add column if not exists margin_percent numeric(10, 4) not null default 0,
  add column if not exists tax_percent numeric(10, 4) not null default 0;

alter table public.technical_recipes
  drop constraint if exists technical_recipes_portions_yield_check;

alter table public.technical_recipes
  add constraint technical_recipes_portions_yield_check
    check (portions_yield >= 1);

alter table public.technical_recipes
  drop constraint if exists technical_recipes_margin_percent_check;

alter table public.technical_recipes
  add constraint technical_recipes_margin_percent_check
    check (margin_percent >= 0 and margin_percent <= 1000);

alter table public.technical_recipes
  drop constraint if exists technical_recipes_tax_percent_check;

alter table public.technical_recipes
  add constraint technical_recipes_tax_percent_check
    check (tax_percent >= 0 and tax_percent <= 100);
