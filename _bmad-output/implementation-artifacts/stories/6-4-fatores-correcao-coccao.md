# Story 6.4: Fatores de correção e cocção

## Estado

Implementado em 2026-04-05.

## Semântica (MVP)

- **Correção (custo):** `quantidade × correction_factor` na matéria-prima (ex. perdas na limpeza).
- **Cocção (TACO):** `quantidade × cooking_factor` antes de aplicar valores por 100 g.

Intervalo permitido: **0,01 a 10** (BD + Zod).

## Ficheiros

- Migração: `supabase/migrations/20260422100000_technical_recipe_line_yield_factors.sql`
- Lógica: `recipe-nutrition.ts`, `recipe-material-cost.ts`, testes associados
- UI: `components/technical-sheets/recipe-form.tsx`
