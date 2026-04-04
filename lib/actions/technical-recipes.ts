"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { RECIPE_LINE_UNITS } from "@/lib/constants/recipe-line-units";
import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import { createClient } from "@/lib/supabase/server";
import { validateRecipeTotals } from "@/lib/technical-recipes/validate-recipe-totals";
import type {
  TechnicalRecipeLineRow,
  TechnicalRecipeListItem,
  TechnicalRecipeRow,
  TechnicalRecipeWithLines,
} from "@/lib/types/technical-recipes";

const lineSchema = z.object({
  ingredient_name: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero."),
  unit: z.enum(RECIPE_LINE_UNITS),
  notes: z.string().max(1000).optional(),
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

function mapLineRow(row: {
  id: string;
  recipe_id: string;
  sort_order: number;
  ingredient_name: string;
  quantity: unknown;
  unit: string;
  notes: string | null;
}): TechnicalRecipeLineRow {
  return {
    id: row.id,
    recipe_id: row.recipe_id,
    sort_order: row.sort_order,
    ingredient_name: row.ingredient_name,
    quantity: parseLineQuantity(row.quantity),
    unit: row.unit as RecipeLineUnit,
    notes: row.notes,
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
    .select("*")
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
  }));

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
