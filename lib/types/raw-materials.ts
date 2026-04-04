import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";

export type RawMaterialRow = {
  id: string;
  owner_user_id: string;
  name: string;
  price_unit: RecipeLineUnit;
  unit_price_brl: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
