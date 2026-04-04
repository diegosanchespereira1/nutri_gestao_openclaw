# Story 5.3: Pendências financeiras no dashboard

## Estado

Implementado em 2026-04-04 (ver `epics.md` e código em `app/(app)/inicio`, `app/(app)/financeiro`, `lib/actions/financial-charges.ts`).

## Critérios de aceitação (referência)

- **Given** dados financeiros  
- **When** há valores em atraso  
- **Then** cartão ou secção mostra totais e ligação ao detalhe  

## DoD

- [x] RLS em `financial_charges`
- [x] Resumo no `/inicio` com link para `/financeiro`
- [x] Testes unitários em `lib/dashboard/financial-pending.test.ts`
