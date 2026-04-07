# Story 8.1: Status de pagamento por cliente

**Sprint / tracking:** `sprint-status.yaml` → `8-1-status-pagamento-cliente: done` (épico 8 `in-progress`).  
**Último incremento (código + docs):** 2026-04-07 — períodos *Total* e *Intervalo* (`win_*` / `from_*` / `to_*`), paleta de alto contraste, `financial-chart-shell`, `financial-charts-ux-pattern.md`, testes em `chart-window` / séries.

## Objetivo

Registar e filtrar o estado das cobranças e ver inadimplência agregada por cliente (FR41).

## Entrega

- **Abas** em `/financeiro`: **Resumo e análise** (gráficos + tabela por cliente) e **Cobranças e registos** (nova cobrança, filtros, tabela). URL `?tab=resumo|operacoes`; filtros/erro abrem por defeito em operações.
- **Gráficos** (fusos do profissional): período **por gráfico** — `win_{rec,flux,atr}` = `months` \| `total` \| `range`; com `months` usar `m_*` (3/6/12/24; padrão 6); com `range` usar `from_*` e `to_*` (`YYYY-MM-DD`). **Total** = desde o primeiro mês com dados até ao mês actual (recebido: primeiro `paid_at`; fluxo: mínimo entre criação e pagamento). Inadimplência: filtro de `due_date` coerente com o modo (janela em meses, todo o histórico, ou intervalo). **Cores** semânticas em `lib/financeiro/financial-charts-visual.ts` + shell `financial-chart-shell.tsx`. **Exportar CSV** por cartão (`lib/csv/download-csv.ts`, `FinancialChartCardTools`).
- Tabela **Estado de pagamento por cliente** na aba Resumo; ligação por cliente usa `?client=<uuid>&tab=operacoes`.
- **Filtros** na lista: `status` e `client` com `tab=operacoes` e parâmetros de janela dos gráficos preservados (`win_*`, `m_*`, `from_*`, `to_*`).
- **Ficha do cliente**: cartão pagamentos + link `/financeiro?client=…&tab=operacoes`.
- `client_id` e `created_at` em `FinancialChargeListRow`; `loadFinancialChargesForClient`; revalidação da ficha ao criar/marcar paga.

## Ficheiros

- `lib/financeiro/charge-filters.ts`, `chart-period.ts`, `chart-window.ts`, `client-payment-status.ts`, `financial-chart-series.ts`, `financial-charts-visual.ts`, `financeiro-tab.ts` (+ testes)
- `lib/csv/download-csv.ts`
- `components/financeiro/financeiro-page-tabs.tsx`, `financial-chart-card-tools.tsx`, `financial-chart-shell.tsx`, `financial-*-bar-chart.tsx`
- `app/(app)/financeiro/page.tsx`, `app/(app)/clientes/[id]/editar/page.tsx`
- `lib/actions/financial-charges.ts`, `lib/types/financial-charges.ts`
- `planning-artifacts/ux-design-specification.md` (secção módulo financeiro), `planning-artifacts/financial-charts-ux-pattern.md`
