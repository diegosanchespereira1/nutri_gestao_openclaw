# Story 4.1: Agendamento de visitas

## Estado

Concluída (núcleo 2026-04-03; extensões FR17 2026-04-10 — tipo de visita, equipe, modal duplo clique).

## Resumo

Visitas agendadas (`scheduled_visits`) com destino estabelecimento ou paciente, **tipo de visita** (`visit_kind`), **atribuição opcional** a membro da equipe (`assigned_team_member_id` → `team_members`), data/hora, prioridade e notas. Listagem na rota `/visitas` (grelha semanal horária + lista), criação em `/visitas/nova`, detalhe em `/visitas/[id]`. **Duplo clique** num compromisso abre modal de detalhe. Cadastro da equipe em `/equipe`. No início e na agenda, CTA «Iniciar visita» só no dia civil de Lisboa e com estado agendada; `/visitas/[id]/iniciar` valida o mesmo e serve de stub até à story 4.2.

## Artefactos

| Área | Ficheiro |
|------|----------|
| Migração | `supabase/migrations/20260407100000_scheduled_visits.sql`, `20260410120000_team_members_visit_kind.sql` |
| FR17 ext. (doc) | `_bmad-output/implementation-artifacts/fr17-visitas-tipo-equipe-modal.md` |
| Equipe | `lib/actions/team-members.ts`, `app/(app)/equipe/**`, `components/team/team-member-form.tsx` |
| Modal detalhe | `components/ui/dialog.tsx`, `components/visits/visit-quick-detail-dialog.tsx` |
| Tipos | `lib/types/visits.ts` |
| Constantes | `lib/constants/visit-priorities.ts`, `lib/constants/visit-status.ts` |
| Data/hora UI | `lib/datetime/europe-lisbon.ts` |
| Título UI | `lib/visits/display-title.ts` |
| Actions | `lib/actions/visits.ts` |
| Formulário | `components/visits/visit-schedule-form.tsx` |
| Bloco agenda | `components/visits/visit-agenda-block.tsx` |
| Páginas | `app/(app)/visitas/page.tsx`, `nova/page.tsx`, `[id]/page.tsx`, `[id]/iniciar/page.tsx` |
| Agenda (UI) | `components/visits/visits-agenda-client.tsx` — semana Lisboa, filtros, mini-mês, painel de detalhe |
| Dashboard | `app/(app)/inicio/page.tsx` — bloco «Agenda do dia» |

## DoD

- [x] RLS na tabela (ownership via estabelecimento/paciente)
- [x] Agenda + dashboard com visitas de hoje (Europe/Lisbon)
- [x] CTA «Iniciar visita» condicional ao dia
- [x] `tsc` / eslint nos ficheiros tocados
- [x] Tipo de visita + equipe + modal (duplo clique) — 2026-04-10
