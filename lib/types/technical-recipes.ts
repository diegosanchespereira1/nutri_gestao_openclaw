import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";

export type TechnicalRecipeStatus = "draft" | "published";

export type TechnicalRecipeRow = {
  id: string;
  establishment_id: string;
  name: string;
  status: TechnicalRecipeStatus;
  created_at: string;
  updated_at: string;
};

export type TechnicalRecipeLineRow = {
  id: string;
  recipe_id: string;
  sort_order: number;
  ingredient_name: string;
  quantity: number;
  unit: RecipeLineUnit;
  notes: string | null;
};

export type TechnicalRecipeWithLines = TechnicalRecipeRow & {
  lines: TechnicalRecipeLineRow[];
};

export type TechnicalRecipeListItem = TechnicalRecipeRow & {
  establishments: {
    name: string;
    client_id: string;
    clients: { legal_name: string; trade_name: string | null } | null;
  } | null;
};
