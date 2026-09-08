-- Isolamento de tenant: categorias personalizadas de cobrança nunca
-- atravessam workspace. FORCE RLS impede bypass pelo dono da tabela.

alter table public.financial_charge_categories force row level security;

revoke all on table public.financial_charge_categories from public;
revoke all on table public.financial_charge_categories from anon;

grant select, insert, delete on public.financial_charge_categories to authenticated;

comment on table public.financial_charge_categories is
  'Categorias extras de cobrança por workspace. Visíveis só ao tenant dono (RLS).';
