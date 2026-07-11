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

/**
 * Mesma contagem, mas em lote para várias matérias-primas de uma vez (evita
 * N+1 numa listagem) — usado no aviso de impacto antes de apagar um item.
 */
export async function countRecipesUsingRawMaterials(
  supabase: SupabaseClient,
  rawMaterialIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (rawMaterialIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("technical_recipe_lines")
    .select("raw_material_id, recipe_id")
    .in("raw_material_id", rawMaterialIds);

  if (error || !data) return counts;

  const recipesByMaterial = new Map<string, Set<string>>();
  for (const row of data) {
    const materialId = row.raw_material_id as string | null;
    const recipeId = row.recipe_id as string;
    if (!materialId) continue;
    const set = recipesByMaterial.get(materialId) ?? new Set<string>();
    set.add(recipeId);
    recipesByMaterial.set(materialId, set);
  }

  for (const [materialId, recipeIds] of recipesByMaterial) {
    counts.set(materialId, recipeIds.size);
  }

  return counts;
}
