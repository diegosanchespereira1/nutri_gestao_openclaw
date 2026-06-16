import type { PatientGroup } from "@/lib/types/geriatric-assessments";

/**
 * Peso estimado — idosos (Chumlea et al., 1988).
 *
 * Equações distintas por grupo (sexo × etnia). AJ e CB em centímetros.
 *
 * Referência: Chumlea WC et al. Estature and weight estimation from knee height
 * for elderly non-obese Black, Mexican-American, and White persons. J Am Diet Assoc. 1988.
 */
export function calcGeriatricEstimatedWeightKg(
  group: PatientGroup,
  ajCm: number,
  cbCm: number,
): number {
  switch (group) {
    case "mulher_branca": return ajCm * 1.09 + cbCm * 2.68 - 65.51;
    case "mulher_negra":  return ajCm * 1.50 + cbCm * 2.58 - 84.22;
    case "homem_branco":  return ajCm * 1.10 + cbCm * 3.07 - 75.81;
    case "homem_negro":   return ajCm * 0.44 + cbCm * 2.86 - 39.21;
  }
}

/**
 * Altura estimada — idosos (Chumlea et al., 1985).
 *
 * AJ em centímetros, idade em anos.
 * Homens (branco e negro) usam a mesma equação.
 * Mulheres (branca e negra) usam a mesma equação.
 * Resultado em metros.
 */
export function calcGeriatricEstimatedHeightM(
  group: PatientGroup,
  ajCm: number,
  ageYears: number,
): number {
  const isMale = group === "homem_branco" || group === "homem_negro";
  return isMale
    ? (64.19 + 2.04 * ajCm - 0.04 * ageYears) / 100
    : (84.88 + 1.83 * ajCm - 0.24 * ageYears) / 100;
}

export const GERIATRIC_PE_FORMULAS: Record<PatientGroup, string> = {
  mulher_branca: "AJ×1,09 + CB×2,68 − 65,51",
  mulher_negra:  "AJ×1,50 + CB×2,58 − 84,22",
  homem_branco:  "AJ×1,10 + CB×3,07 − 75,81",
  homem_negro:   "AJ×0,44 + CB×2,86 − 39,21",
};
