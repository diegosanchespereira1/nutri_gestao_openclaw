export const RECIPE_LINE_UNITS = ["g", "kg", "ml", "l", "un"] as const;

export type RecipeLineUnit = (typeof RECIPE_LINE_UNITS)[number];

export const RECIPE_LINE_UNIT_LABELS: Record<RecipeLineUnit, string> = {
  g: "g (gramas)",
  kg: "kg (quilogramas)",
  ml: "ml (mililitros)",
  l: "l (litros)",
  un: "un (unidade)",
};
