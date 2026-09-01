-- Aplicação dos limites por tenant — no banco, não só na aplicação.
-- Plano: docs/plano-limites-tenant-e-billing.md §5.1
--
-- POR QUE NO BANCO: existem muitos caminhos de inserção (formulário, onboarding,
-- importação CSV, e futuramente o job de cópia da Fase 6). Validar só na Server
-- Action deixa buraco em todos os que forem esquecidos. O trigger é a garantia;
-- a checagem em TypeScript (lib/limits) existe para dar mensagem amigável ANTES
-- de bater aqui.
--
-- Vale para TODOS os papéis, inclusive service_role — de propósito.
--
-- Concorrência: dois inserts simultâneos no limite podem passar (estouro de 1).
-- Aceito. Se algum dia precisar de exatidão estrita, usar
-- pg_advisory_xact_lock(hashtext(v_owner::text)) no início da função.

create or replace function public.enforce_tenant_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner   uuid;
  v_found   boolean := false;
  v_enabled boolean;
  v_unlim   boolean;
  v_limit   integer;
  v_count   integer;
begin
  -- ── clients ───────────────────────────────────────────────────────────────
  if tg_table_name = 'clients' then
    v_owner := new.owner_user_id;

    select true, tl.clients_limit_enabled, tl.clients_limit
      into v_found, v_enabled, v_limit
      from public.tenant_limits tl
     where tl.tenant_user_id = v_owner;

    -- Sem linha de limites (não deveria acontecer): não bloqueia.
    if not coalesce(v_found, false) or not coalesce(v_enabled, false) then
      return new;
    end if;

    select count(*) into v_count
      from public.clients c
     where c.owner_user_id = v_owner;

    if v_count >= coalesce(v_limit, 0) then
      raise exception 'LIMITE_CLIENTES_ATINGIDO'
        using errcode = 'P0001',
              detail  = format('limite=%s atual=%s', v_limit, v_count);
    end if;

    return new;

  -- ── patients ──────────────────────────────────────────────────────────────
  elsif tg_table_name = 'patients' then
    v_owner := new.user_id;

    select true, tl.patients_limit_enabled, tl.patients_limit
      into v_found, v_enabled, v_limit
      from public.tenant_limits tl
     where tl.tenant_user_id = v_owner;

    if not coalesce(v_found, false) or not coalesce(v_enabled, false) then
      return new;
    end if;

    select count(*) into v_count
      from public.patients p
     where p.user_id = v_owner;

    if v_count >= coalesce(v_limit, 0) then
      raise exception 'LIMITE_PACIENTES_ATINGIDO'
        using errcode = 'P0001',
              detail  = format('limite=%s atual=%s', v_limit, v_count);
    end if;

    return new;

  -- ── team_members ──────────────────────────────────────────────────────────
  elsif tg_table_name = 'team_members' then
    v_owner := new.owner_user_id;

    select true, tl.team_members_enabled, tl.team_members_unlimited, tl.team_members_limit
      into v_found, v_enabled, v_unlim, v_limit
      from public.tenant_limits tl
     where tl.tenant_user_id = v_owner;

    if not coalesce(v_found, false) then
      return new;
    end if;

    if not coalesce(v_enabled, false) then
      raise exception 'EQUIPE_DESABILITADA' using errcode = 'P0001';
    end if;

    -- Membro inativo não ocupa assento — só conta quem entra ativo.
    if not new.is_active or coalesce(v_unlim, false) then
      return new;
    end if;

    select count(*) into v_count
      from public.team_members tm
     where tm.owner_user_id = v_owner
       and tm.is_active;

    if v_count >= coalesce(v_limit, 0) then
      raise exception 'LIMITE_EQUIPE_ATINGIDO'
        using errcode = 'P0001',
              detail  = format('limite=%s atual=%s', v_limit, v_count);
    end if;

    return new;
  end if;

  return new;
end;
$$;

comment on function public.enforce_tenant_limit() is
  'Aplica tenant_limits em INSERT de clients/patients/team_members e na reativação de membro.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists clients_enforce_limit on public.clients;
create trigger clients_enforce_limit
  before insert on public.clients
  for each row execute function public.enforce_tenant_limit();

drop trigger if exists patients_enforce_limit on public.patients;
create trigger patients_enforce_limit
  before insert on public.patients
  for each row execute function public.enforce_tenant_limit();

drop trigger if exists team_members_enforce_limit on public.team_members;
create trigger team_members_enforce_limit
  before insert on public.team_members
  for each row execute function public.enforce_tenant_limit();

-- BEFORE INSERT não basta em team_members: reativar um membro ocupa um assento
-- sem passar por INSERT. Sem isto, o tenant desativa um membro, cadastra outro e
-- reativa o primeiro — dois assentos pelo preço de um.
drop trigger if exists team_members_enforce_limit_on_reactivate on public.team_members;
create trigger team_members_enforce_limit_on_reactivate
  before update on public.team_members
  for each row
  when (old.is_active is false and new.is_active is true)
  execute function public.enforce_tenant_limit();

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper de leitura — usado pelo painel e pela RPC de restauração (§10.2.1)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.tenant_has_free_patient_slot(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not coalesce((select tl.patients_limit_enabled
                         from public.tenant_limits tl
                        where tl.tenant_user_id = p_tenant), false)
      then true
    else (select count(*) from public.patients p where p.user_id = p_tenant)
       < coalesce((select tl.patients_limit
                     from public.tenant_limits tl
                    where tl.tenant_user_id = p_tenant), 0)
  end;
$$;

revoke execute on function public.tenant_has_free_patient_slot(uuid) from public, anon;
grant execute on function public.tenant_has_free_patient_slot(uuid) to authenticated;
