export const RECIPE_LIST_PAGE_SIZE = 15;

export const TECHNICAL_RECIPE_LIST_TOGGLE_FILTERS = [
  "favoritos",
  "templates",
] as const;

export type TechnicalRecipeListToggleFilter =
  (typeof TECHNICAL_RECIPE_LIST_TOGGLE_FILTERS)[number];

export function parseTechnicalRecipeListFilters(
  raw: string | undefined,
): TechnicalRecipeListToggleFilter[] {
  if (!raw?.trim()) return [];

  const allowed = new Set<string>(TECHNICAL_RECIPE_LIST_TOGGLE_FILTERS);
  const selected = new Set<TechnicalRecipeListToggleFilter>();

  for (const part of raw.split(",")) {
    const key = part.trim();
    if (allowed.has(key)) {
      selected.add(key as TechnicalRecipeListToggleFilter);
    }
  }

  return TECHNICAL_RECIPE_LIST_TOGGLE_FILTERS.filter((key) => selected.has(key));
}

export function serializeTechnicalRecipeListFilters(
  filters: readonly TechnicalRecipeListToggleFilter[],
): string | undefined {
  if (filters.length === 0) return undefined;
  return [...filters].sort().join(",");
}

export function hasTechnicalRecipeListFilters(
  filters: readonly TechnicalRecipeListToggleFilter[],
): boolean {
  return filters.length > 0;
}
