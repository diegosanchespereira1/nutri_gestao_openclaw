-- Categorias de cobrança: slugs padrão na app + opções personalizadas por workspace.
-- financial_charges.category guarda o slug builtin ou o label personalizado.

create table if not exists public.financial_charge_categories (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  constraint financial_charge_categories_label_length
    check (char_length(trim(label)) between 1 and 80)
);

create unique index if not exists financial_charge_categories_owner_label_lower_idx
  on public.financial_charge_categories (owner_user_id, lower(trim(label)));

create index if not exists financial_charge_categories_owner_idx
  on public.financial_charge_categories (owner_user_id);

alter table public.financial_charge_categories enable row level security;

create policy "financial_charge_categories_workspace"
  on public.financial_charge_categories
  for all
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

grant select, insert, delete on public.financial_charge_categories to authenticated;
revoke all on table public.financial_charge_categories from anon;

alter table public.financial_charges
  add column if not exists category text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_charges_category_length'
      and conrelid = 'public.financial_charges'::regclass
  ) then
    alter table public.financial_charges
      add constraint financial_charges_category_length
      check (
        category is null
        or char_length(trim(category)) between 1 and 80
      );
  end if;
end $$;

create index if not exists financial_charges_owner_category_idx
  on public.financial_charges (owner_user_id, category)
  where category is not null;
