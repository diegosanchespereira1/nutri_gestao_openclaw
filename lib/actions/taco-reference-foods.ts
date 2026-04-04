"use server";

import { createClient } from "@/lib/supabase/server";
import type { TacoFoodSearchHit } from "@/lib/types/taco-reference-foods";

const LIMIT = 25;

function sanitizeTacoQuery(q: string): string {
  return q.replace(/[%_\\]/g, "").replace(/,/g, " ").trim();
}

function escapeIlikeQuotes(s: string): string {
  return s.replace(/"/g, '""');
}

function mapRow(row: {
  id: string;
  taco_code: string;
  name: string;
  kcal_per_100g: string | number;
  protein_g_per_100g: string | number;
  carb_g_per_100g: string | number;
  lipid_g_per_100g: string | number;
  fiber_g_per_100g: string | number;
}): TacoFoodSearchHit {
  return {
    id: row.id,
    taco_code: row.taco_code,
    name: row.name,
    kcal_per_100g: Number(row.kcal_per_100g),
    protein_g_per_100g: Number(row.protein_g_per_100g),
    carb_g_per_100g: Number(row.carb_g_per_100g),
    lipid_g_per_100g: Number(row.lipid_g_per_100g),
    fiber_g_per_100g: Number(row.fiber_g_per_100g),
  };
}

/**
 * Autocomplete TACO (catálogo de referência). Consulta indexada por nome; MVP &lt;1s com amostra pequena.
 */
export async function searchTacoFoodsAction(
  query: string,
): Promise<TacoFoodSearchHit[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const raw = sanitizeTacoQuery(query);
  if (raw.length < 2) return [];

  const pattern = escapeIlikeQuotes(`%${raw}%`);

  const { data, error } = await supabase
    .from("taco_reference_foods")
    .select(
      "id, taco_code, name, kcal_per_100g, protein_g_per_100g, carb_g_per_100g, lipid_g_per_100g, fiber_g_per_100g",
    )
    .or(`name.ilike."${pattern}",taco_code.ilike."${pattern}"`)
    .order("name", { ascending: true })
    .limit(LIMIT);

  if (error || !data) return [];
  return data.map((row) =>
    mapRow(
      row as {
        id: string;
        taco_code: string;
        name: string;
        kcal_per_100g: string | number;
        protein_g_per_100g: string | number;
        carb_g_per_100g: string | number;
        lipid_g_per_100g: string | number;
        fiber_g_per_100g: string | number;
      },
    ),
  );
}
