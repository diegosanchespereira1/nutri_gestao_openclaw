-- Story 11.2: Log de Auditoria — Ações em Dados de Pacientes
-- Tabela imutável para compliance LGPD Art. 5(e), Art. 32
-- Registra: quem, quando, o quê (tabela, operação, valores antes/depois)
-- Retenção: 12 meses

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Tabela audit_log
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  -- Tenant isolamento
  user_id uuid not null references auth.users (id) on delete cascade,
  -- O quê foi feito
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  record_id uuid,
  -- Valores (mascarados via função)
  old_values jsonb,
  new_values jsonb,
  -- Contexto
  ip_address inet,
  user_agent text,
  -- Timestamps
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired'))
);

-- Índices de performance e retenção
create index if not exists audit_log_user_created_idx
  on public.audit_log (user_id, created_at desc);
create index if not exists audit_log_table_record_idx
  on public.audit_log (table_name, record_id);
create index if not exists audit_log_expires_idx
  on public.audit_log (expires_at) where status = 'active';

-- RLS — Cada tenant vê apenas seus próprios logs
alter table public.audit_log enable row level security;

create policy "audit_log_select_own"
  on public.audit_log for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Insert apenas via trigger (não manualmente)
-- Update/Delete bloqueados (imutabilidade, exceto status pós-expiração)
create policy "audit_log_update_status"
  on public.audit_log for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'active')
  with check (
    user_id = (select auth.uid())
    and status = 'expired'
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Função de Mascaramento de Campos Sensíveis
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.mask_sensitive_fields(data jsonb)
returns jsonb as $$
declare
  result jsonb := data;
  doc_value text;
  birth_value text;
begin
  -- Mascarar document_id (CPF): mostrar apenas últimos 2 dígitos
  if result ? 'document_id' then
    doc_value := result->>'document_id';
    if doc_value is not null and length(doc_value) = 11 then
      result := jsonb_set(result, '{document_id}',
        to_jsonb('***.***.***-' || right(doc_value, 2)));
    end if;
  end if;

  -- Mascarar birth_date: mostrar apenas YYYY-**-**
  if result ? 'birth_date' then
    birth_value := result->>'birth_date';
    if birth_value is not null and length(birth_value) >= 10 then
      result := jsonb_set(result, '{birth_date}',
        to_jsonb(left(birth_value, 5) || '**-**'));
    end if;
  end if;

  return result;
end;
$$ language plpgsql;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Triggers de Auto-Logging para Tabelas de Paciente
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.audit_log_trigger()
returns trigger as $$
declare
  old_masked jsonb;
  new_masked jsonb;
begin
  -- Mascarar valores sensíveis
  old_masked := case
    when tg_op = 'DELETE' then mask_sensitive_fields(row_to_json(old)::jsonb)
    when tg_op = 'UPDATE' then mask_sensitive_fields(row_to_json(old)::jsonb)
    else null
  end;

  new_masked := case
    when tg_op = 'INSERT' then mask_sensitive_fields(row_to_json(new)::jsonb)
    when tg_op = 'UPDATE' then mask_sensitive_fields(row_to_json(new)::jsonb)
    else null
  end;

  -- Inserir log
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at
  ) values (
    case
      when tg_op = 'DELETE' then (old.user_id)::uuid
      when tg_op = 'UPDATE' then (new.user_id)::uuid
      when tg_op = 'INSERT' then (new.user_id)::uuid
    end,
    tg_table_name,
    tg_op,
    case
      when tg_op = 'DELETE' then (old.id)::uuid
      else (new.id)::uuid
    end,
    old_masked,
    new_masked,
    now() + interval '12 months'
  );

  return case
    when tg_op = 'DELETE' then old
    else new
  end;
end;
$$ language plpgsql security definer;

-- Triggers para tabelas de paciente
drop trigger if exists audit_patients_ai on public.patients;
create trigger audit_patients_ai
  after insert on public.patients
  for each row execute function audit_log_trigger();

drop trigger if exists audit_patients_au on public.patients;
create trigger audit_patients_au
  after update on public.patients
  for each row execute function audit_log_trigger();

drop trigger if exists audit_patients_ad on public.patients;
create trigger audit_patients_ad
  after delete on public.patients
  for each row execute function audit_log_trigger();

-- Triggers para avaliações nutricionais
drop trigger if exists audit_patient_nutrition_assessments_ai on public.patient_nutrition_assessments;
create trigger audit_patient_nutrition_assessments_ai
  after insert on public.patient_nutrition_assessments
  for each row execute function audit_log_trigger();

drop trigger if exists audit_patient_nutrition_assessments_au on public.patient_nutrition_assessments;
create trigger audit_patient_nutrition_assessments_au
  after update on public.patient_nutrition_assessments
  for each row execute function audit_log_trigger();

drop trigger if exists audit_patient_nutrition_assessments_ad on public.patient_nutrition_assessments;
create trigger audit_patient_nutrition_assessments_ad
  after delete on public.patient_nutrition_assessments
  for each row execute function audit_log_trigger();

-- Grant
grant select, update on public.audit_log to authenticated;
