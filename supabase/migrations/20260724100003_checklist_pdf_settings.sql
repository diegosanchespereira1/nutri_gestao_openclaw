-- Configurações visuais do PDF de checklist por workspace.
-- Permite personalizar as cores do cabeçalho e o logotipo no PDF gerado.

create table if not exists public.checklist_pdf_settings (
  id                  uuid primary key default gen_random_uuid(),
  workspace_owner_id  uuid not null references auth.users(id) on delete cascade,
  header_bg_color     text not null default '#1B2A4A',
  header_text_color   text not null default '#FFFFFF',
  accent_color        text not null default '#0EA5E9',
  updated_at          timestamptz not null default now()
);

-- Unicidade: uma linha por workspace
create unique index if not exists checklist_pdf_settings_workspace_owner_id_unique
  on public.checklist_pdf_settings (workspace_owner_id);

comment on table public.checklist_pdf_settings is
  'Personalização visual (cores de cabeçalho) do PDF de dossiê gerado por workspace.';

comment on column public.checklist_pdf_settings.header_bg_color is
  'Cor de fundo do cabeçalho em hex (ex: #1B2A4A).';

comment on column public.checklist_pdf_settings.header_text_color is
  'Cor do texto principal do cabeçalho em hex (ex: #FFFFFF).';

comment on column public.checklist_pdf_settings.accent_color is
  'Cor de acento (borda, eyebrow, score box) em hex (ex: #0EA5E9).';

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.checklist_pdf_settings enable row level security;

-- Titular lê as próprias configurações
create policy "owner_select_pdf_settings"
  on public.checklist_pdf_settings for select
  using (workspace_owner_id = auth.uid());

-- Membros da equipa lêem as configurações do titular
create policy "team_select_pdf_settings"
  on public.checklist_pdf_settings for select
  using (
    exists (
      select 1 from public.team_members
      where team_members.owner_user_id = checklist_pdf_settings.workspace_owner_id
        and team_members.member_user_id = auth.uid()
    )
  );

-- Apenas o titular pode gravar
create policy "owner_upsert_pdf_settings"
  on public.checklist_pdf_settings for insert
  with check (workspace_owner_id = auth.uid());

create policy "owner_update_pdf_settings"
  on public.checklist_pdf_settings for update
  using (workspace_owner_id = auth.uid())
  with check (workspace_owner_id = auth.uid());
