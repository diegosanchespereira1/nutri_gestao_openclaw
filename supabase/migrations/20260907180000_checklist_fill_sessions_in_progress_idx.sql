-- Checklists em andamento: dashboard e /checklists/em-andamento
-- filtram dossier_approved_at IS NULL e ordenam por updated_at.
-- Índice parcial: só linhas abertas (bem menor que a tabela completa).

create index if not exists checklist_fill_sessions_in_progress_updated_idx
  on public.checklist_fill_sessions (updated_at desc)
  where dossier_approved_at is null;

create index if not exists checklist_fill_sessions_in_progress_user_updated_idx
  on public.checklist_fill_sessions (user_id, updated_at desc)
  where dossier_approved_at is null;
