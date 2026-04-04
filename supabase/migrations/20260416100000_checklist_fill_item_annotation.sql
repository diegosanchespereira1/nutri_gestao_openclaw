-- Story 4-4: anotações textuais opcionais por item (contexto além da descrição de NC).

alter table public.checklist_fill_item_responses
  add column if not exists item_annotation text;

comment on column public.checklist_fill_item_responses.item_annotation is
  'Nota opcional de contexto por item (FR20). Distinto de note (descrição obrigatória em NC).';
