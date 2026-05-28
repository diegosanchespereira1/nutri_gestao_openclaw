import type { ClientBusinessSegment } from "@/lib/constants/client-business-segment";
import type {
  EstablishmentCategory,
  EstablishmentType,
} from "@/lib/types/establishments";

// ── Types by category ───────────────────────────────────────────────────────

export const ATENDIMENTO_TYPES: readonly EstablishmentType[] = [
  "clinica",
  "escola",
  "hospital",
  "lar_idosos",
] as const;

export const ASSESSORIA_TYPES: readonly EstablishmentType[] = [
  "restaurante",
  "frigorifico",
  "mercado",
  "cozinha_industrial",
  "empresa",
] as const;

export const ALL_ESTABLISHMENT_TYPES: readonly EstablishmentType[] = [
  ...ATENDIMENTO_TYPES,
  ...ASSESSORIA_TYPES,
] as const;

/** @deprecated Use ALL_ESTABLISHMENT_TYPES or per-category constants. */
export const ESTABLISHMENT_TYPES = ALL_ESTABLISHMENT_TYPES;

// ── Category labels ─────────────────────────────────────────────────────────

export const ESTABLISHMENT_CATEGORIES: readonly EstablishmentCategory[] = [
  "atendimento_nutricional",
  "assessoria_alimentacao",
] as const;

export const establishmentCategoryLabel: Record<EstablishmentCategory, string> =
  {
    atendimento_nutricional: "Atendimento Nutricional",
    assessoria_alimentacao: "Assessoria em Serviços de Alimentação",
  };

export const ESTABLISHMENT_TYPES_BY_CATEGORY: Record<
  EstablishmentCategory,
  readonly EstablishmentType[]
> = {
  atendimento_nutricional: ATENDIMENTO_TYPES,
  assessoria_alimentacao: ASSESSORIA_TYPES,
};

// ── Type labels ─────────────────────────────────────────────────────────────

export const establishmentTypeLabel: Record<EstablishmentType, string> = {
  clinica: "Clínica",
  escola: "Escola",
  hospital: "Hospital",
  lar_idosos: "Lar de idosos",
  restaurante: "Restaurante",
  frigorifico: "Frigorífico",
  mercado: "Mercado",
  cozinha_industrial: "Cozinha industrial",
  empresa: "Empresa",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

export function categoryFromType(
  type: EstablishmentType,
): EstablishmentCategory {
  return (ATENDIMENTO_TYPES as readonly string[]).includes(type)
    ? "atendimento_nutricional"
    : "assessoria_alimentacao";
}

export function parseEstablishmentType(
  raw: unknown,
): EstablishmentType | null {
  if (typeof raw !== "string") return null;
  return (ALL_ESTABLISHMENT_TYPES as readonly string[]).includes(raw)
    ? (raw as EstablishmentType)
    : null;
}

/** Deriva o tipo de estabelecimento a partir da categoria do negócio do cliente PJ. */
export function establishmentTypeFromSegment(
  segment: ClientBusinessSegment | string | null | undefined,
): EstablishmentType {
  switch (segment) {
    case "escola":
      return "escola";
    case "hospital":
      return "hospital";
    case "clinica":
      return "clinica";
    case "lar_idosos":
      return "lar_idosos";
    default:
      return "empresa";
  }
}
