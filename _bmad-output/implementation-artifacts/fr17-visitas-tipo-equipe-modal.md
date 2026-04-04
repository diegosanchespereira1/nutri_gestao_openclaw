# FR17 — Extensão: tipo de visita, equipe, modal (2026-04-10)

## Organização das *tasks*

| # | Pedido | Estado | Notas |
|---|--------|--------|--------|
| 1 | Lista de **tipos de visita** no agendamento | Feito | `visit_kind` + UI em `/visitas/nova`; constantes em `lib/constants/visit-kinds.ts`. |
| 2 | **Profissional da equipe** que atende (opcional) | Feito | `assigned_team_member_id` + select “Eu (titular)” ou membro; RLS valida dono. |
| 3 | **Cadastro de equipe** se não existir | Feito | Rotas `/equipe`, `/equipe/nova`, `/equipe/[id]/editar`; nav “Equipe”. |
| 4 | Dados do profissional + **cargo**; **CRN só na nutrição** | Feito | `professional_area` nutrition/other + validação servidor e cliente. |
| 5 | **Duplo clique** na agenda → pop-up de detalhe | Feito | `VisitQuickDetailDialog` + `onVisitDoubleClick` na grelha e na vista lista. |

## Modelo de dados (Supabase)

- **`team_members`:** `owner_user_id`, `full_name`, `email`, `phone`, `professional_area`, `job_role`, `crn`, `notes`.
- **`scheduled_visits`:** `visit_kind` (check), `assigned_team_member_id` FK nullable → `team_members`.

Migração: `supabase/migrations/20260410120000_team_members_visit_kind.sql`.

## Artefactos de código (principais)

- `lib/actions/team-members.ts`, `lib/types/team-members.ts`, `lib/constants/team-roles.ts`
- `lib/constants/visit-kinds.ts`, `lib/types/visits.ts` (campos novos)
- `lib/actions/visits.ts` (insert + embed `team_members`)
- `components/team/team-member-form.tsx`, `app/(app)/equipe/**`
- `components/visits/visit-schedule-form.tsx`, `components/visits/visit-quick-detail-dialog.tsx`, `components/ui/dialog.tsx`
- `components/visits/visit-week-time-grid.tsx`, `components/visits/visits-agenda-client.tsx`

## Documentação de requisitos atualizada

- **`_bmad-output/planning-artifacts/prd.md`** — texto de **FR17** alinhado ao comportamento implementado.
- **`_bmad-output/planning-artifacts/epics.md`** — Story **4.1** com extensões e data.
- **`_bmad-output/planning-artifacts/ux-design-specification.md`** — nota sobre **modal por duplo clique** na secção da agenda.

## Próximos passos sugeridos (não feitos neste pacote)

- Edição de visita existente (alterar tipo, reatribuir equipe).
- Contas de login para membros da equipe (hoje são apenas registos do titular).
- Sincronização com calendário externo (Google/Apple).
