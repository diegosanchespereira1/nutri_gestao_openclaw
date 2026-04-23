"use server";

import { createClient } from "@/lib/supabase/server";
import { parseAppliesTo } from "@/lib/checklists/parse-applies-to";
import type {
  ChecklistTemplateItemRow,
  ChecklistTemplateRow,
  ChecklistTemplateSectionRow,
  ChecklistTemplateWithSections,
} from "@/lib/types/checklists";

function mapTemplateRow(row: Record<string, unknown>): ChecklistTemplateRow {
  return {
    id: String(row.id),
    name: String(row.name),
    portaria_ref: String(row.portaria_ref),
    uf: String(row.uf),
    applies_to: parseAppliesTo(row.applies_to),
    description:
      row.description === null || row.description === undefined
        ? null
        : String(row.description),
    version: Number(row.version),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function assembleTemplates(
  templatesRaw: Record<string, unknown>[],
  sectionsRaw: Record<string, unknown>[],
  itemsRaw: Record<string, unknown>[],
): ChecklistTemplateWithSections[] {
  const sectionsByTemplate = new Map<string, ChecklistTemplateSectionRow[]>();
  for (const s of sectionsRaw) {
    const templateId = String(s.template_id);
    const sec: ChecklistTemplateSectionRow = {
      id: String(s.id),
      template_id: templateId,
      title: String(s.title),
      position: Number(s.position),
      created_at: String(s.created_at),
    };
    const list = sectionsByTemplate.get(templateId) ?? [];
    list.push(sec);
    sectionsByTemplate.set(templateId, list);
  }
  for (const list of sectionsByTemplate.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  const itemsBySection = new Map<string, ChecklistTemplateItemRow[]>();
  for (const it of itemsRaw) {
    const sectionId = String(it.section_id);
    const item: ChecklistTemplateItemRow = {
      id: String(it.id),
      section_id: sectionId,
      description: String(it.description),
      is_required: Boolean(it.is_required),
      position: Number(it.position),
      peso: it.peso !== null && it.peso !== undefined ? Number(it.peso) : 1,
      created_at: String(it.created_at),
    };
    const list = itemsBySection.get(sectionId) ?? [];
    list.push(item);
    itemsBySection.set(sectionId, list);
  }
  for (const list of itemsBySection.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  return templatesRaw.map((raw) => {
    const base = mapTemplateRow(raw);
    const sections = (sectionsByTemplate.get(base.id) ?? []).map((sec) => {
      const items = itemsBySection.get(sec.id) ?? [];
      return { ...sec, items };
    });
    let required_item_count = 0;
    let total_item_count = 0;
    for (const sec of sections) {
      for (const it of sec.items) {
        total_item_count += 1;
        if (it.is_required) required_item_count += 1;
      }
    }
    return {
      ...base,
      sections,
      required_item_count,
      total_item_count,
    };
  });
}

export async function loadChecklistCatalog(): Promise<{
  templates: ChecklistTemplateWithSections[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { templates: [] };

  const { data: templatesRaw, error: tErr } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (tErr || !templatesRaw?.length) {
    return { templates: [] };
  }

  const templateIds = templatesRaw.map((r) => String(r.id));

  const { data: sectionsRaw, error: sErr } = await supabase
    .from("checklist_template_sections")
    .select("*")
    .in("template_id", templateIds)
    .order("position", { ascending: true });

  if (sErr || !sectionsRaw) {
    return { templates: assembleTemplates(templatesRaw, [], []) };
  }

  const sectionIds = sectionsRaw.map((r) => String(r.id));

  const { data: itemsRaw, error: iErr } = await supabase
    .from("checklist_template_items")
    .select("*")
    .in("section_id", sectionIds)
    .order("position", { ascending: true });

  if (iErr || !itemsRaw) {
    return { templates: assembleTemplates(templatesRaw, sectionsRaw, []) };
  }

  return {
    templates: assembleTemplates(templatesRaw, sectionsRaw, itemsRaw),
  };
}

export async function getChecklistTemplateWithItems(
  templateId: string,
): Promise<ChecklistTemplateWithSections | null> {
  const { templates } = await loadChecklistCatalog();
  return templates.find((t) => t.id === templateId) ?? null;
}

/** Catálogo por ID (inclui template inativo) — sessões de preenchimento já iniciadas. */
export async function loadChecklistTemplateBundleById(
  templateId: string,
): Promise<ChecklistTemplateWithSections | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: t, error: tErr } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (tErr || !t) return null;

  const { data: sectionsRaw } = await supabase
    .from("checklist_template_sections")
    .select("*")
    .eq("template_id", templateId)
    .order("position", { ascending: true });

  const sectionIds = (sectionsRaw ?? []).map((r) => String(r.id));
  const { data: itemsRaw } =
    sectionIds.length > 0
      ? await supabase
          .from("checklist_template_items")
          .select("*")
          .in("section_id", sectionIds)
          .order("position", { ascending: true })
      : { data: [] as Record<string, unknown>[] };

  const assembled = assembleTemplates(
    [t as Record<string, unknown>],
    (sectionsRaw ?? []) as Record<string, unknown>[],
    (itemsRaw ?? []) as Record<string, unknown>[],
  );
  return assembled[0] ?? null;
}
