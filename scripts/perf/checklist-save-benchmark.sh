#!/usr/bin/env bash
set -euo pipefail

# Uso:
#   bash scripts/perf/checklist-save-benchmark.sh <container_name> [duracao_segundos] [prefixo_saida]
# Exemplo:
#   bash scripts/perf/checklist-save-benchmark.sh nutricao_nutricao_app.1.abcd 120 after

CONTAINER_NAME="${1:-}"
DURATION_SECONDS="${2:-120}"
OUT_PREFIX="${3:-run}"

if [[ -z "${CONTAINER_NAME}" ]]; then
  echo "Uso: bash scripts/perf/checklist-save-benchmark.sh <container_name> [duracao_segundos] [prefixo_saida]"
  exit 1
fi

OUT_DIR="/tmp/checklist-benchmark"
RAW_FILE="${OUT_DIR}/${OUT_PREFIX}-raw.txt"
SUMMARY_FILE="${OUT_DIR}/${OUT_PREFIX}-summary.txt"

mkdir -p "${OUT_DIR}"
rm -f "${RAW_FILE}" "${SUMMARY_FILE}"

echo "Iniciando benchmark: container=${CONTAINER_NAME}, duracao=${DURATION_SECONDS}s"
echo "Enquanto roda, execute o mesmo cenário funcional (ex.: clicar em Salvar 20x)."

for _ in $(seq 1 "${DURATION_SECONDS}"); do
  # Formato: timestamp nome cpu% memUsed
  line="$(docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}' \
    | rg "^${CONTAINER_NAME}\\|" || true)"
  if [[ -n "${line}" ]]; then
    now="$(date +%T)"
    # MemUsage exemplo: 116.7MiB / 7.75GiB
    mem_used="$(echo "${line}" | awk -F'|' '{print $3}' | awk -F'/' '{print $1}' | xargs)"
    echo "${now}|${line%%|*}|$(echo "${line}" | awk -F'|' '{print $2}')|${mem_used}" >> "${RAW_FILE}"
  fi
  sleep 1
done

if [[ ! -s "${RAW_FILE}" ]]; then
  echo "Nenhuma amostra coletada. Verifique o nome do container."
  exit 1
fi

awk -F'|' '
function to_mib(mem, unit, n) {
  n = mem + 0;
  if (unit == "GiB") return n * 1024;
  if (unit == "MiB") return n;
  if (unit == "KiB") return n / 1024;
  return n;
}
{
  cpu_str=$3;
  gsub("%", "", cpu_str);
  cpu=cpu_str+0;

  mem_str=$4;
  gsub(" ", "", mem_str);
  match(mem_str, /^([0-9.]+)([KMG]iB)$/, arr);
  mem_mib=to_mib(arr[1], arr[2]);

  samples++;
  cpu_sum+=cpu;
  mem_sum+=mem_mib;
  if (cpu > cpu_max) cpu_max=cpu;
  if (mem_mib > mem_max) mem_max=mem_mib;
}
END {
  if (samples == 0) {
    print "Sem dados";
    exit 1;
  }
  printf("samples=%d\ncpu_avg=%.2f%%\ncpu_max=%.2f%%\nmem_avg=%.2fMiB\nmem_max=%.2fMiB\n",
    samples, cpu_sum/samples, cpu_max, mem_sum/samples, mem_max);
}
' "${RAW_FILE}" > "${SUMMARY_FILE}"

echo "Resumo salvo em: ${SUMMARY_FILE}"
cat "${SUMMARY_FILE}"
