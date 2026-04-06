# Story 2.7: Wizard de onboarding e sugestão de portarias

## Contexto

Profissionais novos precisam de contexto (institucional vs clínico), primeiro cliente na carteira e visibilidade das portarias do catálogo alinhadas à UF e ao tipo de estabelecimento.

## Objetivo

Após o registo, o utilizador é guiado num wizard de 4 passos, cria o primeiro cliente (PF ou PJ + estabelecimento), vê sugestões de templates de portaria quando aplicável e conclui no dashboard com CTA para agendar visita.

## Stack & Convenções

- Next.js App Router, middleware Supabase, `profiles.onboarding_completed_at`
- Server Action `completeOnboardingAction` em `lib/actions/onboarding.ts`
- UI: wizard cliente em `components/onboarding/onboarding-wizard.tsx`
- Filtro de templates: `filterTemplatesForEstablishment` (reutilização Epic 3)

## Critérios de Aceitação

- Dada a primeira sessão pós-registo, ao escolher tipo de trabalho, o wizard pede dados do primeiro cliente/estabelecimento e sugere portarias por UF/tipo quando há template no catálogo.
- Ao concluir, redireciona para `/inicio?bemvindo=1` com bloco “pronto para agendar visita” e ligação a `/visitas/nova`.

## Arquivos principais

- `supabase/migrations/20260427100000_profiles_onboarding_story_2_7.sql`
- `lib/supabase/middleware.ts`, `lib/auth-paths.ts`, `app/(app)/layout.tsx`
- `app/(app)/onboarding/page.tsx`, `components/onboarding/onboarding-wizard.tsx`
- `app/(app)/inicio/page.tsx` (banner `bemvindo=1`)

## Definição de Pronto

- [x] Migração com backfill para contas existentes
- [x] RLS/GRANT em `profiles` para novas colunas
- [x] TypeScript sem erros
- [x] Sprint status atualizado
