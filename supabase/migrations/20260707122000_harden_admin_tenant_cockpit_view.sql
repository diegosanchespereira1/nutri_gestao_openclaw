-- Hardening da view de cockpit administrativo:
-- 1) Força execução com privilégios do invocador (respeita RLS)
-- 2) Remove exposição para anon/authenticated
-- 3) Mantém acesso apenas por service_role (uso interno no backend)

alter view public.admin_tenant_cockpit
  set (security_invoker = true);

revoke all on table public.admin_tenant_cockpit from anon;
revoke all on table public.admin_tenant_cockpit from authenticated;

grant select on table public.admin_tenant_cockpit to service_role;
