/**
 * Percentis antropométricos — adultos e idosos (CB, DCT, CMB).
 *
 * Fontes (apostila "Avaliação Nutricional no Adulto e Idoso", rev. 01/2026):
 * - Adultos: Frisancho, 1999.
 * - Idosos (60+): NHANES III.
 * - Classificação: Vitolo, 2015 (<P5 desnutrição · P5–P15 risco de desnutrição ·
 *   P15–P85 eutrofia · >P85 obesidade; para massa muscular, alta muscularidade).
 *
 * Seguimos **exatamente** os números impressos no documento (mesma política do
 * módulo infantil). Anomalias do documento estão marcadas com comentários.
 */
import type {
  AnthropometricReference,
  PatientGroup,
} from "@/lib/types/geriatric-assessments";

/** Indicadores antropométricos com tabela de percentis para adulto/idoso. */
export type AdultAnthroIndicator = "cb" | "dct" | "cmb";

export type AdultSex = "male" | "female";

/** Tabela usada: adulto (Frisancho) ou idoso 60+ (NHANES III). */
export type AdultTableMode = "adult" | "geriatric";

/** Faixa etária [minInclusive, maxExclusive). maxExclusive null = sem teto (≥80). */
type AgeBand = {
  min: number;
  maxExclusive: number | null;
  values: readonly number[];
};

type PercentileTableDef = {
  /** Colunas de percentil do documento, em ordem crescente (ex.: [5,10,...,95]). */
  percentiles: readonly number[];
  male: readonly AgeBand[];
  female: readonly AgeBand[];
  source: string;
};

const band = (
  min: number,
  maxExclusive: number | null,
  values: readonly number[],
): AgeBand => ({ min, maxExclusive, values });

// ── CB — Circunferência do braço (cm) ────────────────────────────────────────

/** CB adultos — Frisancho 1999. Percentis 5,10,15,25,50,75,85,90,95. */
const CB_ADULT: PercentileTableDef = {
  percentiles: [5, 10, 15, 25, 50, 75, 85, 90, 95],
  source: "Frisancho, 1999",
  male: [
    band(18, 25, [26.0, 27.1, 27.7, 28.7, 30.7, 33.0, 34.4, 35.4, 37.2]),
    band(25, 30, [27.0, 28.0, 28.7, 29.8, 31.8, 34.2, 35.5, 36.6, 38.3]),
    band(30, 35, [27.7, 28.7, 29.3, 30.5, 32.5, 34.9, 35.9, 36.7, 38.2]),
    // P5=24,4 conforme impresso no documento (possível erro tipográfico da fonte).
    band(35, 40, [24.4, 28.6, 29.5, 30.7, 32.9, 35.1, 36.2, 36.9, 38.2]),
    band(40, 45, [27.8, 28.9, 29.9, 31.0, 32.8, 34.9, 36.0, 36.9, 38.1]),
    band(45, 50, [27.2, 28.6, 29.4, 30.6, 32.6, 34.9, 36.1, 36.9, 38.2]),
    band(50, 55, [27.1, 28.3, 29.1, 30.2, 32.3, 34.5, 35.8, 36.8, 38.3]),
    band(55, 60, [26.8, 28.1, 29.2, 30.4, 32.3, 34.3, 35.5, 36.6, 37.8]),
    band(60, 65, [26.6, 27.8, 28.6, 29.7, 32.0, 34.0, 35.1, 36.0, 37.5]),
  ],
  female: [
    band(18, 25, [22.4, 23.3, 24.0, 24.8, 26.8, 29.2, 31.2, 32.4, 35.2]),
    band(25, 30, [23.1, 24.0, 24.5, 25.5, 27.6, 30.6, 32.5, 34.3, 37.1]),
    band(30, 35, [23.8, 24.7, 25.4, 26.4, 28.6, 32.0, 34.1, 36.0, 38.5]),
    band(35, 40, [24.1, 25.2, 25.8, 26.8, 29.4, 32.6, 35.0, 36.8, 39.0]),
    band(40, 45, [24.3, 25.4, 26.2, 27.2, 29.7, 33.2, 35.5, 37.2, 38.8]),
    band(45, 50, [24.2, 25.5, 26.3, 27.4, 30.1, 33.5, 35.6, 37.2, 40.0]),
    band(50, 55, [24.8, 26.0, 26.8, 28.0, 30.6, 33.8, 35.9, 37.5, 39.3]),
    band(55, 60, [24.8, 26.1, 27.0, 28.2, 30.9, 34.3, 36.7, 38.0, 40.0]),
    band(60, 65, [25.0, 26.1, 27.1, 28.4, 30.8, 34.0, 35.7, 37.3, 39.6]),
  ],
};

/** CB idosos — NHANES III. Percentis 10,15,25,50,75,85,90. */
const CB_ELDERLY: PercentileTableDef = {
  percentiles: [10, 15, 25, 50, 75, 85, 90],
  source: "NHANES III",
  male: [
    band(60, 70, [28.4, 29.2, 30.6, 32.7, 35.2, 36.2, 37.0]),
    band(70, 80, [27.5, 28.2, 29.3, 31.3, 33.4, 35.1, 36.1]),
    band(80, null, [25.5, 26.2, 27.3, 29.5, 31.5, 32.6, 33.3]),
  ],
  female: [
    band(60, 70, [26.2, 26.9, 28.3, 31.2, 34.3, 36.5, 38.3]),
    band(70, 80, [25.4, 26.1, 27.4, 30.1, 33.1, 35.1, 36.7]),
    band(80, null, [23.0, 23.8, 25.5, 28.4, 31.5, 33.2, 34.0]),
  ],
};

// ── DCT — Dobra cutânea tricipital (mm) ──────────────────────────────────────

/** DCT adultos — Frisancho 1999. Percentis 5,10,15,25,50,75,85,90,95. */
const DCT_ADULT: PercentileTableDef = {
  percentiles: [5, 10, 15, 25, 50, 75, 85, 90, 95],
  source: "Frisancho, 1999",
  male: [
    band(18, 25, [4.0, 5.0, 5.5, 6.5, 10.0, 14.5, 17.5, 20.0, 23.5]),
    band(25, 30, [4.0, 5.0, 6.0, 7.0, 11.0, 15.5, 19.0, 21.5, 25.0]),
    // P5 impresso truncado ("4,"); adotado 4,5 (coerente com faixas vizinhas).
    band(30, 35, [4.5, 6.0, 6.5, 8.0, 12.0, 16.5, 20.0, 22.0, 25.0]),
    band(35, 40, [4.5, 6.0, 7.0, 8.5, 12.0, 16.0, 18.5, 20.5, 24.5]),
    band(40, 45, [5.0, 6.0, 6.9, 8.0, 12.0, 16.0, 19.0, 21.5, 26.0]),
    band(45, 50, [5.0, 6.0, 7.0, 8.0, 12.0, 16.0, 19.0, 21.0, 25.0]),
    band(50, 55, [5.0, 6.0, 7.0, 8.0, 11.5, 15.0, 18.5, 20.8, 25.0]),
    band(55, 60, [5.0, 6.0, 6.5, 8.0, 11.5, 15.0, 18.0, 20.5, 25.0]),
    band(60, 65, [5.0, 6.0, 7.0, 8.0, 11.5, 15.5, 18.5, 20.5, 24.0]),
    band(65, 70, [4.5, 5.0, 6.5, 8.0, 11.0, 15.0, 18.0, 20.0, 23.5]),
    band(70, 75, [4.5, 6.0, 6.5, 8.0, 11.0, 15.0, 17.0, 19.0, 23.0]),
  ],
  female: [
    band(18, 25, [9.0, 11.0, 12.0, 14.0, 18.5, 24.5, 28.5, 31.0, 36.0]),
    band(25, 30, [10.0, 12.0, 13.0, 15.0, 20.0, 26.5, 31.0, 34.0, 38.0]),
    band(30, 35, [10.5, 13.0, 15.0, 17.0, 22.5, 29.5, 33.0, 35.5, 41.5]),
    band(35, 40, [11.0, 13.0, 15.5, 18.0, 23.5, 30.5, 35.0, 37.0, 41.0]),
    band(40, 45, [12.0, 14.0, 16.0, 19.0, 24.5, 30.5, 35.0, 37.0, 41.0]),
    band(45, 50, [12.0, 14.5, 16.5, 19.5, 25.5, 32.0, 35.5, 38.0, 42.5]),
    band(50, 55, [12.0, 15.0, 17.5, 20.5, 25.5, 32.0, 36.0, 38.5, 42.0]),
    band(55, 60, [12.0, 15.0, 17.0, 20.5, 26.0, 32.0, 36.0, 39.0, 42.5]),
    band(60, 65, [12.5, 16.0, 17.5, 20.5, 26.0, 32.0, 35.5, 38.0, 42.5]),
    band(65, 70, [12.0, 14.5, 16.0, 19.0, 25.0, 30.0, 33.5, 36.0, 40.0]),
    band(70, 75, [11.0, 13.5, 15.5, 18.0, 24.0, 29.5, 32.0, 35.0, 38.5]),
  ],
};

/** DCT idosos — NHANES III. Percentis 10,15,25,50,75,85,90. */
const DCT_ELDERLY: PercentileTableDef = {
  percentiles: [10, 15, 25, 50, 75, 85, 90],
  source: "NHANES III",
  male: [
    band(60, 70, [7.7, 8.5, 10.1, 12.7, 17.1, 20.2, 23.1]),
    band(70, 80, [7.3, 7.8, 9.0, 12.4, 16.0, 18.8, 20.6]),
    band(80, null, [6.6, 7.6, 8.7, 11.2, 13.8, 16.2, 18.0]),
  ],
  female: [
    band(60, 70, [14.5, 15.9, 18.2, 24.1, 29.7, 32.9, 34.9]),
    band(70, 80, [12.5, 14.0, 16.4, 21.8, 27.7, 30.6, 32.1]),
    band(80, null, [9.3, 11.1, 13.1, 18.1, 23.3, 26.4, 28.9]),
  ],
};

// ── CMB — Circunferência muscular do braço (cm) ──────────────────────────────

/** CMB adultos — Frisancho 1999. Percentis 5,10,25,50,75,90,95 (7 colunas). */
const CMB_ADULT: PercentileTableDef = {
  percentiles: [5, 10, 25, 50, 75, 90, 95],
  source: "Frisancho, 1999",
  male: [
    band(18, 19, [22.6, 23.7, 25.2, 26.4, 28.3, 29.8, 32.4]),
    band(19, 25, [23.8, 24.5, 25.7, 27.3, 28.9, 30.9, 32.1]),
    band(25, 35, [24.3, 25.0, 26.4, 27.9, 29.8, 31.4, 32.6]),
    band(35, 45, [24.7, 25.5, 26.9, 28.6, 30.2, 31.8, 32.7]),
    // Rótulo impresso "44.9–54.9"; interpretado como 45.0–54.9.
    band(45, 55, [23.9, 24.9, 26.5, 28.1, 30.0, 31.5, 32.6]),
    band(55, 65, [23.6, 24.5, 26.0, 27.8, 29.5, 31.0, 32.0]),
    band(65, 75, [22.3, 23.5, 25.1, 26.8, 28.4, 29.8, 30.6]),
  ],
  female: [
    band(18, 19, [17.4, 17.9, 19.1, 20.2, 21.5, 23.7, 24.5]),
    // Valores conforme impresso no documento (linha atípica — conferir com a fonte).
    band(19, 25, [10.0, 12.0, 15.0, 20.0, 26.5, 34.0, 38.0]),
    band(25, 35, [18.3, 18.8, 19.9, 21.2, 22.8, 24.6, 26.4]),
    band(35, 45, [18.6, 19.2, 20.5, 21.8, 23.6, 25.7, 27.2]),
    band(45, 55, [18.7, 19.3, 20.6, 22.0, 23.8, 26.0, 27.4]),
    band(55, 65, [18.7, 19.6, 20.9, 22.5, 24.4, 26.6, 28.0]),
    band(65, 75, [18.5, 19.5, 20.8, 22.5, 24.4, 26.4, 27.9]),
  ],
};

/** CMB idosos — NHANES III. Percentis 10,15,25,50,75,85,90. */
const CMB_ELDERLY: PercentileTableDef = {
  percentiles: [10, 15, 25, 50, 75, 85, 90],
  source: "NHANES III",
  male: [
    band(60, 70, [24.9, 25.6, 26.7, 28.4, 30.0, 30.9, 31.4]),
    band(70, 80, [24.4, 24.8, 25.6, 27.2, 28.9, 30.0, 30.5]),
    band(80, null, [22.6, 23.2, 24.0, 25.7, 27.5, 28.2, 28.8]),
  ],
  female: [
    band(60, 70, [20.6, 21.1, 21.9, 23.5, 25.4, 26.6, 27.4]),
    band(70, 80, [20.3, 20.8, 21.6, 23.0, 24.8, 26.3, 27.0]),
    band(80, null, [19.3, 20.0, 20.9, 22.6, 24.5, 25.4, 26.0]),
  ],
};

const TABLES: Record<
  AdultTableMode,
  Record<AdultAnthroIndicator, PercentileTableDef>
> = {
  adult: { cb: CB_ADULT, dct: DCT_ADULT, cmb: CMB_ADULT },
  geriatric: { cb: CB_ELDERLY, dct: DCT_ELDERLY, cmb: CMB_ELDERLY },
};

// ── Motor de percentil ───────────────────────────────────────────────────────

/** Sexo biológico a partir do grupo (sexo/etnia) usado nas avaliações. */
export function sexFromPatientGroup(group: PatientGroup): AdultSex {
  return group === "homem_branco" || group === "homem_negro" ? "male" : "female";
}

/** Frisancho → tabelas adultas; NHANES III → tabelas de idosos. */
export function tableModeFromReference(ref: AnthropometricReference): AdultTableMode {
  return ref === "nhanes" ? "geriatric" : "adult";
}

/**
 * Método gravado na avaliação, ou fallback do tipo de formulário
 * (adulto → Frisancho, idoso → NHANES) para linhas anteriores à coluna.
 */
export function resolveTableMode(
  stored: AnthropometricReference | null | undefined,
  fallback: AdultTableMode,
): AdultTableMode {
  if (stored === "frisancho" || stored === "nhanes") {
    return tableModeFromReference(stored);
  }
  return fallback;
}

export type AdultAnthroReference = {
  /** Percentil aproximado (interpolação linear entre colunas). Null nos extremos. */
  percentile: number | null;
  /** Fora das colunas tabeladas (abaixo da menor / acima da maior). */
  boundary: "below_min" | "above_max" | null;
  /** Menor e maior percentil tabelado da tabela usada (ex.: 5–95 ou 10–90). */
  minPercentile: number;
  maxPercentile: number;
  /** Percentil tabelado mais próximo e seu valor de referência. */
  nearestPercentile: number;
  nearestValue: number;
  /** Classificação Vitolo 2015 (quando determinável). */
  classification: string | null;
  source: string;
};

function findBand(bands: readonly AgeBand[], ageYears: number): AgeBand | null {
  for (const b of bands) {
    if (ageYears >= b.min && (b.maxExclusive == null || ageYears < b.maxExclusive)) {
      return b;
    }
  }
  return null;
}

/** Classificação Vitolo 2015 a partir do percentil. CMB usa "alta muscularidade". */
function classify(
  indicator: AdultAnthroIndicator,
  percentile: number,
): string {
  if (percentile < 5) return "Desnutrição";
  if (percentile < 15) return "Risco de desnutrição";
  if (percentile <= 85) return "Eutrofia";
  return indicator === "cmb" ? "Alta muscularidade" : "Obesidade";
}

/**
 * Percentil, valor de referência e classificação de uma medida antropométrica
 * de adulto/idoso. Retorna null quando não há tabela para a idade/indicador.
 */
export function adultAnthroReference(
  indicator: AdultAnthroIndicator,
  mode: AdultTableMode,
  sex: AdultSex,
  ageYears: number | null,
  value: number | null,
): AdultAnthroReference | null {
  if (
    ageYears == null ||
    value == null ||
    !Number.isFinite(ageYears) ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  const table = TABLES[mode][indicator];
  const bandRow = findBand(sex === "male" ? table.male : table.female, ageYears);
  if (!bandRow) return null;

  const cols = table.percentiles;
  const row = bandRow.values;
  const minPercentile = cols[0];
  const maxPercentile = cols[cols.length - 1];

  const base = {
    minPercentile,
    maxPercentile,
    source: table.source,
  };

  if (value < row[0]) {
    return {
      ...base,
      percentile: null,
      boundary: "below_min",
      nearestPercentile: minPercentile,
      nearestValue: row[0],
      // Abaixo da menor coluna: <P5 é desnutrição; <P10 (idosos) fica ambíguo.
      classification:
        minPercentile <= 5 ? "Desnutrição" : "Desnutrição ou risco (< P10)",
    };
  }
  if (value > row[row.length - 1]) {
    return {
      ...base,
      percentile: null,
      boundary: "above_max",
      nearestPercentile: maxPercentile,
      nearestValue: row[row.length - 1],
      classification: classify(indicator, 100),
    };
  }

  // Interpolação linear entre as duas colunas vizinhas (mesma regra do infantil).
  for (let i = 0; i < row.length - 1; i++) {
    const lo = row[i];
    const hi = row[i + 1];
    if (value >= lo && value <= hi) {
      const pLo = cols[i];
      const pHi = cols[i + 1];
      const percentile =
        hi === lo ? pLo : pLo + ((value - lo) / (hi - lo)) * (pHi - pLo);
      const rounded = Math.round(percentile * 10) / 10;

      // Coluna tabelada mais próxima do percentil calculado.
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let j = 0; j < cols.length; j++) {
        const d = Math.abs(cols[j] - rounded);
        if (d < minDist) {
          minDist = d;
          nearestIdx = j;
        }
      }

      return {
        ...base,
        percentile: rounded,
        boundary: null,
        nearestPercentile: cols[nearestIdx],
        nearestValue: row[nearestIdx],
        classification: classify(indicator, rounded),
      };
    }
  }

  return null; // inalcançável; defensivo
}

// ── Formatação para UI / PDF ─────────────────────────────────────────────────

export type AdultAnthroNoteStyle = "card" | "compact" | "short";

const ADULT_ANTHRO_UNIT: Record<AdultAnthroIndicator, string> = {
  cb: "cm",
  dct: "mm",
  cmb: "cm",
};

function fmtPt(n: number, decimals = 1): string {
  return n.toFixed(decimals).replace(".", ",");
}

function ageCoverageLabel(bands: readonly AgeBand[]): string {
  if (bands.length === 0) return "sem cobertura";
  const min = bands[0].min;
  const last = bands[bands.length - 1];
  if (last.maxExclusive == null) return `≥ ${min} anos`;
  return `${min}–${last.maxExclusive - 1} anos`;
}

export function adultAnthroPercentileLabel(ref: AdultAnthroReference): string {
  if (ref.boundary === "below_min") return `< P${ref.minPercentile}`;
  if (ref.boundary === "above_max") return `> P${ref.maxPercentile}`;
  return `≈ P${Math.round(ref.percentile ?? 0)}`;
}

/**
 * Texto de percentil para card, formulário ou PDF.
 * - card: duas linhas (classificação + valor tabelado + fonte)
 * - compact: uma linha com classificação e fonte (formulário)
 * - short: só "≈ P12" (histórico / PDF)
 */
export function adultAnthroNote(
  indicator: AdultAnthroIndicator,
  mode: AdultTableMode,
  sex: AdultSex,
  ageYears: number | null,
  value: number | null,
  style: AdultAnthroNoteStyle = "card",
): string | null {
  if (
    ageYears == null ||
    value == null ||
    !Number.isFinite(ageYears) ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  const table = TABLES[mode][indicator];
  const unit = ADULT_ANTHRO_UNIT[indicator];
  const bands = sex === "male" ? table.male : table.female;
  const ref = adultAnthroReference(indicator, mode, sex, ageYears, value);

  if (!ref) {
    const coverage = ageCoverageLabel(bands);
    if (style === "short") return "fora da faixa";
    return `Fora da faixa de referência (${table.source} · ${coverage})`;
  }

  const pct = adultAnthroPercentileLabel(ref);
  if (style === "short") return pct;

  if (style === "compact") {
    return [pct, ref.classification, table.source].filter(Boolean).join(" · ");
  }

  const line1 = ref.classification ? `${pct} · ${ref.classification}` : pct;
  const line2 = `Ref. P${ref.nearestPercentile}: ${fmtPt(ref.nearestValue)} ${unit} · ${table.source}`;
  return `${line1}\n${line2}`;
}

export function adultAnthroNoteForGroup(
  indicator: AdultAnthroIndicator,
  mode: AdultTableMode,
  group: PatientGroup,
  ageYears: number | null,
  value: number | null,
  style: AdultAnthroNoteStyle = "card",
): string | null {
  return adultAnthroNote(
    indicator,
    mode,
    sexFromPatientGroup(group),
    ageYears,
    value,
    style,
  );
}

/** "29,2 cm · ≈ P12" — histórico e PDF. Sem medida → null. */
export function formatAdultAnthroMeasure(
  indicator: AdultAnthroIndicator,
  mode: AdultTableMode,
  group: PatientGroup,
  ageYears: number | null,
  value: number | null,
  decimals = 1,
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const unit = ADULT_ANTHRO_UNIT[indicator];
  const base = `${fmtPt(value, decimals)} ${unit}`;
  const short = adultAnthroNoteForGroup(
    indicator,
    mode,
    group,
    ageYears,
    value,
    "short",
  );
  if (!short) return base;
  return `${base} · ${short}`;
}
