import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import type { RawMaterialRow } from "@/lib/types/raw-materials";
import type { TacoReferenceFoodRow } from "@/lib/types/taco-reference-foods";

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
  taco_food_id: string | null;
  /** Preenchido quando a linha vem do servidor com join TACO. */
  taco_food: TacoReferenceFoodRow | null;
  raw_material_id: string | null;
  /** Join `professional_raw_materials` quando guardado. */
  raw_material: RawMaterialRow | null;
  /** Multiplicador na quantidade para custo de matéria-prima (perdas / limpeza). */
  correction_factor: number;
  /** Multiplicador na quantidade para nutrição TACO (ajuste de estado / cocção). */
  cooking_factor: number;
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
