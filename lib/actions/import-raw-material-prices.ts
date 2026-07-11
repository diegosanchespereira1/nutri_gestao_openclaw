"use server";

// Atualização de preços (e demais campos) em massa de matérias-primas, via
// planilha baixada com ID + editada + reenviada. Casamento sempre por ID —
// nunca por nome — para nunca duplicar a lista mesmo que o usuário renomeie
// um item na planilha. Linha sem ID válido do tenant é rejeitada (não vira
// criação de item novo).

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type { RawMaterialPriceImportResult } from "@/lib/types/raw-material-price-import";
import {
  MAX_RAW_MATERIAL_PRICE_IMPORT_ROWS,
  parseImportRawMaterialPricesPayload,
} from "@/lib/validators/import-raw-material-prices-rows";
import { logRawMaterialChange } from "@/lib/actions/raw-material-history";
import type { RawMaterialSnapshot } from "@/lib/raw-materials/change-history";

export async function importRawMaterialPricesAction(
  rows: unknown,
): Promise<RawMaterialPriceImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const parsed = parseImportRawMaterialPricesPayload(rows);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { data: existingRows, error: existingError } = await supabase
    .from("professional_raw_materials")
    .select("id, name, price_unit, unit_price_brl, notes")
    .eq("owner_user_id", workspaceOwnerId);

  if (existingError) {
    return { ok: false, error: "Não foi possível carregar as matérias-primas existentes." };
  }

  const ownedIds = new Set((existingRows ?? []).map((r) => String(r.id)));
  const nameKeyToId = new Map<string, string>();
  const idToNameKey = new Map<string, string>();
  const beforeById = new Map<string, RawMaterialSnapshot>();
  for (const r of existingRows ?? []) {
    const id = String(r.id);
    const key = String(r.name).trim().toLowerCase();
    nameKeyToId.set(key, id);
    idToNameKey.set(id, key);
    beforeById.set(id, {
      name: String(r.name),
      price_unit: String(r.price_unit),
      unit_price_brl: Number(r.unit_price_brl),
      notes: r.notes != null ? String(r.notes) : null,
    });
  }

  // Defesa em profundidade: ID duplicado no payload (a pré-visualização do
  // wizard já bloqueia isso, mas a Server Action não confia no cliente).
  const idCounts = new Map<string, number>();
  for (const row of parsed.rows.slice(0, MAX_RAW_MATERIAL_PRICE_IMPORT_ROWS)) {
    idCounts.set(row.id, (idCounts.get(row.id) ?? 0) + 1);
  }

  let updated = 0;
  let skipped = 0;
  const updatedIds: string[] = [];

  for (const row of parsed.rows.slice(0, MAX_RAW_MATERIAL_PRICE_IMPORT_ROWS)) {
    if ((idCounts.get(row.id) ?? 0) > 1) {
      skipped += 1;
      continue;
    }

    if (!ownedIds.has(row.id)) {
      // ID não pertence a este tenant (ou não existe mais) — nunca cria como
      // item novo; a linha é só rejeitada.
      skipped += 1;
      continue;
    }

    const nameKey = row.name.trim().toLowerCase();
    const collidingId = nameKeyToId.get(nameKey);
    if (collidingId && collidingId !== row.id) {
      // Renomeou para um nome que já é de outro item — recusa em vez de
      // deixar o índice único do banco estourar com um erro cru.
      skipped += 1;
      continue;
    }

    const { error } = await supabase
      .from("professional_raw_materials")
      .update({
        name: row.name,
        price_unit: row.price_unit,
        unit_price_brl: row.unit_price_brl,
        notes: row.notes,
      })
      .eq("id", row.id)
      .eq("owner_user_id", workspaceOwnerId);

    if (error) {
      console.error("[import:raw-material-prices] update falhou", {
        id: row.id,
        code: error.code,
        message: error.message,
      });
      skipped += 1;
      continue;
    }

    const before = beforeById.get(row.id);
    if (before) {
      await logRawMaterialChange({
        supabase,
        ownerUserId: workspaceOwnerId,
        actorUserId: user.id,
        rawMaterialId: row.id,
        before,
        after: {
          name: row.name,
          price_unit: row.price_unit,
          unit_price_brl: row.unit_price_brl,
          notes: row.notes,
        },
        source: "bulk_price_import",
      });
    }

    // Mantém o índice de nomes coerente para as próximas linhas do mesmo lote
    // (senão o nome antigo "vago" continuaria bloqueando outra linha que
    // queira reaproveitá-lo).
    const previousKey = idToNameKey.get(row.id);
    if (previousKey && previousKey !== nameKey) nameKeyToId.delete(previousKey);
    nameKeyToId.set(nameKey, row.id);
    idToNameKey.set(row.id, nameKey);

    updated += 1;
    updatedIds.push(row.id);
  }

  let affectedRecipes = 0;
  if (updatedIds.length > 0) {
    const { data: lineRows } = await supabase
      .from("technical_recipe_lines")
      .select("recipe_id")
      .in("raw_material_id", updatedIds);

    const recipeIds = [...new Set((lineRows ?? []).map((r) => r.recipe_id as string))];
    affectedRecipes = recipeIds.length;
    for (const rid of recipeIds) {
      revalidatePath(`/ficha-tecnica/${rid}/editar`);
    }
  }

  revalidatePath("/ficha-tecnica/materias-primas");
  revalidatePath("/ficha-tecnica");

  return { ok: true, updated, skipped, affectedRecipes };
}
