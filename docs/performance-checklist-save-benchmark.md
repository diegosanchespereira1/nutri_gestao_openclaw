# Benchmark de recurso — Salvar Checklist

Este runbook padroniza a medicao **before/after** no VPS para validar ganho real das correcoes de performance.

## 1) Identificar container da aplicacao

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

## 2) Rodar benchmark baseline (before)

```bash
bash scripts/perf/checklist-save-benchmark.sh "<container_name>" 120 before
```

Durante os 120s, execute o mesmo cenario funcional:
- mesma checklist
- mesma conta
- mesma sequencia de cliques (ex.: 20x salvar)

## 3) Aplicar alteracoes e medir after

```bash
bash scripts/perf/checklist-save-benchmark.sh "<container_name>" 120 after
```

## 4) Comparar resultados

Arquivos de resumo:
- `/tmp/checklist-benchmark/before-summary.txt`
- `/tmp/checklist-benchmark/after-summary.txt`

Campos principais:
- `cpu_avg` e `cpu_max`
- `mem_avg` e `mem_max`

## 5) Criterio de aceite sugerido

- `cpu_avg` cair >= 20%
- `cpu_max` cair >= 15%
- sem aumento persistente de `mem_max` entre execucoes equivalentes

## 6) Observacoes importantes

- Evite executar outras cargas pesadas no servidor durante o teste.
- Sempre rode em horarios comparaveis para reduzir ruido.
- Se o resultado oscilar muito, rode 3 vezes e use mediana.
