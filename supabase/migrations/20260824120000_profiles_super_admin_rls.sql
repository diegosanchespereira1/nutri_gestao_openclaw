-- Super admin: listar e gerir perfis de tenants sem service_role no servidor.
-- Corrige painel /admin/tenants quando SUPABASE_SERVICE_ROLE_KEY não está disponível (ex.: dev local).

drop policy if exists "profiles_select_super_admin" on public.profiles;
create policy "profiles_select_super_admin"
  on public.profiles for select
  to authenticated
  using (public.is_super_admin());

drop policy if exists "profiles_update_super_admin" on public.profiles;
create policy "profiles_update_super_admin"
  on public.profiles for update
  to authenticated
  using (
    public.is_super_admin()
    and role not in ('admin', 'super_admin')
  )
  with check (
    public.is_super_admin()
    and role not in ('admin', 'super_admin')
  );

-- View admin_platform_metrics é só service_role; expor via RPC com verificação de super_admin.
create or replace function public.get_admin_platform_metrics()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_super_admin() then
    raise exception 'Acesso negado';
  end if;

  select row_to_json(m.*) into result
  from public.admin_platform_metrics m;

  return result;
end;
$$;

revoke all on function public.get_admin_platform_metrics() from public;
grant execute on function public.get_admin_platform_metrics() to authenticated;
grant execute on function public.get_admin_platform_metrics() to service_role;
