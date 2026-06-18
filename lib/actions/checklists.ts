"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getServerUser } from "@/lib/supabase/get-server-user";
import { parseAppliesTo } from "@/lib/checklists/parse-applies-to";
import type {
  ChecklistTemplateItemRow,
  ChecklistTemplateRow,
  ChecklistTemplateSectionRow,
  ChecklistTemplateSectionWithItems,
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
      is_structure_only: Boolean(it.is_structure_only),
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
        if (it.is_structure_only) continue;
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

async function queryActiveChecklistCatalog(
  supabase: SupabaseClient,
): Promise<ChecklistTemplateWithSections[]> {
  const { data, error } = await supabase
    .from("checklist_templates")
    .select(
      `
      *,
      checklist_template_sections (
        *,
        checklist_template_items (*)
      )
    `,
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  const templatesRaw: Record<string, unknown>[] = [];
  const sectionsRaw: Record<string, unknown>[] = [];
  const itemsRaw: Record<string, unknown>[] = [];

  for (const row of data) {
    const { checklist_template_sections: sections, ...template } = row as Record<
      string,
      unknown
    > & {
      checklist_template_sections?: Array<
        Record<string, unknown> & {
          checklist_template_items?: Record<string, unknown>[];
        }
      >;
    };

    templatesRaw.push(template);
    for (const section of sections ?? []) {
      const { checklist_template_items: items, ...sectionRow } = section;
      sectionsRaw.push(sectionRow);
      for (const item of items ?? []) {
        itemsRaw.push(item);
      }
    }
  }

  return assembleTemplates(templatesRaw, sectionsRaw, itemsRaw);
}

/**
 * Catálogo leve para listagem: metadados + contagens, sem descrições de itens.
 * Reduz drasticamente o payload em relação ao join aninhado completo.
 */
async function queryActiveChecklistCatalogSummary(
  supabase: SupabaseClient,
): Promise<ChecklistTemplateWithSections[]> {
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "list_active_checklist_catalog_summary",
  );

  if (!rpcError && rpcRows?.length) {
    return (rpcRows as Record<string, unknown>[]).map((raw) => {
      const base = mapTemplateRow(raw);
      return {
        ...base,
        sections: [],
        required_item_count: Number(raw.required_item_count ?? 0),
        total_item_count: Number(raw.total_item_count ?? 0),
      };
    });
  }

  const { data: templatesRaw, error } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !templatesRaw?.length) return [];

  const templateIds = templatesRaw.map((t) => String(t.id));
  const countsByTemplate = new Map<string, { total: number; required: number }>();
  for (const id of templateIds) countsByTemplate.set(id, { total: 0, required: 0 });

  if (templateIds.length > 0) {
    const { data: itemRows } = await supabase
      .from("checklist_template_items")
      .select(
        "is_required, is_structure_only, checklist_template_sections!inner(template_id)",
      )
      .in("checklist_template_sections.template_id", templateIds);

    for (const row of itemRows ?? []) {
      const nested = row.checklist_template_sections as
        | { template_id: string }
        | { template_id: string }[]
        | null;
      const templateId = String(
        Array.isArray(nested) ? nested[0]?.template_id : nested?.template_id,
      );
      if (!templateId) continue;
      if (row.is_structure_only) continue;
      const cur = countsByTemplate.get(templateId) ?? { total: 0, required: 0 };
      cur.total += 1;
      if (row.is_required) cur.required += 1;
      countsByTemplate.set(templateId, cur);
    }
  }

  return templatesRaw.map((raw) => {
    const base = mapTemplateRow(raw as Record<string, unknown>);
    const counts = countsByTemplate.get(base.id) ?? { total: 0, required: 0 };
    return {
      ...base,
      sections: [],
      required_item_count: counts.required,
      total_item_count: counts.total,
    };
  });
}

/** Catálogo global — leitura idêntica para todos; service role evita cookies no cache. */
async function fetchActiveChecklistCatalogCached(): Promise<
  ChecklistTemplateWithSections[]
> {
  return queryActiveChecklistCatalogSummary(createServiceRoleClient());
}

const getCachedActiveChecklistCatalog = unstable_cache(
  fetchActiveChecklistCatalogCached,
  ["checklist-catalog-active-v3"],
  { revalidate: 300, tags: ["checklist-catalog"] },
);

export async function loadChecklistCatalog(): Promise<{
  templates: ChecklistTemplateWithSections[];
}> {
  const { supabase, user } = await getServerUser();
  if (!user) return { templates: [] };

  try {
    const templates = await getCachedActiveChecklistCatalog();
    return { templates };
  } catch {
    const templates = await queryActiveChecklistCatalogSummary(supabase);
    return { templates };
  }
}

export async function getChecklistTemplateWithItems(
  templateId: string,
): Promise<ChecklistTemplateWithSections | null> {
  const { supabase, user } = await getServerUser();
  if (!user) return null;
  return loadChecklistTemplateBundleByIdDirect(supabase, templateId);
}

/** Seções e itens de um template — para expandir o cartão no catálogo. */
export async function loadChecklistTemplatePreviewAction(
  templateId: string,
): Promise<ChecklistTemplateSectionWithItems[] | null> {
  const { supabase, user } = await getServerUser();
  if (!user) return null;

  const id = templateId.trim();
  if (!id) return null;

  try {
    const bundle = await getCachedChecklistTemplatePreview(id);
    return bundle?.sections ?? null;
  } catch {
    const bundle = await loadChecklistTemplateBundleByIdDirect(supabase, id);
    return bundle?.sections ?? null;
  }
}

async function fetchChecklistTemplatePreviewCached(
  templateId: string,
): Promise<ChecklistTemplateWithSections | null> {
  return loadChecklistTemplateBundleByIdDirect(
    createServiceRoleClient(),
    templateId,
  );
}

function getCachedChecklistTemplatePreview(templateId: string) {
  return unstable_cache(
    () => fetchChecklistTemplatePreviewCached(templateId),
    ["checklist-template-preview-v1", templateId],
    { revalidate: 300, tags: ["checklist-catalog", `checklist-template-${templateId}`] },
  )();
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

  return loadChecklistTemplateBundleByIdDirect(supabase, templateId);
}

/**
 * Variante sem verificação de autenticação — usa cliente Supabase fornecido pelo chamador.
 * Paralleliza template + sections; items dependem dos section IDs.
 * Usar quando o contexto autenticado já foi verificado antes da chamada.
 */
export async function loadChecklistTemplateBundleByIdDirect(
  supabase: SupabaseClient,
  templateId: string,
): Promise<ChecklistTemplateWithSections | null> {
  // Busca template metadata + sections em paralelo (items dependem de section IDs)
  const [{ data: t, error: tErr }, { data: sectionsRaw }] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle(),
    supabase
      .from("checklist_template_sections")
      .select("*")
      .eq("template_id", templateId)
      .order("position", { ascending: true }),
  ]);

  if (tErr || !t) return null;

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
