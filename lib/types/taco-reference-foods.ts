export type TacoReferenceFoodRow = {
  id: string;
  taco_code: string;
  name: string;
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carb_g_per_100g: number;
  lipid_g_per_100g: number;
  fiber_g_per_100g: number;
};

export type TacoFoodSearchHit = TacoReferenceFoodRow;
