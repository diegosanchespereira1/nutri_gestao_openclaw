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
    case "arm_circumference_for_age":
    case "triceps_skinfold_for_age":
    case "subscapular_skinfold_for_age":
    case "head_circumference_for_age":
      return { low: row[P3], high: row[P97] }; // adequado: P3–P97
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
    default:
      // Novos indicadores têm valor passado diretamente — não passam por aqui.
      return null;
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
  const {
    sex,
    ageMonths,
    weightKg,
    heightCm,
    method,
    armCircumferenceCm,
    tricepsSkinfoldMm,
    subscapularSkinfoldMm,
    headCircumferenceCm,
  } = input;

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

  // Novos indicadores WHO 3–60 meses (CB, PCT, SE) e 0–60 meses (PC).
  // A tabela de referência já limita a cobertura: se `ageMonths` não tiver linha,
  // getReference retorna null e buildResult marca outOfRange=true.
  const newIndicatorInputs: Array<{ indicator: ChildIndicator; value: number | null }> = [
    { indicator: "arm_circumference_for_age",    value: armCircumferenceCm    },
    { indicator: "triceps_skinfold_for_age",     value: tricepsSkinfoldMm     },
    { indicator: "subscapular_skinfold_for_age", value: subscapularSkinfoldMm },
    { indicator: "head_circumference_for_age",   value: headCircumferenceCm   },
  ];

  for (const { indicator, value } of newIndicatorInputs) {
    const row = getReference(indicator, sex, ageMonths, method);
    indicators.push(buildResult(indicator, ageMonths, value, row));
  }

  return { bmi, indicators };
}
