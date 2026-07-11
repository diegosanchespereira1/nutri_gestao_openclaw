"use server";

// Histórico de alterações (preço, nome, unidade, observações) de uma
// matéria-prima. Sem tabela própria: reaproveita `application_activity_log`
// (mesmo mecanismo do histórico de responsável do paciente), gravando um
// evento por alteração com quem fez, quando e o que mudou.

import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerContext } from "@/lib/supabase/get-server-user";
import {
  buildRawMaterialChangeSummary,
  computeRawMaterialChangeFields,
  hasRawMaterialChangeFields,
  type RawMaterialSnapshot,
} from "@/lib/raw-materials/change-history";
import type {
  RawMaterialChangeEvent,
  RawMaterialChangeFields,
  RawMaterialChangeSource,
} from "@/lib/types/raw-material-history";

const EVENT_TYPE = "raw_material_updated";
const ENTITY_TYPE = "raw_material";

/**
 * Grava um evento de histórico se, e só se, algo realmente mudou entre os
 * dois snapshots. Não lança em caso de falha (histórico é best-effort — não
 * deve derrubar a operação principal de salvar/importar).
 */
export async function logRawMaterialChange(args: {
  supabase: SupabaseClient;
  ownerUserId: string;
  actorUserId: string;
  rawMaterialId: string;
  before: RawMaterialSnapshot;
  after: RawMaterialSnapshot;
  source: RawMaterialChangeSource;
}): Promise<void> {
  const { supabase, ownerUserId, actorUserId, rawMaterialId, before, after, source } = args;

  const fields = computeRawMaterialChangeFields(before, after);
  if (!hasRawMaterialChangeFields(fields)) return;

  const { error } = await supabase.from("application_activity_log").insert({
    owner_user_id: ownerUserId,
    actor_user_id: actorUserId,
    event_type: EVENT_TYPE,
    entity_type: ENTITY_TYPE,
    entity_id: rawMaterialId,
    metadata: { fields, source },
  });

  if (error) {
    console.error("[raw-material-history] falha ao registrar alteração", {
      rawMaterialId,
      code: error.code,
      message: error.message,
    });
  }
}

type ActivityLogRow = {
  id: string;
  actor_user_id: string;
  metadata: unknown;
  created_at: string;
};

function readMetadata(raw: unknown): { fields: RawMaterialChangeFields; source: RawMaterialChangeSource } {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const fields = (obj.fields ?? {}) as RawMaterialChangeFields;
  const sourceRaw = obj.source;
  const source: RawMaterialChangeSource =
    sourceRaw === "bulk_price_import" || sourceRaw === "bulk_create_import"
      ? sourceRaw
      : "manual_edit";
  return { fields, source };
}

/** Histórico de alterações de uma matéria-prima específica, mais recente primeiro. */
export async function loadRawMaterialChangeHistory(
  rawMaterialId: string,
): Promise<RawMaterialChangeEvent[]> {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return [];

  const { data, error } = await supabase
    .from("application_activity_log")
    .select("id, actor_user_id, metadata, created_at")
    .eq("owner_user_id", workspaceOwnerId)
    .eq("entity_type", ENTITY_TYPE)
    .eq("entity_id", rawMaterialId)
    .eq("event_type", EVENT_TYPE)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  const rows = data as ActivityLogRow[];
  const actorIds = [...new Set(rows.map((r) => r.actor_user_id).filter(Boolean))];

  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", actorIds);
    for (const p of profiles ?? []) {
      const uid = p.user_id as string;
      const fn = p.full_name as string;
      if (uid && fn) actorNames.set(uid, fn);
    }
  }

  return rows.map((row) => {
    const { fields, source } = readMetadata(row.metadata);
    return {
      id: row.id,
      occurred_at: row.created_at,
      actor_user_id: row.actor_user_id,
      actor_full_name: actorNames.get(row.actor_user_id) ?? null,
      source,
      fields,
      summary: buildRawMaterialChangeSummary(fields),
    };
  });
}
