import type { PatientGroup } from "@/lib/types/geriatric-assessments";

/**
 * Avaliação nutricional — adultos (≠ idosos Chumlea >60 no formulário geriátrico).
 *
 * **Peso estimado (kg):** equação única indicada para o protocolo NutriGestão adultos.
 * AJ e CB em centímetros.
 */
export function calcAdultEstimatedWeightKg(ajCm: number, cbCm: number): number {
  return ajCm * 1.01 + cbCm * 2.81 - 60.04;
}

export const ADULT_ESTIMATED_WEIGHT_FORMULA_DESC =
  "PE (kg) = AJ×1,01 + CB×2,81 − 60,04 · AJ e CB em cm";

/**
 * **Altura estimada (m)** — adultos 18–60 anos, a partir da altura de joelho (AJ, cm).
 * Equações de Chumlea et al. (1985) para faixa etária adulta (referências frequentes em
 * material brasileiro de antropometria hospitalar / MS-BVS). A circunferência do braço
 * **não** entra no cálculo da estatura; apenas no peso estimado acima.
 *
 * Referência de apoio: revisões e fichas técnicas que distinguem equações adulto vs idoso
 * (ex.: CCS/MS, apostilas de avaliação nutricional).
 */
export function calcAdultEstimatedHeightM(
  group: PatientGroup,
  ajCm: number,
  ageYears: number | null,
): number | null {
  let heightCm: number;
  switch (group) {
    case "homem_branco":
      heightCm = 71.85 + 1.88 * ajCm;
      break;
    case "homem_negro":
      heightCm = 73.42 + 1.79 * ajCm;
      break;
    case "mulher_branca":
      if (ageYears === null) return null;
      heightCm = 70.25 + 1.87 * ajCm - 0.06 * ageYears;
      break;
    case "mulher_negra":
      if (ageYears === null) return null;
      heightCm = 68.1 + 1.86 * ajCm - 0.06 * ageYears;
      break;
    default:
      return null;
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  return heightCm / 100;
}

export function adultEstimatedHeightFormulaLabel(group: PatientGroup): string {
  switch (group) {
    case "homem_branco":
      return "Altura (m) = (71,85 + 1,88×AJ) ÷ 100 · AJ em cm — Chumlea et al., adultos";
    case "homem_negro":
      return "Altura (m) = (73,42 + 1,79×AJ) ÷ 100 · AJ em cm — Chumlea et al., adultos";
    case "mulher_branca":
      return "Altura (m) = (70,25 + 1,87×AJ − 0,06×Idade) ÷ 100 · AJ em cm, idade em anos";
    case "mulher_negra":
      return "Altura (m) = (68,10 + 1,86×AJ − 0,06×Idade) ÷ 100 · AJ em cm, idade em anos";
    default:
      return "";
  }
}
