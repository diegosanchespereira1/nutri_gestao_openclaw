-- Editor de planos no admin: super_admin pode SELECT (incl. inativos) e UPDATE.
-- Leitura pública (anon/authenticated) continua limitada a is_active = true.

drop policy if exists "subscription_plans_select_super_admin" on public.subscription_plans;
create policy "subscription_plans_select_super_admin"
  on public.subscription_plans
  for select
  to authenticated
  using (public.is_super_admin());

drop policy if exists "subscription_plans_update_super_admin" on public.subscription_plans;
create policy "subscription_plans_update_super_admin"
  on public.subscription_plans
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select, update on public.subscription_plans to authenticated;
