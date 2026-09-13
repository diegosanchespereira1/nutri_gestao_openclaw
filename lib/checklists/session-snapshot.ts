import type { SupabaseClient } from "@supabase/supabase-js";

import { parseAppliesTo } from "@/lib/checklists/parse-applies-to";
import { sortChecklistItemsByPosition } from "@/lib/checklists/sort-checklist-items";
import type {
  ChecklistTemplateItemRow,
  ChecklistTemplateSectionWithItems,
  ChecklistTemplateWithSections,
} from "@/lib/types/checklists";

type SnapshotHeader = {
  id: string;
  session_id: string;
  template_origin: "system" | "custom" | "workspace";
  source_template_id: string | null;
  name: string;
  portaria_ref: string | null;
  uf: string | null;
  version: number | null;
};

type SnapshotSectionRow = {
  id: string;
  snapshot_id: string;
  source_section_id: string | null;
  title: string;
  position: number;
};

type SnapshotItemRow = {
  id: string;
  snapshot_id: string;
  snapshot_section_id: string;
  source_item_id: string;
  description: string;
  is_required: boolean;
  is_structure_only: boolean;
  peso: number;
  position: number;
  archived_at: string | null;
};

export type SessionSnapshotSummary = {
  session_id: string;
  template_origin: "system" | "custom" | "workspace";
  name: string;
  portaria_ref: string | null;
  total_items: number;
  items: Array<{
    source_item_id: string;
    is_structure_only: boolean;
    archived_at: string | null;
  }>;
};

/**
 * Origem das respostas da sessão. Após exclusão do modelo as FKs ficam null —
 * nesse caso usa o snapshot.
 */
export async function resolveSessionItemResponseSource(
  supabase: SupabaseClient,
  session: {
    id: string;
    workspace_template_id?: string | null;
    custom_template_id?: string | null;
    template_id?: string | null;
  },
): Promise<"global" | "custom" | "workspace"> {
  if (session.workspace_template_id) return "workspace";
  if (session.custom_template_id) return "custom";
  if (session.template_id) return "global";

  const { data } = await supabase
    .from("checklist_fill_snapshots")
    .select("template_origin")
    .eq("session_id", session.id)
    .maybeSingle();

  if (data?.template_origin === "workspace") return "workspace";
  if (data?.template_origin === "custom") return "custom";
  return "global";
}

/** Confirma que o item existe no snapshot da sessão (e não é só estrutura). */
export async function getSnapshotItemMeta(
  supabase: SupabaseClient,
  sessionId: string,
  sourceItemId: string,
): Promise<{ is_structure_only: boolean } | null> {
  const { data: snap } = await supabase
    .from("checklist_fill_snapshots")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!snap) return null;

  const { data: item } = await supabase
    .from("checklist_fill_snapshot_items")
    .select("is_structure_only")
    .eq("snapshot_id", snap.id)
    .eq("source_item_id", sourceItemId)
    .maybeSingle();

  if (!item) return null;
  return { is_structure_only: Boolean(item.is_structure_only) };
}

/**
 * Garante snapshot no servidor (idempotente). Útil após migração ou se o
 * trigger falhou; normalmente o AFTER INSERT já criou.
 */
export async function ensureSessionSnapshot(
  supabase: SupabaseClient,
  sessionId: string,
  mode: "create" | "backfill" = "create",
): Promise<string | null> {
  const { data, error } = await supabase.rpc(
    "ensure_checklist_fill_session_snapshot",
    {
      p_session_id: sessionId,
      p_mode: mode,
    },
  );
  if (error) {
    console.error(
      "[ensureSessionSnapshot]",
      error.message,
      error.code,
      sessionId,
    );
    return null;
  }
  return data != null ? String(data) : null;
}

function assembleFromSnapshotRows(
  header: SnapshotHeader,
  sectionsRaw: SnapshotSectionRow[],
  itemsRaw: SnapshotItemRow[],
): ChecklistTemplateWithSections {
  const itemsBySection = new Map<string, ChecklistTemplateItemRow[]>();
  for (const it of itemsRaw) {
    const list = itemsBySection.get(it.snapshot_section_id) ?? [];
    list.push({
      // Respostas/fotos usam o id do catálogo no momento do snapshot
      id: String(it.source_item_id),
      section_id: String(it.snapshot_section_id),
      description: String(it.description),
      is_required: Boolean(it.is_required),
      position: Number(it.position),
      peso: it.peso != null ? Number(it.peso) : 1,
      is_structure_only: Boolean(it.is_structure_only),
      archived_at: it.archived_at ? String(it.archived_at) : null,
      created_at: "",
    });
    itemsBySection.set(it.snapshot_section_id, list);
  }

  const sections: ChecklistTemplateSectionWithItems[] = sectionsRaw
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((sec) => {
      const items = sortChecklistItemsByPosition(
        itemsBySection.get(sec.id) ?? [],
      );
      return {
        id: String(sec.id),
        template_id: String(header.source_template_id ?? header.session_id),
        title: String(sec.title),
        position: Number(sec.position),
        created_at: "",
        items,
      };
    })
    .filter((sec) => sec.items.length > 0 || sectionsRaw.length === 1);

  let required_item_count = 0;
  let total_item_count = 0;
  for (const sec of sections) {
    for (const it of sec.items) {
      if (it.is_structure_only) continue;
      // Snapshot já é o conjunto certo; arquivados no snapshot entram no
      // histórico (foram snapshottados). Em fill novo só há ativos.
      total_item_count += 1;
      if (it.is_required) required_item_count += 1;
    }
  }

  return {
    id: String(header.source_template_id ?? header.session_id),
    name: String(header.name),
    portaria_ref: String(header.portaria_ref ?? ""),
    uf: String(header.uf ?? "*"),
    applies_to: parseAppliesTo([]) as ChecklistTemplateWithSections["applies_to"],
    description: null,
    version: header.version != null ? Number(header.version) : 1,
    is_active: true,
    created_at: "",
    updated_at: "",
    sections,
    required_item_count,
    total_item_count,
  };
}

/** Carrega o template da sessão a partir do snapshot (preferido). */
export async function loadSessionTemplateFromSnapshot(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<ChecklistTemplateWithSections | null> {
  const { data: header, error } = await supabase
    .from("checklist_fill_snapshots")
    .select(
      "id, session_id, template_origin, source_template_id, name, portaria_ref, uf, version",
    )
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error || !header) return null;

  const snapId = String(header.id);
  const [{ data: sectionsRaw }, { data: itemsRaw }] = await Promise.all([
    supabase
      .from("checklist_fill_snapshot_sections")
      .select("id, snapshot_id, source_section_id, title, position")
      .eq("snapshot_id", snapId)
      .order("position", { ascending: true }),
    supabase
      .from("checklist_fill_snapshot_items")
      .select(
        "id, snapshot_id, snapshot_section_id, source_item_id, description, is_required, is_structure_only, peso, position, archived_at",
      )
      .eq("snapshot_id", snapId)
      .order("position", { ascending: true }),
  ]);

  return assembleFromSnapshotRows(
    header as SnapshotHeader,
    (sectionsRaw ?? []) as SnapshotSectionRow[],
    (itemsRaw ?? []) as SnapshotItemRow[],
  );
}

/**
 * Resumos de snapshot para várias sessões (histórico do cliente).
 * Uma query de headers + uma de itens.
 */
export async function loadSessionSnapshotSummaries(
  supabase: SupabaseClient,
  sessionIds: string[],
): Promise<Map<string, SessionSnapshotSummary>> {
  const map = new Map<string, SessionSnapshotSummary>();
  if (sessionIds.length === 0) return map;

  const { data: headers } = await supabase
    .from("checklist_fill_snapshots")
    .select(
      "id, session_id, template_origin, name, portaria_ref",
    )
    .in("session_id", sessionIds);

  if (!headers?.length) return map;

  const snapIds = headers.map((h) => String(h.id));
  const { data: items } = await supabase
    .from("checklist_fill_snapshot_items")
    .select("snapshot_id, source_item_id, is_structure_only, archived_at")
    .in("snapshot_id", snapIds);

  const itemsBySnap = new Map<string, SnapshotItemRow[]>();
  for (const it of items ?? []) {
    const sid = String(it.snapshot_id);
    const list = itemsBySnap.get(sid) ?? [];
    list.push(it as SnapshotItemRow);
    itemsBySnap.set(sid, list);
  }

  for (const h of headers) {
    const snapId = String(h.id);
    const sessionId = String(h.session_id);
    const snapItems = itemsBySnap.get(snapId) ?? [];
    let total = 0;
    for (const it of snapItems) {
      if (it.is_structure_only) continue;
      total += 1;
    }
    map.set(sessionId, {
      session_id: sessionId,
      template_origin: h.template_origin as SessionSnapshotSummary["template_origin"],
      name: String(h.name),
      portaria_ref: h.portaria_ref != null ? String(h.portaria_ref) : null,
      total_items: total,
      items: snapItems.map((it) => ({
        source_item_id: String(it.source_item_id),
        is_structure_only: Boolean(it.is_structure_only),
        archived_at: it.archived_at ? String(it.archived_at) : null,
      })),
    });
  }

  return map;
}
