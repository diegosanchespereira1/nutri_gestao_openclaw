/**
 * Cálculo de idade da criança e faixa etária para rótulos de classificação.
 *
 * "Idade em meses completos" segue a convenção OMS/SISVAN: conta-se o número de
 * meses inteiros decorridos entre o nascimento e a data da avaliação.
 */

/**
 * Idade em meses completos entre `birthDate` e `atDate`.
 * Devolve null para datas inválidas ou data de avaliação anterior ao nascimento.
 */
export function ageInMonths(birthDate: Date, atDate: Date): number | null {
  if (
    !(birthDate instanceof Date) ||
    !(atDate instanceof Date) ||
    Number.isNaN(birthDate.getTime()) ||
    Number.isNaN(atDate.getTime())
  ) {
    return null;
  }
  if (atDate.getTime() < birthDate.getTime()) return null;

  let months =
    (atDate.getFullYear() - birthDate.getFullYear()) * 12 +
    (atDate.getMonth() - birthDate.getMonth());

  // Ainda não completou o mês corrente se o dia da avaliação é anterior ao
  // dia de nascimento.
  if (atDate.getDate() < birthDate.getDate()) {
    months -= 1;
  }
  return months < 0 ? 0 : months;
}

/** Conversão a partir de strings ISO (ex.: campos do Supabase). */
export function ageInMonthsFromISO(
  birthISO: string | null,
  atISO: string | null,
): number | null {
  if (!birthISO || !atISO) return null;
  return ageInMonths(new Date(birthISO), new Date(atISO));
}

/** Faixa etária para escolher os rótulos de IMC/idade (0–5 anos vs 5–19 anos). */
export type ChildAgeBand = "0_5" | "5_19";

export function bmiAgeBand(ageMonths: number): ChildAgeBand {
  return ageMonths < 60 ? "0_5" : "5_19";
}
