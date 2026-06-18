import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  WorkspaceEditSection,
} from "@/lib/actions/checklist-workspace";

export type PersistWorkspaceTemplateOptions = {
  isDraft: boolean;
  bumpVersionIfUsed: boolean;
};

export type PersistWorkspaceTemplateResult =
  | { ok: true; sections: WorkspaceEditSection[] }
  | { ok: false; error: string };

export async function persistWorkspaceTemplateStructure(
  supabase: SupabaseClient,
  templateId: string,
  workspaceOwnerId: string,
  input: { name: string; sections: WorkspaceEditSection[] },
  options: PersistWorkspaceTemplateOptions,
): Promise<PersistWorkspaceTemplateResult> {
  const { error: nameErr } = await supabase
    .from("checklist_workspace_templates")
    .update({ name: input.name })
    .eq("id", templateId)
    .eq("owner_user_id", workspaceOwnerId);
  if (nameErr) return { ok: false, error: "Não foi possível salvar o nome." };

  if (!options.isDraft) {
    const { count: openSessionsCount } = await supabase
      .from("checklist_fill_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_template_id", templateId)
      .is("dossier_approved_at", null);

    if ((openSessionsCount ?? 0) > 0) {
      return {
        ok: false,
        error:
          "Existem rascunhos em aberto usando este modelo. Aprove-os ou exclua-os antes de editar.",
      };
    }
  }

  const { data: oldSections } = await supabase
    .from("checklist_workspace_sections")
    .select("id")
    .eq("workspace_template_id", templateId);

  const oldSectionIds = (oldSections ?? []).map((s) => String(s.id));
  const { data: oldItems } =
    oldSectionIds.length > 0
      ? await supabase
          .from("checklist_workspace_items")
          .select("id")
          .in("workspace_section_id", oldSectionIds)
      : { data: [] as { id: string }[] };

  const oldItemIds = (oldItems ?? []).map((i) => String(i.id));
  const usedItemIds = new Set<string>();

  if (!options.isDraft && oldItemIds.length > 0) {
    const { data: usedRefs } = await supabase
      .from("checklist_fill_item_responses")
      .select("workspace_item_id")
      .in("workspace_item_id", oldItemIds);
    for (const ref of usedRefs ?? []) {
      const itemId = ref.workspace_item_id as string | null;
      if (itemId) usedItemIds.add(itemId);
    }
  }

  const payloadSectionIds = new Set(
    input.sections.map((sec) => sec.id).filter((id): id is string => Boolean(id)),
  );
  const payloadItemIds = new Set(
    input.sections
      .flatMap((sec) => sec.items.map((it) => it.id))
      .filter((id): id is string => Boolean(id)),
  );

  const persistedSections: WorkspaceEditSection[] = [];
  let sectionPos = 0;

  for (const sec of input.sections) {
    let sectionId: string;

    if (sec.id && payloadSectionIds.has(sec.id)) {
      const { error: secErr } = await supabase
        .from("checklist_workspace_sections")
        .update({ title: sec.title, position: sectionPos })
        .eq("id", sec.id)
        .eq("workspace_template_id", templateId);
      if (secErr) {
        return { ok: false, error: "Não foi possível salvar as seções." };
      }
      sectionId = sec.id;
    } else {
      const { data: secRow, error: secErr } = await supabase
        .from("checklist_workspace_sections")
        .insert({
          workspace_template_id: templateId,
          title: sec.title,
          position: sectionPos,
        })
        .select("id")
        .single();
      if (secErr || !secRow) {
        return { ok: false, error: "Não foi possível salvar as seções." };
      }
      sectionId = String(secRow.id);
    }

    const persistedItems: WorkspaceEditSection["items"] = [];
    let itemPos = 0;

    for (const it of sec.items) {
      if (it.id && payloadItemIds.has(it.id)) {
        const { error: itemErr } = await supabase
          .from("checklist_workspace_items")
          .update({
            workspace_section_id: sectionId,
            description: it.description,
            is_required: it.is_required,
            position: itemPos,
          })
          .eq("id", it.id);
        if (itemErr) {
          return { ok: false, error: "Não foi possível salvar os itens." };
        }
        persistedItems.push({
          id: it.id,
          description: it.description,
          is_required: it.is_required,
        });
      } else {
        const { data: itemRow, error: itemErr } = await supabase
          .from("checklist_workspace_items")
          .insert({
            workspace_section_id: sectionId,
            description: it.description,
            is_required: it.is_required,
            position: itemPos,
          })
          .select("id")
          .single();
        if (itemErr || !itemRow) {
          return { ok: false, error: "Não foi possível salvar os itens." };
        }
        persistedItems.push({
          id: String(itemRow.id),
          description: it.description,
          is_required: it.is_required,
        });
      }
      itemPos += 1;
    }

    persistedSections.push({
      id: sectionId,
      title: sec.title,
      items: persistedItems,
    });
    sectionPos += 1;
  }

  const removableItemIds = oldItemIds.filter(
    (id) => !payloadItemIds.has(id) && !usedItemIds.has(id),
  );
  if (removableItemIds.length > 0) {
    await supabase
      .from("checklist_workspace_items")
      .delete()
      .in("id", removableItemIds);
  }

  for (const sectionId of oldSectionIds) {
    if (payloadSectionIds.has(sectionId)) continue;
    const { count: itemCount } = await supabase
      .from("checklist_workspace_items")
      .select("id", { count: "exact", head: true })
      .eq("workspace_section_id", sectionId);
    if ((itemCount ?? 0) === 0) {
      await supabase
        .from("checklist_workspace_sections")
        .delete()
        .eq("id", sectionId)
        .eq("workspace_template_id", templateId);
    }
  }

  if (options.bumpVersionIfUsed) {
    const { count } = await supabase
      .from("checklist_fill_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_template_id", templateId);

    if (count && count > 0) {
      const { data: template } = await supabase
        .from("checklist_workspace_templates")
        .select("version")
        .eq("id", templateId)
        .maybeSingle();

      await supabase
        .from("checklist_workspace_templates")
        .update({ version: Number(template?.version ?? 1) + 1 })
        .eq("id", templateId);
    }
  }

  return { ok: true, sections: persistedSections };
}
