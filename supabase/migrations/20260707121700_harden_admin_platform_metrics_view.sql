-- Hardening da view de métricas administrativas:
-- 1) Força execução com privilégios do invocador (respeita RLS)
-- 2) Remove exposição para anon/authenticated
-- 3) Mantém acesso apenas por service_role (uso interno no backend)

alter view public.admin_platform_metrics
  set (security_invoker = true);

revoke all on table public.admin_platform_metrics from anon;
revoke all on table public.admin_platform_metrics from authenticated;

grant select on table public.admin_platform_metrics to service_role;
