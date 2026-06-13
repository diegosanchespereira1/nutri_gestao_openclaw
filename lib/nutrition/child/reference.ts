/**
 * Resolução da linha de referência (percentis) para um indicador/sexo/idade.
 */
import {
  getDataset,
  getWeightForHeightDataset,
  isMethodAvailable,
  isWeightForHeightAvailable,
} from "./reference-data/registry";
import type {
  ChildIndicator,
  ChildSex,
  ClassificationMethod,
  PercentileRow,
} from "./types";

export { isMethodAvailable, isWeightForHeightAvailable };

/**
 * Linha de percentis para (indicador, sexo, idade em meses) no critério dado.
 * Devolve null quando o critério não tem dados ou a idade não tem cobertura na
 * tabela (ex.: peso/idade acima de 120 meses).
 */
export function getReference(
  indicator: ChildIndicator,
  sex: ChildSex,
  ageMonths: number,
  method: ClassificationMethod,
): PercentileRow | null {
  if (!Number.isInteger(ageMonths) || ageMonths < 0) return null;
  const table = getDataset(indicator, sex, method);
  if (!table) return null;
  return table[ageMonths] ?? null;
}

/** A idade tem cobertura na tabela do indicador para o critério? */
export function hasCoverage(
  indicator: ChildIndicator,
  sex: ChildSex,
  ageMonths: number,
  method: ClassificationMethod,
): boolean {
  return getReference(indicator, sex, ageMonths, method) !== null;
}

/**
 * Linha de percentis de PESO POR ESTATURA (P/E), indexada pela estatura.
 * Procura a chave (em mm) mais próxima dentro de ±5 mm. Null se a tabela P/E
 * não foi carregada ou a estatura está fora de cobertura.
 */
export function getReferenceByHeight(
  sex: ChildSex,
  heightCm: number,
): PercentileRow | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  const table = getWeightForHeightDataset(sex);
  if (!table) return null;

  const targetMm = Math.round(heightCm * 10);
  if (table[targetMm]) return table[targetMm];

  let best: PercentileRow | null = null;
  let bestDiff = Infinity;
  for (const key of Object.keys(table)) {
    const diff = Math.abs(Number(key) - targetMm);
    if (diff < bestDiff && diff <= 5) {
      bestDiff = diff;
      best = table[Number(key)];
    }
  }
  return best;
}
