# Story 3.3: Checklists customizados do profissional

## Estado

Concluída (2026-04-04).

## Resumo

- Tabelas `checklist_custom_templates`, `checklist_custom_sections`, `checklist_custom_items` (RLS por `user_id`).
- Duplicação profunda do catálogo global para um estabelecimento (`duplicateGlobalTemplateAction`).
- Editor: novas secções e itens extra (`is_user_extra = true`).
- Sessões de preenchimento aceitam `custom_template_id` XOR `template_id`; respostas referenciam `custom_item_id` XOR `template_item_id`.

## Ficheiros-chave

- `supabase/migrations/20260406120000_checklist_custom_templates.sql`
- `lib/actions/checklist-custom.ts`
- `lib/checklists/parse-applies-to.ts` (partilhado com catálogo)
- `lib/actions/checklist-fill.ts` (sessões e respostas híbridas)
- `app/(app)/checklists/personalizados/page.tsx`
- `app/(app)/checklists/personalizados/[id]/editar/page.tsx`
- `components/checklists/custom-checklist-editor.tsx`
- `components/checklists/checklist-catalog.tsx` — botão **Personalizar**
- `components/checklists/checklist-fill-wizard.tsx` — `itemResponseSource`

## Nota

Ligação formal a **visitas** (Épico 4) fica para stories futuras; o modelo personalizado já é **aplicável** em rascunhos de preenchimento para o estabelecimento vinculado.
