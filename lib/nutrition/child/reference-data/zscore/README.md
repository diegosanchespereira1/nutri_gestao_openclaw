# Tabelas de referência por escore-Z (a carregar depois)

Este diretório é o **encaixe** para a edição "escore-Z" das curvas OMS/SISVAN.
Enquanto estiver vazio, o critério escore-Z aparece desabilitado na avaliação
infantil (ver `lib/nutrition/child/reference-data/registry.ts`).

## Como ativar

1. Coloque os PDFs/CSVs da edição escore-Z em `docs/referencias_avaliacao/zscore/`.
2. Rode o gerador no modo zscore:

   ```bash
   python3 scripts/reference/build_child_growth_tables.py --source=zscore
   ```

3. O script deve preencher `ZSCORE_TABLES` em `index.ts` com a mesma estrutura dos
   datasets de percentil (chave = idade em meses), porém com as colunas de
   escore-Z do documento (ex.: `-3SD, -2SD, -1SD, mediana, +1SD, +2SD, +3SD`).
4. Nenhuma outra mudança é necessária: `registry.isMethodAvailable('zscore')`
   passa a `true` e a UI oferece o critério.

> Importante: assim como no caminho de percentil, **seguimos os números do
> documento** — não recalculamos por fórmula estatística.
