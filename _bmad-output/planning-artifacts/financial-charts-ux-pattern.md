# Padrão UX — Gráficos do módulo Financeiro

Documento de apoio à **especificação UX** (`ux-design-specification.md`), alinhado a uma leitura **centrada no utilizador** (clareza da tarefa, pouca carga cognitiva, decisões rápidas em contexto profissional).

## Contexto e necessidade

- **Quem:** nutricionista ou equipa que gere cobranças e quer ver tendência de recebimento, fluxo de lançamento vs liquidação e concentração de inadimplência.
- **Objetivo:** responder em segundos a «como está o dinheiro?» sem confundir métricas nem períodos entre gráficos.
- **Restrição:** dados sensíveis e leitura frequentemente em desktop com cartões claros (`bg-white`).

## Princípios de desenho

1. **Uma métrica, uma cor** — séries temporais com uma única grandeza usam cor fixa (ex.: recebido = verde); não se rodam cores por barra só por estética, para não sugerir categorias inexistentes.
2. **Contraste entre dimensões** — no gráfico comparativo, **lançado** e **recebido no mês** usam cores afastadas no espectro (laranja vs azul) para distinguir imediatamente «novo débito» de «entrada de caixa».
3. **Ranking legível** — barras horizontais de inadimplência usam **tons quentes distintos** por posição para separar clientes sem depender só do rótulo.
4. **Período explícito** — o utilizador escolhe **tipo de janela** (últimos N meses, total até hoje, intervalo por datas) **por gráfico**; o estado reflecte-se na URL para partilha e refresco.
5. **Superfície consistente** — grelha, eixos e tooltip partilham o mesmo «shell» (`financial-chart-shell.tsx`) para comportamento previsível entre os três gráficos.

## Implementação de referência

| Ficheiro | Função |
|----------|--------|
| `lib/financeiro/financial-charts-visual.ts` | Constantes de cor semântica e comentário de racional |
| `components/financeiro/financial-chart-shell.tsx` | Margens, grelha, tooltip |
| `components/financeiro/financial-*-bar-chart.tsx` | Aplicação das cores e do shell |
| `lib/financeiro/chart-window.ts` | Modos de período e serialização na URL |

## Evolução

Ajustar a paleta apenas em conjunto (claro/escuro) para manter coerência; qualquer novo gráfico financeiro deve reutilizar o shell e documentar aqui o mapeamento métrica → cor.
