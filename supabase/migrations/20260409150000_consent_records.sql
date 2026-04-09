-- Story 11.3: Registo de Consentimentos Digital
-- Tabela imutável para compliance LGPD Art. 7 (consentimento como base legal)
-- Registra: consentimento do paciente/responsável com evidência (timestamp, IP, user-agent)
-- Retenção: Consentimentos ativos indefinidamente; revogados 3 anos (prova de revogação)

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Enum de tipos de consentimento
-- ──────────────────────────────────────────────────────────────────────────────

create type public.consent_type as enum (
  'uso_dados',
  'compartilhamento_externo',
  'pesquisa',
  'marketing'
);

create type public.consent_status as enum (
  'active',
  'revogado'
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Tabela consent_records — Evidência de consentimento
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),

  -- Tenant isolamento
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Paciente e contexto
  patient_id uuid not null references public.patients (id) on delete cascade,

  -- Tipo e status
  consent_type public.consent_type not null,
  status public.consent_status not null default 'active',

  -- Consentimento parental (para menores)
  is_parental_consent boolean not null default false,
  parental_consent_name text,

  -- Rastreabilidade legal (LGPD Art. 32)
  ip_address inet,
  user_agent text,

  -- Revogação
  revocation_reason text,
  revoked_at timestamptz,

  -- Referência de documento (ex: link para termo assinado)
  document_reference text,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices de performance
create index if not exists consent_records_patient_user_idx
  on public.consent_records (patient_id, user_id, created_at desc);
create index if not exists consent_records_active_idx
  on public.consent_records (patient_id, status) where status = 'active';
create index if not exists consent_records_type_idx
  on public.consent_records (patient_id, consent_type, status);

-- RLS — Cada tenant vê apenas consentimentos de seus próprios pacientes
alter table public.consent_records enable row level security;

create policy "consent_select_own"
  on public.consent_records for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "consent_insert_own"
  on public.consent_records for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      select user_id from public.patients where id = patient_id
    ) = (select auth.uid())
  );

create policy "consent_update_own"
  on public.consent_records for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'active'
  )
  with check (
    user_id = (select auth.uid())
    and (status = 'active' or status = 'revogado')
    and (
      select user_id from public.patients where id = patient_id
    ) = (select auth.uid())
  );

-- Delete bloqueado (imutabilidade)
-- Revogar consentimento = UPDATE com status = 'revogado'

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Trigger para updated_at
-- ──────────────────────────────────────────────────────────────────────────────

create or replace trigger consent_records_update_at
  before update on public.consent_records
  for each row
  execute function public.update_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Função para validar consentimento parental obrigatório para menores
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.validate_parental_consent()
returns trigger as $$
declare
  patient_age int;
  existing_parental_consent boolean;
begin
  -- Calcular idade do paciente
  select
    extract(year from age(p.date_of_birth))::int,
    exists(
      select 1 from public.consent_records cr
      where cr.patient_id = new.patient_id
        and cr.user_id = new.user_id
        and cr.is_parental_consent = true
        and cr.status = 'active'
        and cr.consent_type = new.consent_type
    )
  into patient_age, existing_parental_consent
  from public.patients p
  where p.id = new.patient_id;

  -- Se paciente < 18 anos e é novo consentimento (não revogação/update)
  if patient_age < 18 and new.status = 'active' then
    -- Se não é consentimento parental e não existe parental ativo
    if not new.is_parental_consent and not existing_parental_consent then
      raise exception 'Consentimento de responsável legal é obrigatório para pacientes menores de 18 anos';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create or replace trigger consent_records_validate_parental
  before insert or update on public.consent_records
  for each row
  execute function public.validate_parental_consent();

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Auditoria de consentimentos em audit_log (Story 11.2 integration)
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.audit_consent_records_ai()
returns trigger as $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    new_values,
    ip_address,
    user_agent,
    created_at
  ) values (
    new.user_id,
    'consent_records',
    'INSERT',
    new.id,
    jsonb_build_object(
      'patient_id', new.patient_id,
      'consent_type', new.consent_type::text,
      'is_parental_consent', new.is_parental_consent
    ),
    new.ip_address,
    new.user_agent,
    new.created_at
  );
  return new;
end;
$$ language plpgsql;

create or replace trigger audit_consent_records_ai
  after insert on public.consent_records
  for each row
  execute function public.audit_consent_records_ai();

create or replace function public.audit_consent_records_au()
returns trigger as $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    created_at
  ) values (
    new.user_id,
    'consent_records',
    'UPDATE',
    new.id,
    jsonb_build_object(
      'status', old.status::text,
      'revocation_reason', old.revocation_reason
    ),
    jsonb_build_object(
      'status', new.status::text,
      'revocation_reason', new.revocation_reason,
      'revoked_at', new.revoked_at
    ),
    new.ip_address,
    new.user_agent,
    new.updated_at
  );
  return new;
end;
$$ language plpgsql;

create or replace trigger audit_consent_records_au
  after update on public.consent_records
  for each row
  execute function public.audit_consent_records_au();

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Campo is_parental_consent em patients (se não existir)
-- ──────────────────────────────────────────────────────────────────────────────

alter table public.patients
  add column if not exists is_parental_consent boolean not null default false;

alter table public.patients
  add column if not exists parental_consent_name text;
