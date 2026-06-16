/**
 * Categoria etária do paciente para filtros da lista.
 *
 * Faixas: criança/adolescente (< 18 anos), adulto (18–59), idoso (≥ 60).
 * Pacientes sem data de nascimento ficam sem categoria.
 */
export type AgeCategory = "crianca" | "adulto" | "idoso";

export const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  crianca: "Criança",
  adulto: "Adulto",
  idoso: "Idoso",
};

/** Idade em anos completos a partir da data de nascimento (ISO). Null se inválida. */
export function ageYearsFromBirth(
  birthISO: string | null | undefined,
  at: Date = new Date(),
): number | null {
  if (!birthISO) return null;
  const birth = new Date(birthISO.length > 10 ? birthISO : `${birthISO}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth.getTime() > at.getTime()) return null;

  let years = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) years -= 1;
  return years < 0 ? 0 : years;
}

/** Categoria etária do paciente, ou null se não houver data de nascimento. */
export function patientAgeCategory(
  birthISO: string | null | undefined,
  at: Date = new Date(),
): AgeCategory | null {
  const years = ageYearsFromBirth(birthISO, at);
  if (years == null) return null;
  if (years < 18) return "crianca";
  if (years >= 60) return "idoso";
  return "adulto";
}

/** Normaliza o valor do filtro (querystring) para uma categoria ou "all". */
export function parseAgeCategory(raw: string | undefined): AgeCategory | "all" {
  return raw === "crianca" || raw === "adulto" || raw === "idoso" ? raw : "all";
}

/** Categoria a partir da idade em anos (null se desconhecida). */
export function ageCategoryFromYears(years: number | null | undefined): AgeCategory | null {
  if (years == null || !Number.isFinite(years)) return null;
  if (years < 18) return "crianca";
  if (years >= 60) return "idoso";
  return "adulto";
}

/** Quais avaliações especializadas devem aparecer para cada categoria. */
export type AssessmentVisibility = {
  showChild: boolean;
  showAdult: boolean;
  showGeriatric: boolean;
};

/**
 * Visibilidade dos botões/abas de avaliação conforme a categoria.
 * Sem categoria definida (sem data de nascimento) → mostra todas, para não
 * bloquear o atendimento.
 */
export function assessmentVisibilityForCategory(
  category: AgeCategory | null,
): AssessmentVisibility {
  switch (category) {
    case "crianca":
      return { showChild: true, showAdult: false, showGeriatric: false };
    case "adulto":
      return { showChild: false, showAdult: true, showGeriatric: false };
    case "idoso":
      return { showChild: false, showAdult: false, showGeriatric: true };
    default:
      return { showChild: true, showAdult: true, showGeriatric: true };
  }
}

