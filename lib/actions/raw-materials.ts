"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { RECIPE_LINE_UNITS } from "@/lib/constants/recipe-line-units";
import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import { createClient } from "@/lib/supabase/server";
import type { RawMaterialRow } from "@/lib/types/raw-materials";
import { countRecipesUsingRawMaterial } from "@/lib/technical-recipes/raw-material-recipe-impact";

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(300),
  price_unit: z.enum(RECIPE_LINE_UNITS),
  unit_price_brl: z.preprocess(
    (v) =>
      typeof v === "string" ? v.trim().replace(/\s/g, "").replace(",", ".") : v,
    z.coerce.number().positive("Preço deve ser maior que zero."),
  ),
  notes: z.string().max(2000).optional(),
});

function mapRow(r: Record<string, unknown>): RawMaterialRow {
  return {
    id: String(r.id),
    owner_user_id: String(r.owner_user_id),
    name: String(r.name),
    price_unit: r.price_unit as RecipeLineUnit,
    unit_price_brl: Number(r.unit_price_brl),
    notes: r.notes != null ? String(r.notes) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export async function loadRawMaterialsForOwner(): Promise<{
  rows: RawMaterialRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("professional_raw_materials")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("name", { ascending: true });

  if (error || !data) return { rows: [] };
  return { rows: data.map((row) => mapRow(row as Record<string, unknown>)) };
}

export async function loadRawMaterialById(
  id: string,
): Promise<{ row: RawMaterialRow | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { row: null };

  const { data, error } = await supabase
    .from("professional_raw_materials")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (error || !data) return { row: null };
  return { row: mapRow(data as Record<string, unknown>) };
}

export async function saveRawMaterialAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const formId = String(formData.get("id") ?? "").trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    formId,
  );

  const parsed = saveSchema.safeParse({
    id: formId.length > 0 && isUuid ? formId : undefined,
    name: formData.get("name"),
    price_unit: formData.get("price_unit"),
    unit_price_brl: formData.get("unit_price_brl"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    if (isUuid) {
      redirect(`/ficha-tecnica/materias-primas/${formId}/editar?err=invalid`);
    }
    redirect("/ficha-tecnica/materias-primas/nova?err=invalid");
  }

  const { id, name, price_unit, unit_price_brl, notes } = parsed.data;
  const notesVal = notes?.trim() ? notes.trim() : null;

  if (id) {
    const { error } = await supabase
      .from("professional_raw_materials")
      .update({
        name: name.trim(),
        price_unit,
        unit_price_brl,
        notes: notesVal,
      })
      .eq("id", id)
      .eq("owner_user_id", user.id);

    if (error) {
      redirect(
        `/ficha-tecnica/materias-primas/${id}/editar?err=save`,
      );
    }

    const { data: lineRows } = await supabase
      .from("technical_recipe_lines")
      .select("recipe_id")
      .eq("raw_material_id", id);
    const recipeIds = [
      ...new Set((lineRows ?? []).map((r) => r.recipe_id as string)),
    ];
    for (const rid of recipeIds) {
      revalidatePath(`/ficha-tecnica/${rid}/editar`);
    }

    const affectedRecipes = await countRecipesUsingRawMaterial(supabase, id);
    revalidatePath("/ficha-tecnica/materias-primas");
    revalidatePath(`/ficha-tecnica/materias-primas/${id}/editar`);
    revalidatePath("/ficha-tecnica");
    redirect(
      `/ficha-tecnica/materias-primas?priceUpdated=1&recipes=${affectedRecipes}`,
    );
  }

  const { error } = await supabase.from("professional_raw_materials").insert({
    owner_user_id: user.id,
    name: name.trim(),
    price_unit,
    unit_price_brl,
    notes: notesVal,
  });

  if (error) {
    redirect("/ficha-tecnica/materias-primas/nova?err=save");
  }

  revalidatePath("/ficha-tecnica/materias-primas");
  revalidatePath("/ficha-tecnica");
  redirect("/ficha-tecnica/materias-primas");
}

export async function deleteRawMaterialAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/ficha-tecnica/materias-primas?err=invalid");

  const { data: lineRowsDel } = await supabase
    .from("technical_recipe_lines")
    .select("recipe_id")
    .eq("raw_material_id", id);
  const recipeIdsDel = [
    ...new Set((lineRowsDel ?? []).map((r) => r.recipe_id as string)),
  ];

  const { error } = await supabase
    .from("professional_raw_materials")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id);

  if (error) {
    redirect("/ficha-tecnica/materias-primas?err=save");
  }

  for (const rid of recipeIdsDel) {
    revalidatePath(`/ficha-tecnica/${rid}/editar`);
  }

  revalidatePath("/ficha-tecnica/materias-primas");
  revalidatePath("/ficha-tecnica");
  redirect("/ficha-tecnica/materias-primas");
}
