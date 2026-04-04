# Story 6.2: Ligação TACO e informação nutricional

## Estado

Implementado em 2026-04-04.

## Referência rápida

- Migração: `supabase/migrations/20260421120000_taco_reference_foods.sql`
- Busca: `lib/actions/taco-reference-foods.ts` (`searchTacoFoodsAction`)
- UI: `components/technical-sheets/taco-line-linker.tsx`, `recipe-form.tsx`
- Cálculo: `lib/technical-recipes/recipe-nutrition.ts` + testes em `recipe-nutrition.test.ts`

## Nota

Catálogo em base é **amostra MVP**; substituição por dados oficiais prevista no épico 10.
