-- Story: validade por item no preenchimento de checklist.
-- Permite registar a data de validade da análise por item para exibição no dossiê/PDF.

alter table public.checklist_fill_item_responses
  add column if not exists valid_until date;

comment on column public.checklist_fill_item_responses.valid_until is
  'Data de validade da análise do item (opcional). Exibida como "Válido até" no dossiê e PDF.';
