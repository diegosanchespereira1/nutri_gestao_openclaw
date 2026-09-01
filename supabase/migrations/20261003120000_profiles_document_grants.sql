-- Permite ao TITULAR gravar o próprio documento fiscal, e só a ele.
-- Plano: docs/plano-limites-tenant-e-billing.md §7 (T6)
--
-- Depende de 20261001120000_profiles_tenant_document.sql (colunas + índice único).
--
-- Duas coisas acontecem aqui:
--   1) grant aditivo de UPDATE nas duas colunas novas — sem ele o onboarding e o
--      perfil falham com "permission denied for column document_kind", porque
--      public.profiles tem grants por COLUNA desde 20260401120000_profiles_role.sql;
--   2) trigger que (a) impede um MEMBRO DE EQUIPE de registar documento no
--      próprio profile — o grant é por papel (authenticated), não por linha, e
--      sem o trigger um membro poderia ocupar um CNPJ no índice único global e
--      bloquear a conta legítima — e (b) regista a mudança em
--      subscription_events. A trilha fica no trigger, e não na Server Action,
--      porque `subscription_events` só aceita INSERT de super_admin: o tenant
--      que preenche o documento no onboarding ou no perfil não conseguiria
--      escrever o evento a partir da aplicação.
--
-- Depende também de 20261001122000 (tipo de evento `tenant_document_set`).

grant update (document_kind, document_id) on public.profiles to authenticated;

create or replace function public.profiles_document_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.document_id is null then
    return new;
  end if;

  -- Nada muda em relação ao que já estava gravado: deixa passar (ex.: update de
  -- outra coluna numa linha que já tem documento).
  if tg_op = 'UPDATE'
     and new.document_id is not distinct from old.document_id
     and new.document_kind is not distinct from old.document_kind then
    return new;
  end if;

  if exists (
    select 1
    from public.team_members tm
    where tm.member_user_id = new.user_id
      and tm.is_active
  ) then
    raise exception
      'DOCUMENTO_SOMENTE_TITULAR: este utilizador é membro de equipe, não titular de conta'
      using errcode = 'P0001';
  end if;

  insert into public.subscription_events (
    tenant_user_id, event_type, old_value, new_value, metadata, created_by
  ) values (
    new.user_id,
    'tenant_document_set',
    case when tg_op = 'UPDATE' then old.document_id else null end,
    new.document_id,
    jsonb_build_object(
      'document_kind', new.document_kind,
      'origem', tg_op
    ),
    auth.uid()
  );

  return new;
end;
$$;

comment on function public.profiles_document_guard() is
  'Impede que um membro de equipe registe CPF/CNPJ de tenant e regista a mudança em subscription_events. Ver docs/plano-limites-tenant-e-billing.md §7.';

drop trigger if exists profiles_document_owner_only on public.profiles;
drop trigger if exists profiles_document_guard on public.profiles;

create trigger profiles_document_guard
  before insert or update of document_kind, document_id on public.profiles
  for each row
  execute function public.profiles_document_guard();
