import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Conta receitas distintas (acessíveis por RLS) que usam a matéria-prima numa linha.
 * Story 6.7 — feedback após atualizar preço.
 */
export async function countRecipesUsingRawMaterial(
  supabase: SupabaseClient,
  rawMaterialId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("technical_recipe_lines")
    .select("recipe_id")
    .eq("raw_material_id", rawMaterialId);

  if (error || !data) return 0;
  return new Set(data.map((r) => r.recipe_id)).size;
}
