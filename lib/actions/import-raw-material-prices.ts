"use server";

// Atualização de preços (e demais campos) em massa de matérias-primas, via
// planilha baixada com ID + editada + reenviada. Casamento sempre por ID —
// nunca por nome — para nunca duplicar a lista mesmo que o usuário renomeie
// um item na planilha. Linha sem ID válido do tenant é rejeitada (não vira
// criação de item novo).
//
// Esta planilha também é o fluxo de migração de itens legados (sem cliente):
// a coluna Cliente é obrigatória em toda linha. Para item já escopado, serve
// só de conferência — mismatch rejeita a linha (nunca move de cliente por
// aqui). Para item legado (client_id nulo), o valor da planilha vira a
// primeira atribuição definitiva.

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import { rawMaterialScopeKey } from "@/lib/import/raw-material-import-parser";
import type { RawMaterialPriceImportResult } from "@/lib/types/raw-material-price-import";
import {
  MAX_RAW_MATERIAL_PRICE_IMPORT_ROWS,
  parseImportRawMaterialPricesPayload,
} from "@/lib/validators/import-raw-material-prices-rows";
import { logRawMaterialChange } from "@/lib/actions/raw-material-history";
import type { RawMaterialSnapshot } from "@/lib/raw-materials/change-history";

type ExistingRow = {
  name: string;
  price_unit: string;
  unit_price_brl: number;
  notes: string | null;
  client_id: string | null;
  establishment_id: string | null;
};

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

  const [{ data: existingRows, error: existingError }, { data: ownedClients }, { data: ownedEstablishments }] =
    await Promise.all([
      supabase
        .from("professional_raw_materials")
        .select("id, name, price_unit, unit_price_brl, notes, client_id, establishment_id")
        .eq("owner_user_id", workspaceOwnerId),
      supabase
        .from("clients")
        .select("id")
        .eq("owner_user_id", workspaceOwnerId)
        .eq("kind", "pj"),
      supabase
        .from("establishments")
        .select("id, client_id, clients!inner(owner_user_id)")
        .eq("clients.owner_user_id", workspaceOwnerId),
    ]);

  if (existingError) {
    return { ok: false, error: "Não foi possível carregar as matérias-primas existentes." };
  }

  const ownedClientIds = new Set((ownedClients ?? []).map((c) => String(c.id)));
  const establishmentClientById = new Map<string, string>();
  for (const e of ownedEstablishments ?? []) {
    establishmentClientById.set(String(e.id), String(e.client_id));
  }

  const existingByIdFull = new Map<string, ExistingRow>();
  const beforeById = new Map<string, RawMaterialSnapshot>();
  const scopeKeyToId = new Map<string, string>();
  const idToScopeKey = new Map<string, string>();
  for (const r of existingRows ?? []) {
    const id = String(r.id);
    const clientId = r.client_id != null ? String(r.client_id) : null;
    const establishmentId = r.establishment_id != null ? String(r.establishment_id) : null;
    existingByIdFull.set(id, {
      name: String(r.name),
      price_unit: String(r.price_unit),
      unit_price_brl: Number(r.unit_price_brl),
      notes: r.notes != null ? String(r.notes) : null,
      client_id: clientId,
      establishment_id: establishmentId,
    });
    beforeById.set(id, {
      name: String(r.name),
      price_unit: String(r.price_unit),
      unit_price_brl: Number(r.unit_price_brl),
      notes: r.notes != null ? String(r.notes) : null,
    });
    if (clientId) {
      const key = rawMaterialScopeKey(clientId, establishmentId, String(r.name));
      scopeKeyToId.set(key, id);
      idToScopeKey.set(id, key);
    }
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

    const existing = existingByIdFull.get(row.id);
    if (!existing) {
      // ID não pertence a este tenant (ou não existe mais) — nunca cria como
      // item novo; a linha é só rejeitada.
      skipped += 1;
      continue;
    }

    // Revalida posse do cliente/estabelecimento da planilha — nunca confia
    // no que veio resolvido no cliente.
    if (!ownedClientIds.has(row.client_id)) {
      skipped += 1;
      continue;
    }
    const rowEstablishmentId = row.establishment_id ?? null;
    if (rowEstablishmentId && establishmentClientById.get(rowEstablishmentId) !== row.client_id) {
      skipped += 1;
      continue;
    }

    // Item já escopado: a planilha nunca move de cliente/estabelecimento —
    // mismatch rejeita a linha (nunca aplica parcialmente).
    const isFirstAssignment = existing.client_id == null;
    if (!isFirstAssignment) {
      if (
        existing.client_id !== row.client_id ||
        (existing.establishment_id ?? null) !== rowEstablishmentId
      ) {
        skipped += 1;
        continue;
      }
    }

    const nameKey = rawMaterialScopeKey(row.client_id, rowEstablishmentId, row.name);
    const collidingId = scopeKeyToId.get(nameKey);
    if (collidingId && collidingId !== row.id) {
      // Renomeou para um nome que já é de outro item do mesmo âmbito —
      // recusa em vez de deixar o índice único do banco estourar com erro cru.
      skipped += 1;
      continue;
    }

    const updatePayload: Record<string, unknown> = {
      name: row.name,
      price_unit: row.price_unit,
      unit_price_brl: row.unit_price_brl,
      notes: row.notes,
    };
    if (isFirstAssignment) {
      updatePayload.client_id = row.client_id;
      updatePayload.establishment_id = rowEstablishmentId;
      updatePayload.contexto = rowEstablishmentId ? "ESTABELECIMENTO" : "REPOSITORIO";
    }

    const { error } = await supabase
      .from("professional_raw_materials")
      .update(updatePayload)
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
    const previousKey = idToScopeKey.get(row.id);
    if (previousKey && previousKey !== nameKey) scopeKeyToId.delete(previousKey);
    scopeKeyToId.set(nameKey, row.id);
    idToScopeKey.set(row.id, nameKey);

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

  revalidatePath("/materias-primas");
  revalidatePath("/ficha-tecnica");

  return { ok: true, updated, skipped, affectedRecipes };
}
