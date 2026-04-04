"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { RECIPE_LINE_UNITS } from "@/lib/constants/recipe-line-units";
import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import { createClient } from "@/lib/supabase/server";
import { validateRecipeTotals } from "@/lib/technical-recipes/validate-recipe-totals";
import type { TacoReferenceFoodRow } from "@/lib/types/taco-reference-foods";
import type {
  TechnicalRecipeLineRow,
  TechnicalRecipeListItem,
  TechnicalRecipeRow,
  TechnicalRecipeWithLines,
} from "@/lib/types/technical-recipes";

const tacoIdSchema = z.preprocess(
  (val) => (val === undefined || val === "" ? null : val),
  z.union([z.string().uuid(), z.null()]),
);

const lineSchema = z.object({
  ingredient_name: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero."),
  unit: z.enum(RECIPE_LINE_UNITS),
  notes: z.string().max(1000).optional(),
  taco_food_id: tacoIdSchema,
});

const saveDraftSchema = z.object({
  recipeId: z.string().uuid().optional(),
  establishmentId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  lines: z.array(lineSchema).min(1, "Adicione pelo menos um ingrediente."),
});

export type SaveTechnicalRecipeDraftResult =
  | {
      ok: true;
      recipeId: string;
      totalsLabel: string;
      totalsKind: "mass" | "volume" | "mixed" | "empty";
    }
  | { ok: false; error: string };

function parseLineQuantity(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseTacoFoodJoin(raw: unknown): TacoReferenceFoodRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  return {
    id: o.id,
    taco_code: String(o.taco_code ?? ""),
    name: String(o.name ?? ""),
    kcal_per_100g: Number(o.kcal_per_100g ?? 0),
    protein_g_per_100g: Number(o.protein_g_per_100g ?? 0),
    carb_g_per_100g: Number(o.carb_g_per_100g ?? 0),
    lipid_g_per_100g: Number(o.lipid_g_per_100g ?? 0),
    fiber_g_per_100g: Number(o.fiber_g_per_100g ?? 0),
  };
}

function mapLineRow(row: {
  id: string;
  recipe_id: string;
  sort_order: number;
  ingredient_name: string;
  quantity: unknown;
  unit: string;
  notes: string | null;
  taco_food_id?: string | null;
  taco_reference_foods?: unknown;
}): TechnicalRecipeLineRow {
  const tacoFood = parseTacoFoodJoin(row.taco_reference_foods);
  const colId =
    row.taco_food_id != null && String(row.taco_food_id).length > 0
      ? String(row.taco_food_id)
      : null;

  return {
    id: row.id,
    recipe_id: row.recipe_id,
    sort_order: row.sort_order,
    ingredient_name: row.ingredient_name,
    quantity: parseLineQuantity(row.quantity),
    unit: row.unit as RecipeLineUnit,
    notes: row.notes,
    taco_food_id: colId ?? tacoFood?.id ?? null,
    taco_food: tacoFood,
  };
}

export async function loadTechnicalRecipesForOwner(): Promise<{
  rows: TechnicalRecipeListItem[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("technical_recipes")
    .select(
      `
      *,
      establishments (
        name,
        client_id,
        clients ( legal_name, trade_name )
      )
    `,
    )
    .order("updated_at", { ascending: false });

  if (error || !data) return { rows: [] };
  return { rows: data as unknown as TechnicalRecipeListItem[] };
}

export async function loadTechnicalRecipeById(
  recipeId: string,
): Promise<{ recipe: TechnicalRecipeWithLines | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { recipe: null };

  const { data: recipe, error: rErr } = await supabase
    .from("technical_recipes")
    .select("*")
    .eq("id", recipeId)
    .maybeSingle();

  if (rErr || !recipe) return { recipe: null };

  const { data: lines, error: lErr } = await supabase
    .from("technical_recipe_lines")
    .select(
      `
      *,
      taco_reference_foods (
        id,
        taco_code,
        name,
        kcal_per_100g,
        protein_g_per_100g,
        carb_g_per_100g,
        lipid_g_per_100g,
        fiber_g_per_100g
      )
    `,
    )
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true });

  if (lErr) return { recipe: null };

  const base = recipe as TechnicalRecipeRow;
  return {
    recipe: {
      ...base,
      lines: (lines ?? []).map((row) =>
        mapLineRow(
          row as {
            id: string;
            recipe_id: string;
            sort_order: number;
            ingredient_name: string;
            quantity: unknown;
            unit: string;
            notes: string | null;
            taco_food_id?: string | null;
            taco_reference_foods?: unknown;
          },
        ),
      ),
    },
  };
}

export async function saveTechnicalRecipeDraftAction(
  raw: unknown,
): Promise<SaveTechnicalRecipeDraftResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const parsed = saveDraftSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors)[0]?.[0] ??
      "Dados inválidos.";
    return { ok: false, error: msg };
  }

  const { recipeId, establishmentId, name, lines: rawLines } = parsed.data;
  const lines = rawLines.map((l) => ({
    ...l,
    notes: l.notes?.trim() ? l.notes.trim() : undefined,
    taco_food_id: l.taco_food_id ?? null,
  }));

  const tacoIds = [
    ...new Set(lines.map((l) => l.taco_food_id).filter(Boolean)),
  ] as string[];
  if (tacoIds.length > 0) {
    const { data: tacoRows, error: tacoErr } = await supabase
      .from("taco_reference_foods")
      .select("id")
      .in("id", tacoIds);
    if (tacoErr || !tacoRows || tacoRows.length !== tacoIds.length) {
      return {
        ok: false,
        error: "Um ou mais alimentos TACO selecionados são inválidos.",
      };
    }
  }

  const { data: estRow } = await supabase
    .from("establishments")
    .select("id, client_id")
    .eq("id", establishmentId)
    .maybeSingle();

  if (!estRow) {
    return {
      ok: false,
      error: "Estabelecimento inválido ou sem permissão.",
    };
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("owner_user_id, kind")
    .eq("id", estRow.client_id)
    .maybeSingle();

  if (
    !clientRow ||
    clientRow.owner_user_id !== user.id ||
    clientRow.kind !== "pj"
  ) {
    return {
      ok: false,
      error: "Estabelecimento inválido ou sem permissão.",
    };
  }

  let finalRecipeId = recipeId;

  if (recipeId) {
    const { data: existing } = await supabase
      .from("technical_recipes")
      .select("id, establishment_id")
      .eq("id", recipeId)
      .maybeSingle();

    if (!existing) {
      return { ok: false, error: "Receita não encontrada." };
    }
    if ((existing as { establishment_id: string }).establishment_id !== establishmentId) {
      return {
        ok: false,
        error: "Não é permitido alterar o estabelecimento da receita.",
      };
    }

    const { error: uErr } = await supabase
      .from("technical_recipes")
      .update({
        name,
        status: "draft",
      })
      .eq("id", recipeId);

    if (uErr) {
      return { ok: false, error: uErr.message || "Erro ao atualizar receita." };
    }

    const { error: dErr } = await supabase
      .from("technical_recipe_lines")
      .delete()
      .eq("recipe_id", recipeId);

    if (dErr) {
      return { ok: false, error: dErr.message || "Erro ao atualizar linhas." };
    }
  } else {
    const { data: inserted, error: iErr } = await supabase
      .from("technical_recipes")
      .insert({
        establishment_id: establishmentId,
        name,
        status: "draft",
      })
      .select("id")
      .single();

    if (iErr || !inserted) {
      return {
        ok: false,
        error: iErr?.message || "Erro ao criar receita.",
      };
    }
    finalRecipeId = (inserted as { id: string }).id;
  }

  const lineRows = lines.map((line, index) => ({
    recipe_id: finalRecipeId!,
    sort_order: index,
    ingredient_name: line.ingredient_name.trim(),
    quantity: line.quantity,
    unit: line.unit,
    notes: line.notes != null && line.notes.length > 0 ? line.notes : null,
    taco_food_id: line.taco_food_id,
  }));

  const { error: insErr } = await supabase
    .from("technical_recipe_lines")
    .insert(lineRows);

  if (insErr) {
    return { ok: false, error: insErr.message || "Erro ao guardar ingredientes." };
  }

  const totals = validateRecipeTotals(lines);
  revalidatePath("/ficha-tecnica");
  revalidatePath(`/ficha-tecnica/${finalRecipeId}/editar`);

  return {
    ok: true,
    recipeId: finalRecipeId!,
    totalsLabel: totals.label,
    totalsKind: totals.kind,
  };
}

export async function deleteTechnicalRecipeAction(
  recipeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase
    .from("technical_recipes")
    .delete()
    .eq("id", recipeId);

  if (error) {
    return { ok: false, error: error.message || "Erro ao eliminar." };
  }

  revalidatePath("/ficha-tecnica");
  return { ok: true };
}
