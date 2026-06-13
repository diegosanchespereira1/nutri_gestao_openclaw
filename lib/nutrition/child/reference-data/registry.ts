/**
 * Registry central das tabelas de referência infantil.
 *
 * Abstrai qual conjunto (percentil x escore-Z) atende cada critério, permitindo
 * que o escore-Z seja ligado no futuro apenas populando os datasets — sem
 * mudanças no motor, nas actions ou na UI.
 */
import type {
  ChildIndicator,
  ChildSex,
  ClassificationMethod,
  PercentileTable,
} from "../types";
import { PERCENTILE_TABLES } from "./percentile/index";
import { ZSCORE_TABLES } from "./zscore/index";
import { WEIGHT_FOR_HEIGHT_TABLES } from "./weight-for-height/index";

function tablesFor(method: ClassificationMethod): Record<string, PercentileTable> {
  return method === "zscore" ? ZSCORE_TABLES : PERCENTILE_TABLES;
}

/** O critério tem dados carregados? (escore-Z só após o usuário subir as tabelas.) */
export function isMethodAvailable(method: ClassificationMethod): boolean {
  return Object.keys(tablesFor(method)).length > 0;
}

/** Tabela do (indicador, sexo) para o critério, ou null se indisponível. */
export function getDataset(
  indicator: ChildIndicator,
  sex: ChildSex,
  method: ClassificationMethod,
): PercentileTable | null {
  const table = tablesFor(method)[`${indicator}:${sex}`];
  return table ?? null;
}

/** A tabela de Peso/Estatura (P/E), indexada por estatura, foi carregada? */
export function isWeightForHeightAvailable(): boolean {
  return Object.keys(WEIGHT_FOR_HEIGHT_TABLES).length > 0;
}

/** Tabela de P/E (chave = estatura em mm) para o sexo, ou null se indisponível. */
export function getWeightForHeightDataset(sex: ChildSex): PercentileTable | null {
  return WEIGHT_FOR_HEIGHT_TABLES[sex] ?? null;
}
