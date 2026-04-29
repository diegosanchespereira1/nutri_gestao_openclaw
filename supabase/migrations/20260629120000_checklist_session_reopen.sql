-- Reabertura de checklist finalizado: auditoria + versionamento de PDFs obsoletos.

-- ─── checklist_fill_pdf_exports: versão e obsolescência ───────────────────
alter table public.checklist_fill_pdf_exports
  add column if not exists version_number int,
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by_version int;

update public.checklist_fill_pdf_exports e
set version_number = r.vn
from (
  select
    id,
    row_number() over (
      partition by session_id
      order by created_at asc
    ) as vn
  from public.checklist_fill_pdf_exports
) r
where e.id = r.id
  and e.version_number is null;

alter table public.checklist_fill_pdf_exports
  alter column version_number set not null;

comment on column public.checklist_fill_pdf_exports.version_number is
  'Número sequencial do PDF dentro da sessão (1-based).';
comment on column public.checklist_fill_pdf_exports.superseded_at is
  'Quando não nulo, o PDF deixou de ser o vigente (ex.: reabertura do checklist).';
comment on column public.checklist_fill_pdf_exports.superseded_by_version is
  'Versão do PDF que substituiu este ficheiro após nova geração.';

create index if not exists checklist_fill_pdf_exports_session_version_idx
  on public.checklist_fill_pdf_exports (session_id, version_number desc);

-- ─── Eventos de reabertura (auditoria) ─────────────────────────────────────
create table if not exists public.checklist_fill_session_reopen_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.checklist_fill_sessions (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  reopened_by_user_id uuid not null references auth.users (id) on delete restrict,
  reopened_by_label text not null default '',
  reopened_by_role text not null,
  justification text not null,
  previous_approved_at timestamptz not null,
  previous_score_percentage numeric(5, 2),
  created_at timestamptz not null default now(),
  constraint checklist_fill_session_reopen_events_role_check check (
    reopened_by_role in ('owner', 'admin')
  ),
  constraint checklist_fill_session_reopen_events_justification_len check (
    char_length(trim(justification)) >= 10
  )
);

create index if not exists checklist_fill_session_reopen_events_session_created_idx
  on public.checklist_fill_session_reopen_events (session_id, created_at desc);

comment on table public.checklist_fill_session_reopen_events is
  'Auditoria de reabertura de checklist após aprovação do dossiê (justificativa obrigatória).';

alter table public.checklist_fill_session_reopen_events enable row level security;

grant select, insert on public.checklist_fill_session_reopen_events to authenticated;

create policy "checklist_fill_session_reopen_events_select_workspace"
  on public.checklist_fill_session_reopen_events for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

create policy "checklist_fill_session_reopen_events_insert_workspace"
  on public.checklist_fill_session_reopen_events for insert
  to authenticated
  with check (
    reopened_by_user_id = (select auth.uid())
    and owner_user_id = (select public.workspace_account_owner_id())
    and exists (
      select 1
      from public.checklist_fill_sessions s
      join public.establishments e on e.id = s.establishment_id
      join public.clients c on c.id = e.client_id
      where
        s.id = session_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
    and (
      (select auth.uid()) = (select public.workspace_account_owner_id())
      or exists (
        select 1
        from public.profiles p
        where
          p.user_id = (select auth.uid())
          and p.role = 'admin'
      )
    )
  );
