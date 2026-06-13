# Tabela de Peso por Estatura (P/E) — a carregar depois

O indicador **Peso/Estatura** consta do procedimento, mas depende da curva OMS
de **peso-por-comprimento (0–2 anos)** e **peso-por-estatura (2–5 anos)**, que
ainda não foi fornecida. Enquanto `WEIGHT_FOR_HEIGHT_TABLES` estiver vazio, o
indicador P/E **não é exibido** na avaliação (ativa-se sozinho ao ser populado).

## Formato esperado

```ts
export const WEIGHT_FOR_HEIGHT_TABLES: Record<string, PercentileTable> = {
  female: {
    // chave = estatura em MILÍMETROS (inteiro). Ex.: 1200 = 120,0 cm.
    450: [ /* P1, P3, P5, P15, P25, P50, P75, P85, P95, P97, P99 */ ],
    451: [ ... ],
    // ...
  },
  male: { /* idem */ },
};
```

## Como ativar

1. Coloque os PDFs/CSVs de peso-por-estatura em `docs/referencias_avaliacao/`.
2. Estenda `scripts/reference/build_child_growth_tables.py` para emitir este
   dataset (chave por estatura em mm).
3. Pronto: `isWeightForHeightAvailable()` passa a `true` e o P/E aparece na
   avaliação, classificado pelos mesmos rótulos do procedimento
   (Peso baixo / adequado ou eutrófico / elevado para a estatura).

> Seguimos os números do documento — sem fórmula estatística.
