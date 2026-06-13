/** Rótulos e cores de exibição da avaliação infantil (compartilhados UI/servidor). */
import type { ChildColor, ChildIndicator, ClassificationMethod } from "./types";

export const CHILD_INDICATOR_LABELS: Record<ChildIndicator, string> = {
  weight_for_age: "Peso para idade",
  height_for_age: "Estatura para idade",
  bmi_for_age: "IMC para idade",
  weight_for_height: "Peso para estatura",
};

/** Sigla curta (P/I, E/I, IMC/I, P/E). */
export const CHILD_INDICATOR_SHORT: Record<ChildIndicator, string> = {
  weight_for_age: "P/I",
  height_for_age: "E/I",
  bmi_for_age: "IMC/I",
  weight_for_height: "P/E",
};

export const CHILD_METHOD_LABELS: Record<ClassificationMethod, string> = {
  percentile: "Percentil",
  zscore: "Escore-Z",
};

/** Unidade de medida por indicador. */
export const CHILD_INDICATOR_UNIT: Record<ChildIndicator, string> = {
  weight_for_age: "kg",
  height_for_age: "cm",
  bmi_for_age: "kg/m²",
  weight_for_height: "kg",
};

/** Classes Tailwind por cor do semáforo (texto/fundo/borda). */
export const CHILD_COLOR_CLASSES: Record<ChildColor, string> = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  yellow: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  red: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

/** Cor hex por semáforo (para pontos/elementos de gráfico). */
export const CHILD_COLOR_HEX: Record<ChildColor, string> = {
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
};
