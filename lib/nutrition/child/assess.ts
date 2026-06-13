/**
 * Orquestrador da avaliação infantil: calcula IMC e classifica cada indicador
 * contra a tabela de referência do critério escolhido.
 */
import { computeBmi } from "@/lib/utils/bmi";
import { classifyByPercentile } from "./classify";
import { percentileForValue } from "./percentile";
import {
  getReference,
  getReferenceByHeight,
  isWeightForHeightAvailable,
} from "./reference";
import type {
  ChildAssessmentInput,
  ChildAssessmentResult,
  ChildIndicator,
  ChildIndicatorResult,
  PercentileRow,
} from "./types";

const AGE_INDICATORS: ChildIndicator[] = [
  "weight_for_age",
  "height_for_age",
  "bmi_for_age",
];

// Índices das colunas de percentil (ver PERCENTILE_KEYS).
const P3 = 1;
const P85 = 7;
const P97 = 9;

function emptyResult(
  indicator: ChildIndicator,
  value: number | null,
  outOfRange: boolean,
): ChildIndicatorResult {
  return {
    indicator,
    value,
    percentile: null,
    z: null,
    boundary: null,
    classification: null,
    color: null,
    adequateLow: null,
    adequateHigh: null,
    outOfRange,
  };
}

/** Faixa adequada/eutrófica (referência) para o indicador, a partir da linha. */
function adequateBand(
  indicator: ChildIndicator,
  row: PercentileRow,
): { low: number | null; high: number | null } {
  switch (indicator) {
    case "bmi_for_age":
      return { low: row[P3], high: row[P85] }; // eutrofia: P3–P85
    case "weight_for_age":
    case "weight_for_height":
      return { low: row[P3], high: row[P97] }; // adequado: P3–P97
    case "height_for_age":
      return { low: row[P3], high: null }; // adequada: ≥ P3
  }
}

/** Medida que alimenta cada indicador. */
function measureFor(
  indicator: ChildIndicator,
  weightKg: number | null,
  heightCm: number | null,
  bmi: number | null,
): number | null {
  switch (indicator) {
    case "weight_for_age":
    case "weight_for_height":
      return weightKg;
    case "height_for_age":
      return heightCm;
    case "bmi_for_age":
      return bmi;
  }
}

function buildResult(
  indicator: ChildIndicator,
  ageMonths: number,
  value: number | null,
  row: PercentileRow | null,
): ChildIndicatorResult {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return emptyResult(indicator, value, false);
  }
  if (!row) return emptyResult(indicator, value, true);

  const { percentile, boundary } = percentileForValue(value, row);
  const { classification, color } = classifyByPercentile(indicator, ageMonths, value, row);
  const { low, high } = adequateBand(indicator, row);
  return {
    indicator,
    value,
    percentile,
    z: null,
    boundary,
    classification,
    color,
    adequateLow: low,
    adequateHigh: high,
    outOfRange: false,
  };
}

export function assessChild(input: ChildAssessmentInput): ChildAssessmentResult {
  const { sex, ageMonths, weightKg, heightCm, method } = input;

  const bmi =
    weightKg != null && heightCm != null ? computeBmi(heightCm, weightKg) : null;

  const indicators: ChildIndicatorResult[] = AGE_INDICATORS.map((indicator) => {
    const value = measureFor(indicator, weightKg, heightCm, bmi);
    const row = getReference(indicator, sex, ageMonths, method);
    return buildResult(indicator, ageMonths, value, row);
  });

  // Peso por Estatura (P/E): só quando a tabela estiver carregada. Indexado pela
  // estatura (não pela idade) e disponível apenas no critério percentil.
  if (method === "percentile" && isWeightForHeightAvailable() && heightCm != null) {
    const row = getReferenceByHeight(sex, heightCm);
    indicators.push(buildResult("weight_for_height", ageMonths, weightKg, row));
  }

  return { bmi, indicators };
}
