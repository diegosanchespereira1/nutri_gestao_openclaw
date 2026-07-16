"use server";

// Upload em massa de matérias-primas. Cada linha casa com um item existente
// pelo nome exato (sem diferenciar maiúsculas/minúsculas ou espaços nas
// pontas) DENTRO DO MESMO cliente/estabelecimento — nunca mistura clientes;
// quando há conflito, a decisão do usuário (sobrescrever / criar novo com
// sufixo "_1" / ignorar) vem em `resolution`, mas o servidor sempre re-checa
// o conflito por conta própria — nunca confia em `resolution=create` vindo
// do cliente se um item com aquele nome já existir no mesmo âmbito.

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import { rawMaterialScopeKey } from "@/lib/import/raw-material-import-parser";
import type { RawMaterialImportResult } from "@/lib/types/raw-material-import";
import {
  MAX_RAW_MATERIAL_IMPORT_ROWS,
  parseImportRawMaterialsPayload,
  type RawMaterialImportRowInput,
} from "@/lib/validators/import-raw-materials-rows";
import { logRawMaterialChange } from "@/lib/actions/raw-material-history";
import type { RawMaterialSnapshot } from "@/lib/raw-materials/change-history";

type IndexedMaterial = { id: string };

/** Acha um nome livre para "criar novo" — tenta "_1", "_2"... até não colidir
 *  dentro do mesmo cliente/estabelecimento. */
function findFreeSuffixedName(
  baseName: string,
  clientId: string,
  establishmentId: string | null,
  index: Map<string, IndexedMaterial>,
): string {
  for (let n = 1; n < 1000; n += 1) {
    const candidate = `${baseName}_${n}`;
    if (!index.has(rawMaterialScopeKey(clientId, establishmentId, candidate))) {
      return candidate;
    }
  }
  // Praticamente inalcançável (999 colisões do mesmo nome), mas cobre o tipo.
  return `${baseName}_${Date.now()}`;
}

export async function importRawMaterialsAction(
  rows: unknown,
): Promise<RawMaterialImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const parsed = parseImportRawMaterialsPayload(rows);
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

  const index = new Map<string, IndexedMaterial>();
  const beforeById = new Map<string, RawMaterialSnapshot>();
  for (const r of existingRows ?? []) {
    const id = String(r.id);
    const clientId = r.client_id != null ? String(r.client_id) : null;
    // Itens legados (sem cliente) nunca entram no índice de casamento — a
    // planilha sempre traz cliente resolvido, então nunca vai colidir com um
    // item ainda não migrado (por design: ver plano de isolamento por cliente).
    if (clientId) {
      const establishmentId = r.establishment_id != null ? String(r.establishment_id) : null;
      index.set(rawMaterialScopeKey(clientId, establishmentId, String(r.name)), { id });
    }
    beforeById.set(id, {
      name: String(r.name),
      price_unit: String(r.price_unit),
      unit_price_brl: Number(r.unit_price_brl),
      notes: r.notes != null ? String(r.notes) : null,
    });
  }

  let created = 0;
  let updated = 0;
  let ignored = 0;
  let skipped = 0;

  const rowsToProcess: RawMaterialImportRowInput[] = parsed.rows.slice(
    0,
    MAX_RAW_MATERIAL_IMPORT_ROWS,
  );

  for (const row of rowsToProcess) {
    if (row.resolution === "ignore") {
      ignored += 1;
      continue;
    }

    // Revalida posse do cliente/estabelecimento — nunca confia no que veio
    // resolvido no cliente (o nome→ID podia estar certo na hora da
    // pré-visualização e não estar mais, ou vir de uma requisição forjada).
    if (!ownedClientIds.has(row.client_id)) {
      skipped += 1;
      continue;
    }
    const establishmentId: string | null = row.establishment_id ?? null;
    if (establishmentId) {
      if (establishmentClientById.get(establishmentId) !== row.client_id) {
        skipped += 1;
        continue;
      }
    }

    const key = rawMaterialScopeKey(row.client_id, establishmentId, row.name);
    const existing = index.get(key);

    if (existing) {
      // Conflito real (existe agora, no servidor, no mesmo âmbito) — só
      // prossegue se o usuário decidiu explicitamente o que fazer com ele.
      if (row.resolution === "overwrite") {
        const { error } = await supabase
          .from("professional_raw_materials")
          .update({
            price_unit: row.price_unit,
            unit_price_brl: row.unit_price_brl,
            notes: row.notes,
          })
          .eq("id", existing.id)
          .eq("owner_user_id", workspaceOwnerId);

        if (error) {
          console.error("[import:raw-materials] overwrite falhou", {
            id: existing.id,
            code: error.code,
            message: error.message,
          });
          skipped += 1;
          continue;
        }

        const before = beforeById.get(existing.id);
        if (before) {
          await logRawMaterialChange({
            supabase,
            ownerUserId: workspaceOwnerId,
            actorUserId: user.id,
            rawMaterialId: existing.id,
            before,
            after: {
              name: before.name,
              price_unit: row.price_unit,
              unit_price_brl: row.unit_price_brl,
              notes: row.notes,
            },
            source: "bulk_create_import",
          });
        }

        updated += 1;
        continue;
      }

      if (row.resolution === "create_new") {
        const newName = findFreeSuffixedName(row.name, row.client_id, establishmentId, index);
        const { data: insertedRow, error } = await supabase
          .from("professional_raw_materials")
          .insert({
            owner_user_id: workspaceOwnerId,
            name: newName,
            price_unit: row.price_unit,
            unit_price_brl: row.unit_price_brl,
            notes: row.notes,
            client_id: row.client_id,
            establishment_id: establishmentId,
            contexto: establishmentId ? "ESTABELECIMENTO" : "REPOSITORIO",
          })
          .select("id")
          .single();

        if (error || !insertedRow) {
          console.error("[import:raw-materials] create_new falhou", {
            name: newName,
            code: error?.code,
            message: error?.message,
          });
          skipped += 1;
          continue;
        }
        index.set(rawMaterialScopeKey(row.client_id, establishmentId, newName), {
          id: String(insertedRow.id),
        });
        created += 1;
        continue;
      }

      // resolution === "create" mas o item já existe (estado ficou obsoleto
      // entre a pré-visualização e o envio, ou o usuário não resolveu o
      // conflito) — não decide sozinho, marca como não importada.
      skipped += 1;
      continue;
    }

    // Sem conflito: cria normalmente, independentemente do valor de resolution.
    const { data: insertedRow, error } = await supabase
      .from("professional_raw_materials")
      .insert({
        owner_user_id: workspaceOwnerId,
        name: row.name,
        price_unit: row.price_unit,
        unit_price_brl: row.unit_price_brl,
        notes: row.notes,
        client_id: row.client_id,
        establishment_id: establishmentId,
        contexto: establishmentId ? "ESTABELECIMENTO" : "REPOSITORIO",
      })
      .select("id")
      .single();

    if (error || !insertedRow) {
      // 23505 = colisão no índice único (corrida entre linhas do mesmo
      // arquivo processadas em paralelo por outra aba, por exemplo).
      console.error("[import:raw-materials] create falhou", {
        name: row.name,
        code: error?.code,
        message: error?.message,
      });
      skipped += 1;
      continue;
    }

    index.set(key, { id: String(insertedRow.id) });
    created += 1;
  }

  revalidatePath("/materias-primas");
  revalidatePath("/ficha-tecnica");

  return { ok: true, created, updated, ignored, skipped };
}
