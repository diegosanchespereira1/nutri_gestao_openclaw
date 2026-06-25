-- Módulos habilitados do workspace — leitura por qualquer membro autenticado.

create or replace function public.workspace_enabled_modules()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.enabled_modules, '{}'::jsonb)
  from public.profiles p
  where p.user_id = public.workspace_account_owner_id()
  limit 1;
$$;

grant execute on function public.workspace_enabled_modules() to authenticated;

comment on function public.workspace_enabled_modules() is
  'JSONB enabled_modules do titular do workspace — usado no middleware e guards de módulo.';
