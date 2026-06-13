/**
 * Percentil a partir das colunas tabeladas do documento — apenas aritmética.
 *
 * Nada de fórmula estatística: usamos os números escritos na tabela e
 * interpolamos linearmente entre as duas colunas vizinhas.
 */
import { PERCENTILE_KEYS, type PercentileRow } from "./types";

/** Valor numérico de cada coluna de percentil (1, 3, 5, 15, ... 99). */
const PERCENTILE_VALUES: readonly number[] = PERCENTILE_KEYS.map((k) =>
  Number(k.slice(1)),
);

export type PercentileLookup = {
  /** Percentil aproximado (1–99) ou null se fora dos limites tabelados. */
  percentile: number | null;
  /** Sinaliza extremos não cobertos pelas colunas do documento. */
  boundary: "below_p1" | "above_p99" | null;
};

/**
 * Em qual percentil cai `value`, dado a linha de percentis da idade/sexo.
 * - Abaixo da coluna P1 → `{ percentile: null, boundary: "below_p1" }`.
 * - Acima da coluna P99 → `{ percentile: null, boundary: "above_p99" }`.
 * - Entre duas colunas → interpolação linear do percentil.
 */
export function percentileForValue(
  value: number,
  row: PercentileRow,
): PercentileLookup {
  if (!Number.isFinite(value) || row.length !== PERCENTILE_VALUES.length) {
    return { percentile: null, boundary: null };
  }

  const first = row[0];
  const last = row[row.length - 1];

  if (value < first) return { percentile: null, boundary: "below_p1" };
  if (value > last) return { percentile: null, boundary: "above_p99" };

  for (let i = 0; i < row.length - 1; i++) {
    const lo = row[i];
    const hi = row[i + 1];
    if (value >= lo && value <= hi) {
      const pLo = PERCENTILE_VALUES[i];
      const pHi = PERCENTILE_VALUES[i + 1];
      if (hi === lo) return { percentile: pLo, boundary: null };
      const frac = (value - lo) / (hi - lo);
      const percentile = pLo + frac * (pHi - pLo);
      return { percentile: Math.round(percentile * 10) / 10, boundary: null };
    }
  }

  // Casos de bordas exatas tratados acima; fallback defensivo.
  return { percentile: null, boundary: null };
}

/** Valor tabelado de uma coluna de percentil (usado para desenhar a curva). */
export function valueForPercentile(
  key: (typeof PERCENTILE_KEYS)[number],
  row: PercentileRow,
): number | null {
  const idx = PERCENTILE_KEYS.indexOf(key);
  if (idx < 0 || idx >= row.length) return null;
  return row[idx];
}
