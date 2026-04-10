-- Add classification, sector, and CMV% to technical_recipes — Story 7.1

alter table public.technical_recipes
  add column if not exists classification varchar(50),
  add column if not exists sector varchar(100),
  add column if not exists cmv_percent numeric(10, 4) not null default 25;

alter table public.technical_recipes
  drop constraint if exists technical_recipes_cmv_percent_check;

alter table public.technical_recipes
  add constraint technical_recipes_cmv_percent_check
    check (cmv_percent > 0 and cmv_percent <= 100);
