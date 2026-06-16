-- Nome da empresa/clínica (tenant). Único por workspace, guardado no profile do
-- titular (owner). Usado em PDFs, e-mails e comunicações que exibam a marca.

-- 1) Coluna no profiles do titular.
alter table public.profiles
  add column if not exists tenant_name text;

comment on column public.profiles.tenant_name is
  'Nome da empresa/clínica do tenant. Apenas preenchido no profile do titular do workspace.';

-- 2) Reader: expõe o nome do tenant para qualquer membro autenticado do
--    workspace (security definer; evita ampliar o SELECT em profiles).
create or replace function public.workspace_tenant_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.tenant_name
  from public.profiles p
  where p.user_id = (select public.workspace_account_owner_id())
  limit 1;
$$;

grant execute on function public.workspace_tenant_name() to authenticated;

-- 3) Setter: grava o nome no profile do titular (mesmo quando um membro com
--    permissão de gestão edita). Limita a 120 caracteres.
create or replace function public.set_workspace_tenant_name(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    tenant_name = nullif(left(trim(coalesce(p_name, '')), 120), ''),
    updated_at = now()
  where user_id = public.workspace_account_owner_id();
end;
$$;

grant execute on function public.set_workspace_tenant_name(text) to authenticated;
