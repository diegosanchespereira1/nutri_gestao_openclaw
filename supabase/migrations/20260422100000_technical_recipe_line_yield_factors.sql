-- Fatores de correção (custo / matéria-prima) e cocção (nutrição TACO) — Story 6.4 (FR29).

alter table public.technical_recipe_lines
  add column if not exists correction_factor numeric(10, 4) not null default 1,
  add column if not exists cooking_factor numeric(10, 4) not null default 1;

alter table public.technical_recipe_lines
  drop constraint if exists technical_recipe_lines_correction_factor_check;

alter table public.technical_recipe_lines
  add constraint technical_recipe_lines_correction_factor_check
    check (correction_factor > 0 and correction_factor <= 10);

alter table public.technical_recipe_lines
  drop constraint if exists technical_recipe_lines_cooking_factor_check;

alter table public.technical_recipe_lines
  add constraint technical_recipe_lines_cooking_factor_check
    check (cooking_factor > 0 and cooking_factor <= 10);
