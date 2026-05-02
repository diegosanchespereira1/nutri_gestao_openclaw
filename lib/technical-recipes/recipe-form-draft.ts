import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import type { TacoReferenceFoodRow } from "@/lib/types/taco-reference-foods";

export const RECIPE_FORM_DRAFT_VERSION = 1 as const;

export type RecipeFormDraftLineV1 = {
  ingredient_name: string;
  quantity: string;
  unit: RecipeLineUnit;
  notes: string;
  taco_food_id: string | null;
  taco_food: TacoReferenceFoodRow | null;
  raw_material_id: string | null;
  correction_factor: string;
  cooking_factor: string;
};

export type RecipeFormDraftV1 = {
  v: typeof RECIPE_FORM_DRAFT_VERSION;
  savedAt: string;
  /** `establishment` = receita num local; `org` = catálogo do cliente PJ. */
  recipeScope?: "establishment" | "org";
  /** Quando `recipeScope === "org"`, o cliente PJ do catálogo. */
  clientIdForOrg?: string;
  establishmentId: string;
  name: string;
  classification: string;
  sector: string;
  portionsYieldInput: string;
  marginPercentInput: string;
  taxPercentInput: string;
  cmvPercentInput: string;
  scaleTargetInput: string;
  lines: RecipeFormDraftLineV1[];
};

export function recipeFormDraftStorageKey(
  mode: "new" | "edit",
  recipeId: string | undefined,
  scope:
    | { kind: "establishment"; establishmentId: string }
    | { kind: "org"; clientId: string },
): string {
  if (mode === "edit" && recipeId) {
    return `nutrigestao:recipe-draft:edit:${recipeId}`;
  }
  if (scope.kind === "org") {
    return `nutrigestao:recipe-draft:new:org:${scope.clientId}`;
  }
  return `nutrigestao:recipe-draft:new:est:${scope.establishmentId}`;
}

export function parseRecipeFormDraft(raw: string): RecipeFormDraftV1 | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const d = o as Record<string, unknown>;
    if (d.v !== RECIPE_FORM_DRAFT_VERSION) return null;
    if (typeof d.savedAt !== "string") return null;
    if (typeof d.establishmentId !== "string") return null;
    if (!Array.isArray(d.lines)) return null;
    return d as unknown as RecipeFormDraftV1;
  } catch {
    return null;
  }
}

export function readRecipeFormDraftFromStorage(key: string): RecipeFormDraftV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return parseRecipeFormDraft(raw);
  } catch {
    return null;
  }
}

export function removeRecipeFormDraftFromStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function writeRecipeFormDraftToStorage(
  key: string,
  draft: Omit<RecipeFormDraftV1, "v" | "savedAt"> & { savedAt?: string },
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: RecipeFormDraftV1 = {
      v: RECIPE_FORM_DRAFT_VERSION,
      savedAt: draft.savedAt ?? new Date().toISOString(),
      recipeScope: draft.recipeScope,
      clientIdForOrg: draft.clientIdForOrg,
      establishmentId: draft.establishmentId,
      name: draft.name,
      classification: draft.classification,
      sector: draft.sector,
      portionsYieldInput: draft.portionsYieldInput,
      marginPercentInput: draft.marginPercentInput,
      taxPercentInput: draft.taxPercentInput,
      cmvPercentInput: draft.cmvPercentInput,
      scaleTargetInput: draft.scaleTargetInput,
      lines: draft.lines,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
