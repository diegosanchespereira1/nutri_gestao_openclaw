"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { RECIPE_LIST_PAGE_SIZE } from "@/lib/constants/recipe-list";
import { RECIPE_LINE_UNITS } from "@/lib/constants/recipe-line-units";
import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import { createClient } from "@/lib/supabase/server";
import { validateRecipeTotals } from "@/lib/technical-recipes/validate-recipe-totals";
import type { RawMaterialRow } from "@/lib/types/raw-materials";
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

const lineFactorSchema = z.preprocess(
  (val) => (val === undefined || val === null || val === "" ? 1 : val),
  z.coerce
    .number()
    .min(0.01, "Fatores: mínimo 0,01.")
    .max(10, "Fatores: máximo 10."),
);

const lineSchema = z.object({
  ingredient_name: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero."),
  unit: z.enum(RECIPE_LINE_UNITS),
  notes: z.string().max(1000).optional(),
  taco_food_id: tacoIdSchema,
  raw_material_id: tacoIdSchema,
  correction_factor: lineFactorSchema,
  cooking_factor: lineFactorSchema,
});

const saveDraftSchema = z.object({
  recipeId: z.string().uuid().optional(),
  establishmentId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  classification: z.string().max(50).optional(),
  sector: z.string().max(100).optional(),
  portions_yield: z.coerce
    .number()
    .int("Rendimento deve ser um número inteiro.")
    .min(1, "Rendimento: mínimo 1 porção.")
    .max(999_999, "Rendimento demasiado elevado."),
  margin_percent: z.coerce
    .number()
    .min(0, "Margem não pode ser negativa.")
    .max(1000, "Margem: máximo 1000%."),
  tax_percent: z.coerce
    .number()
    .min(0, "Impostos não podem ser negativos.")
    .max(100, "Impostos: máximo 100%."),
  cmv_percent: z.coerce
    .number()
    .min(0.1, "CMV deve ser maior que 0%.")
    .max(100, "CMV: máximo 100%."),
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

function parseLineFactor(raw: unknown): number {
  const n = parseLineQuantity(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(10, Math.max(0.01, n));
}

function parseRawMaterialJoin(raw: unknown): RawMaterialRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  return {
    id: o.id,
    owner_user_id: String(o.owner_user_id ?? ""),
    name: String(o.name ?? ""),
    price_unit: o.price_unit as RecipeLineUnit,
    unit_price_brl: Number(o.unit_price_brl ?? 0),
    notes: o.notes != null ? String(o.notes) : null,
    created_at: String(o.created_at ?? ""),
    updated_at: String(o.updated_at ?? ""),
  };
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

function toIntUnknown(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.length > 0) {
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toNumUnknown(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.length > 0) {
    const n = parseFloat(v.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function mapRecipeHeader(raw: Record<string, unknown>): TechnicalRecipeRow {
  return {
    id: String(raw.id),
    establishment_id: String(raw.establishment_id),
    name: String(raw.name),
    status: raw.status === "published" ? "published" : "draft",
    portions_yield: Math.max(1, toIntUnknown(raw.portions_yield, 1)),
    margin_percent: Math.max(
      0,
      Math.min(1000, toNumUnknown(raw.margin_percent, 0)),
    ),
    tax_percent: Math.max(0, Math.min(100, toNumUnknown(raw.tax_percent, 0))),
    classification:
      typeof raw.classification === "string" && raw.classification.length > 0
        ? raw.classification
        : null,
    sector:
      typeof raw.sector === "string" && raw.sector.length > 0
        ? raw.sector
        : null,
    cmv_percent: Math.max(
      0.1,
      Math.min(100, toNumUnknown(raw.cmv_percent, 25)),
    ),
    is_template: Boolean(raw.is_template ?? false),
    created_at: String(raw.created_at ?? ""),
    updated_at: String(raw.updated_at ?? ""),
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
  raw_material_id?: string | null;
  professional_raw_materials?: unknown;
  correction_factor?: unknown;
  cooking_factor?: unknown;
}): TechnicalRecipeLineRow {
  const tacoFood = parseTacoFoodJoin(row.taco_reference_foods);
  const colTacoId =
    row.taco_food_id != null && String(row.taco_food_id).length > 0
      ? String(row.taco_food_id)
      : null;

  const rawMat = parseRawMaterialJoin(row.professional_raw_materials);
  const colRmId =
    row.raw_material_id != null && String(row.raw_material_id).length > 0
      ? String(row.raw_material_id)
      : null;

  return {
    id: row.id,
    recipe_id: row.recipe_id,
    sort_order: row.sort_order,
    ingredient_name: row.ingredient_name,
    quantity: parseLineQuantity(row.quantity),
    unit: row.unit as RecipeLineUnit,
    notes: row.notes,
    taco_food_id: colTacoId ?? tacoFood?.id ?? null,
    taco_food: tacoFood,
    raw_material_id: colRmId ?? rawMat?.id ?? null,
    raw_material: rawMat,
    correction_factor: parseLineFactor(row.correction_factor),
    cooking_factor: parseLineFactor(row.cooking_factor),
  };
}

export type LoadTechnicalRecipesResult = {
  rows: TechnicalRecipeListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function loadTechnicalRecipesForOwner(opts?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<LoadTechnicalRecipesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: LoadTechnicalRecipesResult = {
    rows: [],
    total: 0,
    page: 1,
    pageSize: RECIPE_LIST_PAGE_SIZE,
    totalPages: 0,
  };
  if (!user) return empty;

  const pageSize = Math.max(1, opts?.pageSize ?? RECIPE_LIST_PAGE_SIZE);
  const page = Math.max(1, opts?.page ?? 1);
  const q = opts?.q?.trim() ?? "";

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
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
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (q.length > 0) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error, count } = await query;

  if (error || !data) return { ...empty, page, pageSize };

  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    rows: data as unknown as TechnicalRecipeListItem[],
    total,
    page,
    pageSize,
    totalPages,
  };
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
      ),
      professional_raw_materials (
        id,
        owner_user_id,
        name,
        price_unit,
        unit_price_brl,
        notes,
        created_at,
        updated_at
      )
    `,
    )
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true });

  if (lErr) return { recipe: null };

  const base = mapRecipeHeader(recipe as Record<string, unknown>);
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
            raw_material_id?: string | null;
            professional_raw_materials?: unknown;
            correction_factor?: unknown;
            cooking_factor?: unknown;
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

  const {
    recipeId,
    establishmentId,
    name,
    classification,
    sector,
    portions_yield,
    margin_percent,
    tax_percent,
    cmv_percent,
    lines: rawLines,
  } = parsed.data;
  const lines = rawLines.map((l) => ({
    ...l,
    notes: l.notes?.trim() ? l.notes.trim() : undefined,
    taco_food_id: l.taco_food_id ?? null,
    raw_material_id: l.raw_material_id ?? null,
    correction_factor: l.correction_factor,
    cooking_factor: l.cooking_factor,
  }));

  const rmIds = [...new Set(lines.map((l) => l.raw_material_id).filter(Boolean))] as string[];
  if (rmIds.length > 0) {
    const { data: rmRows, error: rmErr } = await supabase
      .from("professional_raw_materials")
      .select("id")
      .eq("owner_user_id", user.id)
      .in("id", rmIds);
    if (rmErr || !rmRows || rmRows.length !== rmIds.length) {
      return {
        ok: false,
        error: "Uma ou mais matérias-primas selecionadas são inválidas.",
      };
    }
  }

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
        classification: classification || null,
        sector: sector || null,
        status: "draft",
        portions_yield,
        margin_percent,
        tax_percent,
        cmv_percent,
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
        classification: classification || null,
        sector: sector || null,
        status: "draft",
        portions_yield,
        margin_percent,
        tax_percent,
        cmv_percent,
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
    raw_material_id: line.raw_material_id,
    correction_factor: line.correction_factor,
    cooking_factor: line.cooking_factor,
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

// ── Templates ──────────────────────────────────────────────────────────────

export async function loadTemplatesForOwner(opts?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<LoadTechnicalRecipesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: LoadTechnicalRecipesResult = {
    rows: [],
    total: 0,
    page: 1,
    pageSize: RECIPE_LIST_PAGE_SIZE,
    totalPages: 0,
  };
  if (!user) return empty;

  const pageSize = Math.max(1, opts?.pageSize ?? RECIPE_LIST_PAGE_SIZE);
  const page = Math.max(1, opts?.page ?? 1);
  const q = opts?.q?.trim() ?? "";

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
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
      { count: "exact" },
    )
    .eq("is_template", true)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (q.length > 0) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error, count } = await query;

  if (error || !data) return { ...empty, page, pageSize };

  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    rows: data as unknown as TechnicalRecipeListItem[],
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function toggleTemplateStatusAction(
  recipeId: string,
  isTemplate: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase
    .from("technical_recipes")
    .update({ is_template: isTemplate })
    .eq("id", recipeId);

  if (error) {
    return { ok: false, error: error.message || "Erro ao atualizar." };
  }

  revalidatePath("/ficha-tecnica");
  revalidatePath("/ficha-tecnica/templates");
  return { ok: true };
}

export async function createRecipeFromTemplateAction(
  templateId: string,
  establishmentId: string,
  recipeName: string,
): Promise<{ ok: true; recipeId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  // Validar estabelecimento e permissão
  const { data: estRow } = await supabase
    .from("establishments")
    .select("id, client_id")
    .eq("id", establishmentId)
    .maybeSingle();

  if (!estRow) {
    return { ok: false, error: "Estabelecimento inválido." };
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
    return { ok: false, error: "Sem permissão para este estabelecimento." };
  }

  // Buscar template
  const { data: template } = await supabase
    .from("technical_recipes")
    .select("*")
    .eq("id", templateId)
    .eq("is_template", true)
    .maybeSingle();

  if (!template) {
    return { ok: false, error: "Template não encontrado." };
  }

  // Buscar linhas do template
  const { data: templateLines } = await supabase
    .from("technical_recipe_lines")
    .select("*")
    .eq("recipe_id", templateId)
    .order("sort_order", { ascending: true });

  // Criar nova receita (draft, não template)
  const { data: newRecipe, error: recipeErr } = await supabase
    .from("technical_recipes")
    .insert({
      establishment_id: establishmentId,
      name: recipeName.trim(),
      classification: template.classification || null,
      sector: template.sector || null,
      status: "draft",
      portions_yield: template.portions_yield,
      margin_percent: template.margin_percent,
      tax_percent: template.tax_percent,
      cmv_percent: template.cmv_percent || 25,
      is_template: false,
    })
    .select("id")
    .single();

  if (recipeErr || !newRecipe) {
    return { ok: false, error: recipeErr?.message || "Erro ao criar receita." };
  }

  // Copiar linhas (se houver)
  if (templateLines && templateLines.length > 0) {
    const newLines = templateLines.map((line) => ({
      recipe_id: (newRecipe as { id: string }).id,
      sort_order: line.sort_order,
      ingredient_name: line.ingredient_name,
      quantity: line.quantity,
      unit: line.unit,
      notes: line.notes,
      taco_food_id: line.taco_food_id,
      raw_material_id: line.raw_material_id,
      correction_factor: line.correction_factor,
      cooking_factor: line.cooking_factor,
    }));

    const { error: linesErr } = await supabase
      .from("technical_recipe_lines")
      .insert(newLines);

    if (linesErr) {
      return { ok: false, error: linesErr.message || "Erro ao copiar ingredientes." };
    }
  }

  revalidatePath("/ficha-tecnica");
  return { ok: true, recipeId: (newRecipe as { id: string }).id };
}
