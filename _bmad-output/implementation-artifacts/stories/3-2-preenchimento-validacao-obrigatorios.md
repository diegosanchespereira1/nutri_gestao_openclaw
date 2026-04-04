# Story 3.2: Preenchimento com validação de obrigatórios

## Estado

Concluída (implementação em 2026-04-04).

## Resumo

Rascunhos de preenchimento (`checklist_fill_sessions` + `checklist_fill_item_responses`) por utilizador e estabelecimento, com guarda ao alterar cada item e validação por secção antes de avançar (cliente + servidor). Itens obrigatórios exigem Conforme ou Não conforme; Não conforme exige nota. Itens opcionais podem ser Não aplicável.

## Artefactos

| Área | Ficheiro |
|------|----------|
| Migração | `supabase/migrations/20260405140000_checklist_fill_sessions.sql` |
| Validação (partilhada) | `lib/types/checklist-fill.ts` — `validateChecklistSection` |
| Actions | `lib/actions/checklist-fill.ts` |
| UI rascunho | `app/(app)/checklists/preencher/[sessionId]/page.tsx` |
| Wizard | `components/checklists/checklist-fill-wizard.tsx` |
| Catálogo | `components/checklists/checklist-catalog.tsx` — form `startChecklistFill` |
| Template por ID | `lib/actions/checklists.ts` — `loadChecklistTemplateBundleById` |

## DoD

- [x] RLS em sessões e respostas (isolamento por `user_id`)
- [x] Validação inline + bloqueio à mudança de secção
- [x] Persistência intermédia (upsert / delete ao limpar)
- [x] `tsc` / eslint nos ficheiros tocados
