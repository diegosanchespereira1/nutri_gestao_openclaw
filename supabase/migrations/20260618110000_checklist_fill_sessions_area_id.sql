-- Story 1.1 (cont.) — Liga sessões de checklist a áreas do estabelecimento.
--
-- area_id é nullable para manter retrocompatibilidade com todas as sessões
-- existentes. Quando o estabelecimento tiver áreas cadastradas, a action
-- startChecklistFill valida (no servidor) que area_id foi informado.

alter table public.checklist_fill_sessions
  add column if not exists area_id uuid
    references public.establishment_areas (id) on delete set null;

comment on column public.checklist_fill_sessions.area_id is
  'Área física do estabelecimento avaliada nesta sessão (nullable: sessões sem área permanecem válidas).';

create index if not exists checklist_fill_sessions_area_idx
  on public.checklist_fill_sessions (area_id)
  where area_id is not null;
