-- Epic 9 — Portal externo e LGPD menores
-- Stories 9.1 (utilizadores externos), 9.2 (permissões), 9.3 (portal), 9.4 (consentimento menores)

-- ── Utilizadores externos (Story 9.1) ────────────────────────────────────────
-- Familiares, médicos ou pacientes convidados pelo profissional.

create table if not exists public.external_portal_users (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,

  email text not null,
  full_name text not null,
  role text not null default 'viewer',   -- 'viewer' | 'guardian'
  magic_link_token text,                 -- token para acesso por magic link
  magic_link_expires_at timestamptz,
  last_access_at timestamptz,

  -- Link para paciente (pode ser null se acesso genérico)
  patient_id uuid references public.patients (id) on delete set null,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint external_portal_users_role_check
    check (role in ('viewer', 'guardian')),
  constraint external_portal_users_email_owner_uq
    unique (owner_user_id, email)
);

create index if not exists ext_portal_users_owner_idx
  on public.external_portal_users (owner_user_id);

create index if not exists ext_portal_users_token_idx
  on public.external_portal_users (magic_link_token)
  where magic_link_token is not null;

alter table public.external_portal_users enable row level security;

drop policy if exists "ext_portal_users_select_own" on public.external_portal_users;
create policy "ext_portal_users_select_own"
  on public.external_portal_users for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists "ext_portal_users_insert_own" on public.external_portal_users;
create policy "ext_portal_users_insert_own"
  on public.external_portal_users for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "ext_portal_users_update_own" on public.external_portal_users;
create policy "ext_portal_users_update_own"
  on public.external_portal_users for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "ext_portal_users_delete_own" on public.external_portal_users;
create policy "ext_portal_users_delete_own"
  on public.external_portal_users for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

grant select, insert, update, delete on public.external_portal_users to authenticated;

-- ── Permissões por categoria de dado (Story 9.2) ─────────────────────────────

create table if not exists public.external_access_permissions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  external_user_id uuid not null references public.external_portal_users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,

  -- Categorias de dados que o externo pode ver
  can_view_reports boolean not null default false,
  can_view_measurements boolean not null default false,
  can_view_exams boolean not null default false,
  can_view_nutrition_plan boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ext_access_perm_uq unique (external_user_id, patient_id)
);

create index if not exists ext_access_perm_owner_idx
  on public.external_access_permissions (owner_user_id);

create index if not exists ext_access_perm_ext_user_idx
  on public.external_access_permissions (external_user_id);

alter table public.external_access_permissions enable row level security;

drop policy if exists "ext_access_perm_select_own" on public.external_access_permissions;
create policy "ext_access_perm_select_own"
  on public.external_access_permissions for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists "ext_access_perm_insert_own" on public.external_access_permissions;
create policy "ext_access_perm_insert_own"
  on public.external_access_permissions for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "ext_access_perm_update_own" on public.external_access_permissions;
create policy "ext_access_perm_update_own"
  on public.external_access_permissions for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists "ext_access_perm_delete_own" on public.external_access_permissions;
create policy "ext_access_perm_delete_own"
  on public.external_access_permissions for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

grant select, insert, update, delete on public.external_access_permissions to authenticated;

-- ── Consentimento parental — menores (Story 9.4) ──────────────────────────────
-- LGPD Art. 14: exige consentimento do responsável legal.

create table if not exists public.patient_parental_consents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,

  guardian_full_name text not null,
  guardian_document_id text,
  guardian_relationship text not null,      -- 'parent' | 'legal_guardian' | 'other'
  guardian_email text,

  consented_at timestamptz not null default now(),
  consent_text text not null,               -- texto exibido ao responsável no momento do consentimento
  ip_address text,                          -- optional para trilho de auditoria

  revoked_at timestamptz,
  revocation_reason text,

  created_at timestamptz not null default now(),

  constraint patient_parental_consents_relationship_check
    check (guardian_relationship in ('parent', 'legal_guardian', 'other'))
);

create index if not exists patient_consents_patient_idx
  on public.patient_parental_consents (patient_id);

create index if not exists patient_consents_owner_idx
  on public.patient_parental_consents (owner_user_id);

alter table public.patient_parental_consents enable row level security;

drop policy if exists "patient_consents_select_own" on public.patient_parental_consents;
create policy "patient_consents_select_own"
  on public.patient_parental_consents for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists "patient_consents_insert_own" on public.patient_parental_consents;
create policy "patient_consents_insert_own"
  on public.patient_parental_consents for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

-- Consentimentos não se editam (apenas se revoga com novo registo)
drop policy if exists "patient_consents_update_own" on public.patient_parental_consents;
create policy "patient_consents_update_own"
  on public.patient_parental_consents for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

grant select, insert, update on public.patient_parental_consents to authenticated;

-- ── Updated_at triggers ───────────────────────────────────────────────────────

create or replace function public.external_portal_users_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists ext_portal_users_set_updated_at on public.external_portal_users;
create trigger ext_portal_users_set_updated_at
before update on public.external_portal_users
for each row execute function public.external_portal_users_touch_updated_at();

create or replace function public.ext_access_perm_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists ext_access_perm_set_updated_at on public.external_access_permissions;
create trigger ext_access_perm_set_updated_at
before update on public.external_access_permissions
for each row execute function public.ext_access_perm_touch_updated_at();
