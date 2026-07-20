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
  "hotel",
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
  hotel: "Hotel",
  empresa: "Empresa",
};

/** Classes de badge alinhadas à coluna «Tipo de Negócio» em Clientes. */
export const establishmentTypeBadgeClass: Record<EstablishmentType, string> = {
  clinica:
    "border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-950 dark:text-fuchsia-100",
  escola:
    "border border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100",
  hospital:
    "border border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-100",
  lar_idosos:
    "border border-cyan-500/30 bg-cyan-500/10 text-cyan-950 dark:text-cyan-100",
  restaurante:
    "border border-orange-500/30 bg-orange-500/10 text-orange-950 dark:text-orange-100",
  mercado:
    "border border-lime-500/30 bg-lime-500/10 text-lime-950 dark:text-lime-100",
  frigorifico:
    "border border-teal-500/30 bg-teal-500/10 text-teal-950 dark:text-teal-100",
  cozinha_industrial:
    "border border-teal-500/30 bg-teal-500/10 text-teal-950 dark:text-teal-100",
  hotel:
    "border border-indigo-500/30 bg-indigo-500/10 text-indigo-950 dark:text-indigo-100",
  empresa:
    "border border-violet-500/25 bg-violet-500/10 text-violet-900 dark:text-violet-100",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

export type EstablishmentCustomTypeRef = {
  slug: string;
  label: string;
  category: EstablishmentCategory;
};

export const CUSTOM_ESTABLISHMENT_TYPE_BADGE_CLASS =
  "border border-border bg-muted/50 text-foreground";

export function isBuiltinEstablishmentType(
  raw: string,
): raw is EstablishmentType {
  return (ALL_ESTABLISHMENT_TYPES as readonly string[]).includes(raw);
}

/** Categoria de um tipo built-in. Para custom, passe `customTypes`. */
export function categoryFromType(
  type: string,
  customTypes?: ReadonlyArray<Pick<EstablishmentCustomTypeRef, "slug" | "category">>,
): EstablishmentCategory | null {
  if (isBuiltinEstablishmentType(type)) {
    return (ATENDIMENTO_TYPES as readonly string[]).includes(type)
      ? "atendimento_nutricional"
      : "assessoria_alimentacao";
  }
  const found = customTypes?.find((t) => t.slug === type);
  return found?.category ?? null;
}

export function labelForEstablishmentType(
  type: string,
  customTypes?: ReadonlyArray<Pick<EstablishmentCustomTypeRef, "slug" | "label">>,
): string {
  if (isBuiltinEstablishmentType(type)) {
    return establishmentTypeLabel[type];
  }
  const found = customTypes?.find((t) => t.slug === type);
  return found?.label ?? type;
}

export function badgeClassForEstablishmentType(type: string): string {
  if (isBuiltinEstablishmentType(type)) {
    return establishmentTypeBadgeClass[type];
  }
  return CUSTOM_ESTABLISHMENT_TYPE_BADGE_CLASS;
}

/** Aceita apenas slugs built-in. Use resolve no server para custom. */
export function parseEstablishmentType(
  raw: unknown,
): EstablishmentType | null {
  if (typeof raw !== "string") return null;
  return isBuiltinEstablishmentType(raw) ? raw : null;
}

/** Gera slug estável a partir do label (prefixo custom_). */
export function slugifyEstablishmentCustomTypeLabel(label: string): string {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `custom_${base || "tipo"}`;
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
    case "restaurante":
      return "restaurante";
    case "hotel":
      return "hotel";
    case "lar_idosos":
      return "lar_idosos";
    default:
      return "empresa";
  }
}
