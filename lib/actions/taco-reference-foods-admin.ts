"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canAccessAdminArea } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileRole } from "@/lib/supabase/profile";
import type { TacoReferenceFoodRow } from "@/lib/types/taco-reference-foods";

const PAGE_SIZE = 50;

function sanitizeQuery(q: string): string {
  return q.replace(/[%_\\]/g, "").replace(/,/g, " ").trim();
}

function escapeIlikeQuotes(s: string): string {
  return s.replace(/"/g, '""');
}

const foodWriteSchema = z.object({
  taco_code: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(500),
  kcal_per_100g: z.coerce.number().min(0).max(1_000_000),
  protein_g_per_100g: z.coerce.number().min(0).max(1_000),
  carb_g_per_100g: z.coerce.number().min(0).max(1_000),
  lipid_g_per_100g: z.coerce.number().min(0).max(1_000),
  fiber_g_per_100g: z.coerce.number().min(0).max(1_000),
});

function mapRow(row: Record<string, unknown>): TacoReferenceFoodRow {
  return {
    id: String(row.id),
    taco_code: String(row.taco_code ?? ""),
    name: String(row.name ?? ""),
    kcal_per_100g: Number(row.kcal_per_100g ?? 0),
    protein_g_per_100g: Number(row.protein_g_per_100g ?? 0),
    carb_g_per_100g: Number(row.carb_g_per_100g ?? 0),
    lipid_g_per_100g: Number(row.lipid_g_per_100g ?? 0),
    fiber_g_per_100g: Number(row.fiber_g_per_100g ?? 0),
  };
}

async function requireAdmin(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const role = await fetchProfileRole(supabase, user.id);
  if (!canAccessAdminArea(role)) {
    return { ok: false, error: "Sem permissão." };
  }
  return { ok: true, supabase };
}

export async function listTacoReferenceFoodsAdminAction(input: {
  page: number;
  query?: string;
}): Promise<
  | { ok: true; rows: TacoReferenceFoodRow[]; total: number; page: number }
  | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const page = Math.max(1, Math.floor(input.page));
  const rawQ = sanitizeQuery(input.query ?? "");
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = gate.supabase
    .from("taco_reference_foods")
    .select(
      "id, taco_code, name, kcal_per_100g, protein_g_per_100g, carb_g_per_100g, lipid_g_per_100g, fiber_g_per_100g",
      { count: "exact" },
    );

  if (rawQ.length >= 2) {
    const pattern = escapeIlikeQuotes(`%${rawQ}%`);
    q = q.or(`name.ilike."${pattern}",taco_code.ilike."${pattern}"`);
  }

  const { data, error, count } = await q
    .order("name", { ascending: true })
    .range(from, to);

  if (error) return { ok: false, error: "Erro ao carregar lista." };
  return {
    ok: true,
    rows: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)),
    total: count ?? 0,
    page,
  };
}

export async function createTacoReferenceFoodAdminAction(
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const parsed = foodWriteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }

  const row = parsed.data;
  const { data, error } = await gate.supabase
    .from("taco_reference_foods")
    .insert({
      taco_code: row.taco_code,
      name: row.name,
      kcal_per_100g: row.kcal_per_100g,
      protein_g_per_100g: row.protein_g_per_100g,
      carb_g_per_100g: row.carb_g_per_100g,
      lipid_g_per_100g: row.lipid_g_per_100g,
      fiber_g_per_100g: row.fiber_g_per_100g,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe um alimento com este código TACO." };
    }
    return { ok: false, error: "Não foi possível criar." };
  }

  revalidatePath("/admin/catalogo-taco");
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateTacoReferenceFoodAdminAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const schema = foodWriteSchema.extend({
    id: z.string().uuid(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }

  const { id, ...row } = parsed.data;
  const { error } = await gate.supabase
    .from("taco_reference_foods")
    .update({
      taco_code: row.taco_code,
      name: row.name,
      kcal_per_100g: row.kcal_per_100g,
      protein_g_per_100g: row.protein_g_per_100g,
      carb_g_per_100g: row.carb_g_per_100g,
      lipid_g_per_100g: row.lipid_g_per_100g,
      fiber_g_per_100g: row.fiber_g_per_100g,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe um alimento com este código TACO." };
    }
    return { ok: false, error: "Não foi possível atualizar." };
  }

  revalidatePath("/admin/catalogo-taco");
  revalidatePath("/ficha-tecnica");
  return { ok: true };
}

export async function deleteTacoReferenceFoodAdminAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) return { ok: false, error: "Identificador inválido." };

  const { error } = await gate.supabase
    .from("taco_reference_foods")
    .delete()
    .eq("id", idParsed.data);

  if (error) {
    return { ok: false, error: "Não foi possível eliminar." };
  }

  revalidatePath("/admin/catalogo-taco");
  revalidatePath("/ficha-tecnica");
  return { ok: true };
}
