-- Preços anuais padrão (~2 meses grátis = 10× mensal) para o toggle Mensal/Anual.
-- Só preenche onde ainda está null, para não sobrescrever edição manual no admin.

update public.subscription_plans
set price_annual_cents = price_monthly_cents * 10
where slug in ('starter', 'pro')
  and price_monthly_cents > 0
  and price_annual_cents is null;
