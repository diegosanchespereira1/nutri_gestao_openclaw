/**
 * Séries e configuração de indicadores para o dashboard de saúde do paciente.
 *
 * Puro TypeScript (sem React) — consumido pelo dashboard e pelos cards de KPI.
 * Cobre os campos de `AdultNutritionAssessmentRow` / `GeriatricAssessmentRow`
 * (mesma estrutura) e, opcionalmente, de `ChildAssessmentRow`.
 */

import {
  adultAnthroNoteForGroup,
  formatAdultAnthroMeasure,
  type AdultAnthroIndicator,
  type AdultTableMode,
} from "@/lib/nutrition/adult/anthropometric-percentiles";
import { assessChild } from "@/lib/nutrition/child/assess";
import type { ChildIndicator, ChildIndicatorResult } from "@/lib/nutrition/child/types";
import type { AdultNutritionAssessmentRow } from "@/lib/types/adult-nutrition-assessments";
import type { ChildAssessmentRow } from "@/lib/types/child-assessments";
import {
  NUTRITIONAL_RISK_LABELS,
  PATIENT_GROUP_LABELS,
} from "@/lib/types/geriatric-assessments";

// ── Tipos base ───────────────────────────────────────────────────────────────

export type HealthSeriesPoint = { date: string; iso: string; value: number | null };

export type CategorySeriesPoint = { date: string; iso: string; category: string };

type WithRecordedAt = { recorded_at: string };

type NumericIndicatorDef<TRow> = {
  id: string;
  label: string;
  code: string;
  unit: string;
  decimals: number;
  asInt: boolean;
  highlight: boolean;
  note: string;
  tip: string;
  categorical: false;
  getValue: (row: TRow) => number | null;
};

type CategoricalIndicatorDef<TRow> = {
  id: string;
  label: string;
  code: string;
  unit: string;
  decimals: number;
  asInt: boolean;
  highlight: boolean;
  note: string;
  tip: string;
  categorical: true;
  getCategory: (row: TRow) => string;
  colorForCategory: (category: string) => string;
};

/** Definição de um indicador — numérico (linha) ou categórico (histórico em barras). */
export type HealthIndicatorDef<TRow = AdultNutritionAssessmentRow> =
  | NumericIndicatorDef<TRow>
  | CategoricalIndicatorDef<TRow>;

export type HealthIndicatorSection<TRow = AdultNutritionAssessmentRow> = {
  id: string;
  title: string;
  subtitle: string;
  /** Classe Tailwind extra para o grid (ex.: "xl:grid-cols-4"). */
  cols?: string;
  indicators: Array<HealthIndicatorDef<TRow>>;
};

export type DeltaKind = "up" | "down" | "flat";

export type IndicatorDelta = { kind: DeltaKind; text: string };

// ── Formatação ───────────────────────────────────────────────────────────────

/** Data curta (dd/mm/aa) de uma avaliação, no fuso do Brasil. */
export function formatAssessmentShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/** Formata um valor de indicador — "–" quando ausente, vírgula decimal pt-BR. */
export function formatIndicatorValue(
  n: number | null,
  decimals: number,
  asInt = false,
): string {
  if (n == null || !Number.isFinite(n)) return "–";
  if (asInt) return Math.round(n).toLocaleString("pt-BR");
  return n.toFixed(decimals).replace(".", ",");
}

// ── Fatiagem por período ──────────────────────────────────────────────────────

/** Últimos N itens de uma lista ASC (ou todos, se `n === "all"`). */
export function sliceLastN<T>(items: T[], n: number | "all"): T[] {
  if (n === "all") return items;
  if (n <= 0) return [];
  return items.slice(Math.max(0, items.length - n));
}

// ── Delta (variação vs. avaliação anterior) ──────────────────────────────────

/** Decimais usados na variação: valores >= 10 ficam sem casas decimais. */
function deltaDecimals(abs: number): number {
  return abs >= 10 ? 0 : 1;
}

/** Variação entre os dois últimos valores não nulos de uma série numérica ASC. */
export function deltaFromSeries(values: Array<number | null>): IndicatorDelta {
  const valid = values.filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (valid.length < 2) {
    return { kind: "flat", text: "sem histórico" };
  }

  const curr = valid[valid.length - 1];
  const prev = valid[valid.length - 2];
  const diff = curr - prev;

  if (Math.abs(diff) < 1e-9) {
    return { kind: "flat", text: "estável vs. ant." };
  }

  const abs = Math.abs(diff);
  const sign = diff > 0 ? "+" : "−";
  return {
    kind: diff > 0 ? "up" : "down",
    text: `${sign}${formatIndicatorValue(abs, deltaDecimals(abs))} vs. ant.`,
  };
}

/**
 * Variação entre as duas últimas categorias de uma série categórica ASC.
 * Sem noção de "melhora/piora" genérica — apenas sinaliza se houve mudança.
 */
export function deltaFromCategories(categories: string[]): IndicatorDelta {
  if (categories.length < 2) {
    return { kind: "flat", text: "sem histórico" };
  }
  const curr = categories[categories.length - 1];
  const prev = categories[categories.length - 2];
  if (curr === prev) {
    return { kind: "flat", text: "estável vs. ant." };
  }
  return { kind: "up", text: `${prev} → ${curr}` };
}

// ── Conversão de linhas → séries ─────────────────────────────────────────────

export function numericSeriesFromRows<TRow extends WithRecordedAt>(
  rowsAsc: TRow[],
  def: NumericIndicatorDef<TRow>,
): HealthSeriesPoint[] {
  return rowsAsc.map((row) => ({
    date: formatAssessmentShortDate(row.recorded_at),
    iso: row.recorded_at,
    value: def.getValue(row),
  }));
}

export function categorySeriesFromRows<TRow extends WithRecordedAt>(
  rowsAsc: TRow[],
  def: CategoricalIndicatorDef<TRow>,
): CategorySeriesPoint[] {
  return rowsAsc.map((row) => ({
    date: formatAssessmentShortDate(row.recorded_at),
    iso: row.recorded_at,
    category: def.getCategory(row),
  }));
}

// ── Paleta (tokens teal do projeto — ver app/styles/theme-nutri-teal-v2.css) ──

const TEAL_LINE = "hsl(173 65% 38%)"; // --teal-500
const TEAL_DOT = "hsl(172 55% 48%)"; // --teal-400
const TEAL_SOFT = "hsl(171 50% 65%)"; // --teal-300
const AMBER = "hsl(38 90% 50%)"; // --chart-3
const SLATE_MUTED = "hsl(214 15% 85%)"; // neutro para "—" / "Não"

const CATEGORY_PALETTE = [TEAL_LINE, "hsl(199 85% 46%)", TEAL_SOFT, "hsl(172 55% 48%)"];

/** Cor estável (por hash) para categorias arbitrárias (texto livre). */
function paletteColorFor(category: string): string {
  if (!category || category === "—") return SLATE_MUTED;
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) {
    hash = (hash * 31 + category.charCodeAt(i)) % 1_000_000_007;
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

function riskColor(category: string): string {
  return category.startsWith("C/RN") ? AMBER : TEAL_LINE;
}

function amputationColor(category: string): string {
  return category === "Sim" ? AMBER : SLATE_MUTED;
}

export { TEAL_LINE, TEAL_DOT, TEAL_SOFT, AMBER, SLATE_MUTED };

// ── Fábricas de indicador ────────────────────────────────────────────────────

function numeric<TRow>(opts: {
  id: string;
  label: string;
  code: string;
  unit: string;
  decimals: number;
  field: keyof TRow;
  asInt?: boolean;
  highlight?: boolean;
  note: string;
  tip: string;
}): NumericIndicatorDef<TRow> {
  return {
    id: opts.id,
    label: opts.label,
    code: opts.code,
    unit: opts.unit,
    decimals: opts.decimals,
    asInt: opts.asInt ?? false,
    highlight: opts.highlight ?? false,
    note: opts.note,
    tip: opts.tip,
    categorical: false,
    getValue: (row) => row[opts.field] as unknown as number | null,
  };
}

function categorical<TRow>(opts: {
  id: string;
  label: string;
  code: string;
  highlight?: boolean;
  note: string;
  tip: string;
  getCategory: (row: TRow) => string;
  colorForCategory: (category: string) => string;
}): CategoricalIndicatorDef<TRow> {
  return {
    id: opts.id,
    label: opts.label,
    code: opts.code,
    unit: "",
    decimals: 0,
    asInt: false,
    highlight: opts.highlight ?? false,
    note: opts.note,
    tip: opts.tip,
    categorical: true,
    getCategory: opts.getCategory,
    colorForCategory: opts.colorForCategory,
  };
}

// ── Categorias (avaliação clínica) ───────────────────────────────────────────

function riskCategory(row: AdultNutritionAssessmentRow): string {
  if (!row.nutritional_risk) return "—";
  return NUTRITIONAL_RISK_LABELS[row.nutritional_risk].split("—")[0]?.trim() ?? "—";
}

function diagnosisCategory(row: AdultNutritionAssessmentRow): string {
  return row.nutritional_diagnosis?.trim() || "—";
}

function groupCategory(row: AdultNutritionAssessmentRow): string {
  return PATIENT_GROUP_LABELS[row.patient_group];
}

function amputationCategory(row: AdultNutritionAssessmentRow): string {
  return row.has_amputation ? "Sim" : "Não";
}

// ── Seções — adulto / geriátrico (AdultNutritionAssessmentRow) ──────────────

export const HEALTH_INDICATOR_SECTIONS: Array<HealthIndicatorSection<AdultNutritionAssessmentRow>> = [
  {
    id: "medidas",
    title: "Medidas antropométricas",
    subtitle: "Evolução nas avaliações selecionadas",
    indicators: [
      numeric<AdultNutritionAssessmentRow>({
        id: "cb",
        field: "cb_cm",
        label: "Circ. do braço",
        code: "CB",
        unit: "cm",
        decimals: 1,
        note: "Circunferência do braço",
        tip: "Circunferência do braço (cm). Medida no ponto médio entre o acrômio e o olécrano. Usada no cálculo da CMB e do peso estimado.",
      }),
      numeric<AdultNutritionAssessmentRow>({
        id: "dct",
        field: "dct_mm",
        label: "Dobra tricipital",
        code: "DCT",
        unit: "mm",
        decimals: 1,
        note: "Dobra cutânea tricipital",
        tip: "Dobra cutânea tricipital (mm). Estima a reserva de gordura subcutânea e entra no cálculo da CMB.",
      }),
      numeric<AdultNutritionAssessmentRow>({
        id: "cp",
        field: "cp_cm",
        label: "Circ. panturrilha",
        code: "CP",
        unit: "cm",
        decimals: 1,
        note: "Circunferência da panturrilha",
        tip: "Circunferência da panturrilha (cm). Indicador de massa muscular, especialmente útil em idosos e em acompanhamento longitudinal.",
      }),
      numeric<AdultNutritionAssessmentRow>({
        id: "aj",
        field: "aj_cm",
        label: "Altura do joelho",
        code: "AJ",
        unit: "cm",
        decimals: 1,
        note: "Usada em PE e altura estimada",
        tip: "Altura do joelho (cm). Permite estimar peso e altura quando a estatura ou o peso não podem ser medidos diretamente (Chumlea).",
      }),
      numeric<AdultNutritionAssessmentRow>({
        id: "cmb",
        field: "cmb_cm",
        label: "Circ. muscular braço",
        code: "CMB",
        unit: "cm",
        decimals: 1,
        highlight: true,
        note: "CMB = CB − (DCT × 0,314)",
        tip: "Circunferência muscular do braço. Calculada por CMB = CB − (DCT × 0,314) [Gurney & Jelliffe, 1973]. Reflete reserva muscular.",
      }),
      numeric<AdultNutritionAssessmentRow>({
        id: "pr",
        field: "weight_real_kg",
        label: "Peso real",
        code: "PR",
        unit: "kg",
        decimals: 1,
        note: "Peso mensurado na consulta",
        tip: "Peso real mensurado na balança. Pode ficar vazio quando o peso não for mensurável; nesse caso usa-se o peso estimado.",
      }),
    ],
  },
  {
    id: "calc",
    title: "Valores calculados",
    subtitle: "Derivados das medidas · atualizam com o período",
    indicators: [
      numeric<AdultNutritionAssessmentRow>({
        id: "pe",
        field: "estimated_weight_kg",
        label: "Peso estimado",
        code: "PE",
        unit: "kg",
        decimals: 1,
        highlight: true,
        note: "Estimado a partir de AJ e CB",
        tip: "Peso estimado a partir da altura do joelho e da circunferência do braço. Base da prescrição energético-proteica quando o peso real não está disponível.",
      }),
      numeric<AdultNutritionAssessmentRow>({
        id: "ae",
        field: "estimated_height_m",
        label: "Altura estimada",
        code: "AE",
        unit: "m",
        decimals: 3,
        highlight: true,
        note: "Chumlea et al. (1985)",
        tip: "Altura estimada pela equação de Chumlea et al. (1985), usando AJ, idade e grupo (sexo/etnia).",
      }),
      numeric<AdultNutritionAssessmentRow>({
        id: "imc",
        field: "bmi",
        label: "Índice de massa corporal",
        code: "IMC",
        unit: "kg/m²",
        decimals: 1,
        highlight: true,
        note: "PE ÷ Altura² · eutrofia",
        tip: "IMC = peso ÷ altura². Classifica o estado nutricional (ex.: eutrofia, sobrepeso). Usa PE e altura estimada quando necessário.",
      }),
    ],
  },
  {
    id: "presc",
    title: "Prescrição energético-proteica",
    subtitle: "Metas e necessidades ao longo das avaliações",
    cols: "xl:grid-cols-4",
    indicators: [
      numeric<AdultNutritionAssessmentRow>({
        id: "kcal",
        field: "kcal_per_kg",
        label: "Energia prescrita",
        code: "KCAL",
        unit: "kcal/kg",
        decimals: 0,
        note: "Meta diária por kg de PE",
        tip: "Meta de energia em kcal por kg de peso estimado por dia, definida pelo profissional na avaliação.",
      }),
      numeric<AdultNutritionAssessmentRow>({
        id: "ptn",
        field: "ptn_per_kg",
        label: "Proteína prescrita",
        code: "PTN",
        unit: "g/kg",
        decimals: 1,
        note: "Meta diária por kg de PE",
        tip: "Meta de proteína em gramas por kg de peso estimado por dia.",
      }),
      numeric<AdultNutritionAssessmentRow>({
        id: "ne",
        field: "energy_needs_kcal",
        label: "Necessidade energética",
        code: "NE",
        unit: "kcal/dia",
        decimals: 0,
        asInt: true,
        highlight: true,
        note: "NE = PE × Kcal/kg",
        tip: "Necessidade energética diária total. Calculada por NE = PE × Kcal/kg.",
      }),
      numeric<AdultNutritionAssessmentRow>({
        id: "np",
        field: "protein_needs_g",
        label: "Necessidade proteica",
        code: "NP",
        unit: "g/dia",
        decimals: 1,
        highlight: true,
        note: "NP = g PTN/kg × PE",
        tip: "Necessidade proteica diária total. Calculada por NP = g PTN/kg × PE.",
      }),
    ],
  },
  {
    id: "clinica",
    title: "Avaliação clínica",
    subtitle: "Histórico categórico por avaliação",
    cols: "xl:grid-cols-4",
    indicators: [
      categorical<AdultNutritionAssessmentRow>({
        id: "rn",
        label: "Risco nutricional",
        code: "RN",
        highlight: true,
        note: "Âmbar = C/RN · Teal = S/RN",
        tip: "Classificação de risco nutricional: S/RN (sem risco) ou C/RN (com risco). O histórico mostra a evolução nas avaliações.",
        getCategory: riskCategory,
        colorForCategory: riskColor,
      }),
      categorical<AdultNutritionAssessmentRow>({
        id: "dx",
        label: "Diagnóstico nutricional",
        code: "DX",
        note: "Registro clínico por avaliação",
        tip: "Diagnóstico nutricional registrado na avaliação. Ajuda a contextualizar a evolução clínica.",
        getCategory: diagnosisCategory,
        colorForCategory: paletteColorFor,
      }),
      categorical<AdultNutritionAssessmentRow>({
        id: "grp",
        label: "Grupo (sexo / etnia)",
        code: "GRP",
        note: "Define equações de PE/altura",
        tip: "Grupo usado nas equações de peso e altura estimados (sexo/etnia). Alterar o grupo muda as fórmulas aplicadas.",
        getCategory: groupCategory,
        colorForCategory: paletteColorFor,
      }),
      categorical<AdultNutritionAssessmentRow>({
        id: "amp",
        label: "Amputação",
        code: "AMP",
        note: "Indica correção de segmento",
        tip: "Indica se há membro amputado. Quando sim, aplica-se correção percentual no peso/IMC conforme o segmento.",
        getCategory: amputationCategory,
        colorForCategory: amputationColor,
      }),
    ],
  },
];

// ── Seções — infantil (ChildAssessmentRow) ───────────────────────────────────

function childNum(v: number | string | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export const CHILD_HEALTH_INDICATOR_SECTIONS: Array<HealthIndicatorSection<ChildAssessmentRow>> = [
  {
    id: "medidas-infantil",
    title: "Medidas antropométricas",
    subtitle: "Evolução nas avaliações selecionadas",
    indicators: [
      numeric<ChildAssessmentRow>({
        id: "peso",
        field: "weight_kg",
        label: "Peso",
        code: "P",
        unit: "kg",
        decimals: 1,
        highlight: true,
        note: "Peso mensurado na consulta",
        tip: "Peso corporal mensurado na balança (kg).",
      }),
      numeric<ChildAssessmentRow>({
        id: "estatura",
        field: "height_cm",
        label: "Estatura / comprimento",
        code: "E",
        unit: "cm",
        decimals: 1,
        highlight: true,
        note: "Deitado (<2 anos) ou em pé",
        tip: "Estatura ou comprimento (cm), conforme a idade da criança.",
      }),
      numeric<ChildAssessmentRow>({
        id: "imc-infantil",
        field: "bmi",
        label: "Índice de massa corporal",
        code: "IMC",
        unit: "kg/m²",
        decimals: 1,
        highlight: true,
        note: "Peso ÷ Estatura²",
        tip: "IMC = peso ÷ estatura². Usado junto às curvas de crescimento (percentis) para classificar o estado nutricional infantil.",
      }),
      numeric<ChildAssessmentRow>({
        id: "cb-infantil",
        field: "arm_circumference_cm",
        label: "Circ. do braço",
        code: "CB",
        unit: "cm",
        decimals: 1,
        note: "Circunferência do braço",
        tip: "Circunferência do braço (cm) — indicador complementar de reserva muscular e nutricional.",
      }),
      numeric<ChildAssessmentRow>({
        id: "dct-infantil",
        field: "triceps_skinfold_mm",
        label: "Dobra tricipital",
        code: "DCT",
        unit: "mm",
        decimals: 1,
        note: "Dobra cutânea tricipital",
        tip: "Dobra cutânea tricipital (mm) — estima a reserva de gordura subcutânea.",
      }),
      numeric<ChildAssessmentRow>({
        id: "cc-infantil",
        field: "head_circumference_cm",
        label: "Circ. cefálica",
        code: "CC",
        unit: "cm",
        decimals: 1,
        note: "Perímetro cefálico",
        tip: "Circunferência cefálica (cm) — acompanha o desenvolvimento do perímetro craniano, sobretudo em menores de 2 anos.",
      }),
    ],
  },
];

// ── Referência (percentil / faixa) para os cards do dashboard ────────────────

/** Indicador infantil (curvas OMS) correspondente a cada card do dashboard. */
const CHILD_KPI_INDICATOR: Record<string, ChildIndicator> = {
  peso: "weight_for_age",
  estatura: "height_for_age",
  "imc-infantil": "bmi_for_age",
  "cb-infantil": "arm_circumference_for_age",
  "dct-infantil": "triceps_skinfold_for_age",
  "cc-infantil": "head_circumference_for_age",
};

/** "≈ P48 · Ref. P50: 15,2 kg" — percentil da última avaliação + valor tabelado. */
function formatChildReference(r: ChildIndicatorResult, unit: string): string | null {
  const pct =
    r.boundary === "below_p1"
      ? "< P1"
      : r.boundary === "above_p99"
        ? "> P99"
        : r.percentile != null
          ? `≈ P${Math.round(r.percentile)}`
          : null;
  if (pct == null) return null;

  if (r.referencePercentileKey == null || r.referencePercentileValue == null) {
    return pct;
  }
  const refNum = r.referencePercentileKey.slice(1);
  const refVal = formatIndicatorValue(r.referencePercentileValue, 1);
  return `${pct} · Ref. P${refNum}: ${refVal} ${unit}`;
}

/**
 * Nota de referência (percentil OMS) para um card infantil do dashboard,
 * calculada a partir da avaliação mais recente do período visível.
 */
export function childKpiReferenceNote(
  rowsAsc: ChildAssessmentRow[],
  defId: string,
  unit: string,
): string | null {
  const indicator = CHILD_KPI_INDICATOR[defId];
  if (!indicator) return null;

  const latest = rowsAsc[rowsAsc.length - 1];
  if (!latest) return null;

  const assessment = assessChild({
    sex: latest.sex,
    ageMonths: latest.age_months,
    weightKg: childNum(latest.weight_kg),
    heightCm: childNum(latest.height_cm),
    method: latest.classification_method,
    armCircumferenceCm: childNum(latest.arm_circumference_cm),
    tricepsSkinfoldMm: childNum(latest.triceps_skinfold_mm),
    subscapularSkinfoldMm: childNum(latest.subscapular_skinfold_mm),
    headCircumferenceCm: childNum(latest.head_circumference_cm),
  });

  const result = assessment.indicators.find((i) => i.indicator === indicator);
  if (!result || result.outOfRange || result.value == null) return null;
  return formatChildReference(result, unit);
}

/** Card do dashboard adulto → indicador com tabela de percentis. */
const ADULT_KPI_INDICATOR: Record<string, AdultAnthroIndicator> = {
  cb: "cb",
  dct: "dct",
  cmb: "cmb",
};

/**
 * Nota de referência para cards de adulto/idoso.
 * - CB/DCT/CMB: percentis Frisancho 1999 (adultos) / NHANES III (idosos) +
 *   classificação Vitolo 2015, a partir da avaliação mais recente.
 * - IMC: faixa de eutrofia OMS (adultos) / Lipschitz (idosos).
 */
export function adultKpiReferenceNote(
  rowsAsc: AdultNutritionAssessmentRow[],
  defId: string,
  mode: AdultTableMode,
): string | null {
  if (defId === "imc") {
    return mode === "geriatric"
      ? "Ref. eutrofia Lipschitz: 22,0–27,0 kg/m²"
      : "Ref. eutrofia OMS: 18,5–24,9 kg/m²";
  }

  const indicator = ADULT_KPI_INDICATOR[defId];
  if (!indicator) return null;

  const latest = rowsAsc[rowsAsc.length - 1];
  if (!latest) return null;

  const value =
    indicator === "cb"
      ? latest.cb_cm
      : indicator === "dct"
        ? latest.dct_mm
        : latest.cmb_cm;

  return adultAnthroNoteForGroup(
    indicator,
    mode,
    latest.patient_group,
    latest.age_years,
    value,
    "card",
  );
}

/** "29,20 cm · ≈ P12" para histórico de avaliação. Sem medida → "–". */
export function adultHistoryAnthroLabel(
  indicator: AdultAnthroIndicator,
  mode: AdultTableMode,
  row: AdultNutritionAssessmentRow,
  decimals = 2,
): string {
  const value =
    indicator === "cb" ? row.cb_cm : indicator === "dct" ? row.dct_mm : row.cmb_cm;
  return (
    formatAdultAnthroMeasure(
      indicator,
      mode,
      row.patient_group,
      row.age_years,
      value,
      decimals,
    ) ?? "–"
  );
}

/** Converte campos numéricos (que podem vir como string) para número puro antes de usar como série. */
export function childRowsWithNumericFields(rows: ChildAssessmentRow[]): ChildAssessmentRow[] {
  return rows.map((row) => ({
    ...row,
    weight_kg: childNum(row.weight_kg),
    height_cm: childNum(row.height_cm),
    bmi: childNum(row.bmi),
    arm_circumference_cm: childNum(row.arm_circumference_cm),
    triceps_skinfold_mm: childNum(row.triceps_skinfold_mm),
    subscapular_skinfold_mm: childNum(row.subscapular_skinfold_mm),
    head_circumference_cm: childNum(row.head_circumference_cm),
  }));
}
