-- RPC para gravar client_signature_required sem depender do cache de escrita do PostgREST
-- (útil em Supabase self-hosted após ALTER TABLE, até NOTIFY pgrst reload schema).

create or replace function public.set_checklist_client_signature_required(p_required boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'not authenticated';
  end if;

  insert into public.checklist_pdf_settings (
    workspace_owner_id,
    client_signature_required
  )
  values (v_owner, coalesce(p_required, true))
  on conflict (workspace_owner_id) do update
  set client_signature_required = excluded.client_signature_required,
      updated_at = now();
end;
$$;

revoke all on function public.set_checklist_client_signature_required(boolean) from public;
grant execute on function public.set_checklist_client_signature_required(boolean) to authenticated;

comment on function public.set_checklist_client_signature_required(boolean) is
  'Atualiza a flag de assinatura obrigatória do cliente no dossiê (workspace do titular autenticado).';
