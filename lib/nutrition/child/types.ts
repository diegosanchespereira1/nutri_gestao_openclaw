/**
 * Avaliação nutricional infantil (0–19 anos) — tipos base.
 *
 * Referência: curvas OMS 2006/2007 (edição "percentis") adotadas pelo SISVAN.
 * O motor de classificação por percentil usa **somente** as colunas tabeladas nos
 * documentos oficiais (ver `docs/referencias_avaliacao/`). As colunas L, M, S dos
 * PDFs NÃO são usadas aqui — seguimos exatamente os números do documento.
 */

/** Indicadores antropométricos infantis suportados. */
export type ChildIndicator =
  | "weight_for_age"
  | "height_for_age"
  | "bmi_for_age"
  | "weight_for_height"
  | "arm_circumference_for_age"
  | "triceps_skinfold_for_age"
  | "subscapular_skinfold_for_age"
  | "head_circumference_for_age";

/** Sexo biológico usado para escolher a curva de referência. */
export type ChildSex = "female" | "male";

/** Critério de classificação escolhido pelo profissional (exclusivo). */
export type ClassificationMethod = "percentile" | "zscore";

/**
 * Ordem fixa das colunas de percentil dos documentos OMS. Todos os datasets de
 * referência usam arrays alinhados a esta ordem para economizar espaço.
 */
export const PERCENTILE_KEYS = [
  "p1",
  "p3",
  "p5",
  "p15",
  "p25",
  "p50",
  "p75",
  "p85",
  "p95",
  "p97",
  "p99",
] as const;

export type PercentileKey = (typeof PERCENTILE_KEYS)[number];

/** Valor numérico de cada percentil de uma linha (idade), alinhado a PERCENTILE_KEYS. */
export type PercentileRow = readonly number[];

/** Tabela de referência: chave = idade em meses; valor = linha de percentis. */
export type PercentileTable = Readonly<Record<number, PercentileRow>>;

/** Rótulo de classificação (texto exibido ao profissional). */
export type ChildClassification = string;

/** Cor do semáforo. */
export type ChildColor = "green" | "yellow" | "red";

/** Resultado de um indicador após avaliação. */
export type ChildIndicatorResult = {
  indicator: ChildIndicator;
  /** Medida usada para este indicador (peso, estatura ou IMC). */
  value: number | null;
  /** Percentil aproximado da criança (modo percentil). Null se fora de faixa. */
  percentile: number | null;
  /** Preenchido apenas no modo escore-Z (fase futura). */
  z: number | null;
  /** Indica que a medida ficou abaixo de P1 ("<P1") ou acima de P99 (">P99"). */
  boundary: "below_p1" | "above_p99" | null;
  classification: ChildClassification | null;
  color: ChildColor | null;
  /** Limites numéricos da faixa adequada/eutrófica para a idade (referência). */
  adequateLow: number | null;
  adequateHigh: number | null;
  /** True quando a idade não tem cobertura na tabela do indicador. */
  outOfRange: boolean;
};

/** Entrada do orquestrador de avaliação. */
export type ChildAssessmentInput = {
  sex: ChildSex;
  ageMonths: number;
  weightKg: number | null;
  heightCm: number | null;
  method: ClassificationMethod;
  // Novos parâmetros WHO (3–60 meses para CB/PCT/SE; 0–60 meses para PC)
  armCircumferenceCm: number | null;
  tricepsSkinfoldMm: number | null;
  subscapularSkinfoldMm: number | null;
  headCircumferenceCm: number | null;
};

/** Saída do orquestrador. */
export type ChildAssessmentResult = {
  bmi: number | null;
  indicators: ChildIndicatorResult[];
};
