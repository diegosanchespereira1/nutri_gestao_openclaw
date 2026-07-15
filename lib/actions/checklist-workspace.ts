"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

function invalidateWorkspaceCatalogCache(workspaceOwnerId: string) {
  revalidateTag(`workspace-catalog-${workspaceOwnerId}`, "max");
}
import { redirect } from "next/navigation";

import { logApplicationActivityAction } from "@/lib/actions/application-activity";
import { seedInheritedValidResponsesForSession } from "@/lib/actions/checklist-fill";
import { loadChecklistTemplateBundleById } from "@/lib/actions/checklists";
import {
  WORKSPACE_TEMPLATE_DRAFT_DEFAULT_NAME,
  normalizeDraftTemplateInput,
} from "@/lib/checklists/workspace-template-draft";
import { normalizeChecklistText } from "@/lib/checklists/capitalize-checklist-text";
import { sortChecklistItemsByPosition } from "@/lib/checklists/sort-checklist-items";
import { persistWorkspaceTemplateStructure } from "@/lib/checklists/workspace-template-persist";
import { createClient } from "@/lib/supabase/server";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type { ChecklistFillSessionRow } from "@/lib/types/checklist-fill";
import type {
  ChecklistTemplateSectionWithItems,
  ChecklistTemplateWithSections,
} from "@/lib/types/checklists";

/** Template candidato a ser usado como base ao criar um novo checklist da equipe. */
export type BaseCandidateTemplate = {
  id: string;
  name: string;
  type: "official" | "workspace";
  subtitle: string;
};

export type WorkspaceTemplateListRow = {
  id: string;
  name: string;
  created_by_user_id: string;
  created_by_name: string | null;
  total_item_count: number;
  required_item_count: number;
  version: number;
  updated_at: string;
  /** true quando já existe ao menos 1 sessão de preenchimento usando este modelo. */
  has_been_used: boolean;
  /** Rascunho em criação (autosave) — ainda não publicado no catálogo. */
  is_draft: boolean;
  /** Modelo arquivado (soft-delete) — visível para reativação. */
  is_archived: boolean;
};

export type WorkspaceEditItem = {
  id?: string;
  description: string;
  is_required: boolean;
};

export type WorkspaceEditSection = {
  id?: string;
  title: string;
  items: WorkspaceEditItem[];
};

export type WorkspaceTemplateInput = {
  name: string;
  sections: WorkspaceEditSection[];
};

export type WorkspaceTemplateLoadResult = {
  id: string;
  name: string;
  version: number;
  fill_session_count: number;
  archived_at: string | null;
  published_at: string | null;
  is_draft: boolean;
  sections: Array<{
    id: string;
    title: string;
    position: number;
    items: Array<{
      id: string;
      description: string;
      is_required: boolean;
      position: number;
    }>;
  }>;
};

export type WorkspaceActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type WorkspaceDraftSaveResult =
  | { ok: true; id: string; sections: WorkspaceEditSection[] }
  | { ok: false; error: string };

/* ─── Carregamento ─────────────────────────────────────────────────────── */

async function fetchWorkspaceTemplatesForCatalogRows(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
): Promise<WorkspaceTemplateListRow[]> {
  const { data: templates, error } = await supabase
    .from("checklist_workspace_templates")
    .select("id, name, created_by_user_id, version, updated_at, published_at, archived_at")
    .eq("owner_user_id", workspaceOwnerId)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false });

  if (error || !templates || templates.length === 0) return [];

  const templateIds = templates.map((t) => String(t.id));
  const userIds = [...new Set(templates.map((t) => String(t.created_by_user_id)))];

  // Fase 1: sections + profiles + "used" checks correm em paralelo
  // (todas dependem apenas de templateIds/userIds, já disponíveis)
  const [sectionRows, profileRows, usedSessionRows] = await Promise.all([
    supabase
      .from("checklist_workspace_sections")
      .select("id, workspace_template_id")
      .in("workspace_template_id", templateIds)
      .then((r) => r.data ?? []),
    userIds.length > 0
      ? supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
    supabase
      .from("checklist_fill_sessions")
      .select("workspace_template_id")
      .in("workspace_template_id", templateIds)
      .then((r) => r.data ?? []),
  ]);

  const sectionIds = sectionRows.map((s) => String(s.id));
  const sectionToTemplate = new Map<string, string>();
  for (const s of sectionRows) {
    sectionToTemplate.set(String(s.id), String(s.workspace_template_id));
  }

  const profileNames = new Map<string, string>();
  for (const p of profileRows) {
    const name = String(p.full_name ?? "").trim();
    if (name.length > 0) profileNames.set(String(p.user_id), name);
  }

  const usedTemplateIds = new Set<string>();
  for (const row of usedSessionRows) {
    const tid = String(row.workspace_template_id ?? "");
    if (tid) usedTemplateIds.add(tid);
  }

  // Fase 2: items dependem dos sectionIds da fase anterior
  const counts = new Map<string, { total: number; required: number }>();
  for (const id of templateIds) counts.set(id, { total: 0, required: 0 });

  if (sectionIds.length > 0) {
    const { data: itemRows } = await supabase
      .from("checklist_workspace_items")
      .select("workspace_section_id, is_required")
      .in("workspace_section_id", sectionIds)
      .is("archived_at", null);

    for (const item of itemRows ?? []) {
      const tid = sectionToTemplate.get(String(item.workspace_section_id));
      if (!tid) continue;
      const cur = counts.get(tid) ?? { total: 0, required: 0 };
      cur.total += 1;
      if (item.is_required) cur.required += 1;
      counts.set(tid, cur);
    }
  }

  return templates.map((t) => ({
    id: String(t.id),
    name: String(t.name),
    created_by_user_id: String(t.created_by_user_id),
    created_by_name: profileNames.get(String(t.created_by_user_id)) ?? null,
    total_item_count: counts.get(String(t.id))?.total ?? 0,
    required_item_count: counts.get(String(t.id))?.required ?? 0,
    version: Number(t.version ?? 1),
    updated_at: String(t.updated_at),
    has_been_used: usedTemplateIds.has(String(t.id)),
    is_draft: t.published_at === null,
    is_archived: t.archived_at !== null,
  }));
}

/** Variante leve para a página /checklists — sem perfis nem verificação de sessões. */
async function fetchWorkspaceTemplatesForCatalogLightRows(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
): Promise<WorkspaceTemplateListRow[]> {
  const { data: templates, error } = await supabase
    .from("checklist_workspace_templates")
    .select("id, name, created_by_user_id, version, updated_at, published_at, archived_at")
    .eq("owner_user_id", workspaceOwnerId)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false });

  if (error || !templates || templates.length === 0) return [];

  const templateIds = templates.map((t) => String(t.id));

  const { data: sectionRows } = await supabase
    .from("checklist_workspace_sections")
    .select("id, workspace_template_id")
    .in("workspace_template_id", templateIds);

  const sectionIds = (sectionRows ?? []).map((s) => String(s.id));
  const sectionToTemplate = new Map<string, string>();
  for (const s of sectionRows ?? []) {
    sectionToTemplate.set(String(s.id), String(s.workspace_template_id));
  }

  const counts = new Map<string, { total: number; required: number }>();
  for (const id of templateIds) counts.set(id, { total: 0, required: 0 });

  if (sectionIds.length > 0) {
    const { data: itemRows } = await supabase
      .from("checklist_workspace_items")
      .select("workspace_section_id, is_required")
      .in("workspace_section_id", sectionIds)
      .is("archived_at", null);

    for (const item of itemRows ?? []) {
      const tid = sectionToTemplate.get(String(item.workspace_section_id));
      if (!tid) continue;
      const cur = counts.get(tid) ?? { total: 0, required: 0 };
      cur.total += 1;
      if (item.is_required) cur.required += 1;
      counts.set(tid, cur);
    }
  }

  return templates.map((t) => ({
    id: String(t.id),
    name: String(t.name),
    created_by_user_id: String(t.created_by_user_id),
    created_by_name: null,
    total_item_count: counts.get(String(t.id))?.total ?? 0,
    required_item_count: counts.get(String(t.id))?.required ?? 0,
    version: Number(t.version ?? 1),
    updated_at: String(t.updated_at),
    has_been_used: false,
    is_draft: t.published_at === null,
    is_archived: t.archived_at !== null,
  }));
}

function getCachedWorkspaceCatalogRows(workspaceOwnerId: string) {
  return unstable_cache(
    () =>
      fetchWorkspaceTemplatesForCatalogRows(
        createServiceRoleClient(),
        workspaceOwnerId,
      ),
    ["workspace-catalog-v2", workspaceOwnerId],
    {
      revalidate: 120,
      tags: [`workspace-catalog-${workspaceOwnerId}`],
    },
  )();
}

/** Lista todos os modelos do workspace (ativos e arquivados). */
export async function loadWorkspaceTemplatesForCatalog(): Promise<{
  rows: WorkspaceTemplateListRow[];
}> {
  const { user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return { rows: [] };

  try {
    const rows = await getCachedWorkspaceCatalogRows(workspaceOwnerId);
    return { rows };
  } catch {
    const { supabase } = await getServerContext();
    const rows = await fetchWorkspaceTemplatesForCatalogRows(
      supabase,
      workspaceOwnerId,
    );
    return { rows };
  }
}

/** Lista modelos da equipe para o catálogo principal (sem metadados extras). */
export async function loadWorkspaceTemplatesForCatalogLight(): Promise<{
  rows: WorkspaceTemplateListRow[];
}> {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return { rows: [] };

  const rows = await fetchWorkspaceTemplatesForCatalogLightRows(
    supabase,
    workspaceOwnerId,
  );
  return { rows };
}

/** Estrutura para o builder de edição. */
async function loadWorkspaceTemplateForEditWithClient(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  id: string,
): Promise<WorkspaceTemplateLoadResult | null> {
  const [{ data: template }, { count: fillSessionCount }] = await Promise.all([
    supabase
      .from("checklist_workspace_templates")
      .select("id, name, version, archived_at, published_at, owner_user_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("checklist_fill_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_template_id", id),
  ]);

  if (!template || template.owner_user_id !== workspaceOwnerId) return null;

  const { data: sections } = await supabase
    .from("checklist_workspace_sections")
    .select("id, title, position")
    .eq("workspace_template_id", id)
    .order("position", { ascending: true });

  const sectionIds = (sections ?? []).map((s) => String(s.id));
  const { data: items } =
    sectionIds.length > 0
      ? await supabase
          .from("checklist_workspace_items")
          .select("id, workspace_section_id, description, is_required, position")
          .in("workspace_section_id", sectionIds)
          .is("archived_at", null)
          .order("position", { ascending: true })
      : { data: [] as Record<string, unknown>[] };

  const itemsBySection = new Map<
    string,
    Array<{ id: string; description: string; is_required: boolean; position: number }>
  >();
  for (const it of items ?? []) {
    const sid = String(it.workspace_section_id);
    const list = itemsBySection.get(sid) ?? [];
    list.push({
      id: String(it.id),
      description: String(it.description),
      is_required: Boolean(it.is_required),
      position: Number(it.position),
    });
    itemsBySection.set(sid, list);
  }

  return {
    id: String(template.id),
    name: String(template.name),
    version: Number(template.version ?? 1),
    fill_session_count: fillSessionCount ?? 0,
    archived_at: template.archived_at as string | null,
    published_at: (template.published_at as string | null) ?? null,
    is_draft: template.published_at === null,
    sections: (sections ?? [])
      .map((sec) => ({
        id: String(sec.id),
        title: String(sec.title),
        position: Number(sec.position),
        items: itemsBySection.get(String(sec.id)) ?? [],
      }))
      .filter((sec) => sec.items.length > 0),
  };
}

export async function loadWorkspaceTemplateForEdit(
  id: string,
): Promise<WorkspaceTemplateLoadResult | null> {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return null;
  return loadWorkspaceTemplateForEditWithClient(supabase, workspaceOwnerId, id);
}

/** Seções e itens de um modelo da equipe — para expandir o cartão no catálogo. */
export async function loadWorkspaceTemplatePreviewAction(
  workspaceTemplateId: string,
): Promise<ChecklistTemplateSectionWithItems[] | null> {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return null;

  const id = workspaceTemplateId.trim();
  if (!id) return null;

  const { data: template } = await supabase
    .from("checklist_workspace_templates")
    .select("id, owner_user_id")
    .eq("id", id)
    .maybeSingle();

  if (!template || template.owner_user_id !== workspaceOwnerId) return null;

  const bundle = await loadWorkspaceTemplateBundle(id);
  return bundle?.sections ?? null;
}

/** Carrega no formato unificado para reusar o wizard de preenchimento. */
export async function loadWorkspaceTemplateBundle(
  id: string,
  options?: { includeArchivedItems?: boolean },
): Promise<ChecklistTemplateWithSections | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const includeArchivedItems = options?.includeArchivedItems === true;

  // Sem filtrar por archived_at do TEMPLATE: sessões antigas devem continuar abrindo o dossiê
  // mesmo após o template ser arquivado (regra de soft-delete).
  const { data: template } = await supabase
    .from("checklist_workspace_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!template) return null;

  const { data: sections } = await supabase
    .from("checklist_workspace_sections")
    .select("*")
    .eq("workspace_template_id", id)
    .order("position", { ascending: true });

  const sectionIds = (sections ?? []).map((s) => String(s.id));
  let itemsQuery =
    sectionIds.length > 0
      ? supabase
          .from("checklist_workspace_items")
          .select("*")
          .in("workspace_section_id", sectionIds)
          .order("position", { ascending: true })
      : null;
  if (itemsQuery && !includeArchivedItems) {
    itemsQuery = itemsQuery.is("archived_at", null);
  }
  const { data: items } = itemsQuery
    ? await itemsQuery
    : { data: [] as Record<string, unknown>[] };

  const itemsBySection = new Map<string, typeof items>();
  for (const it of items ?? []) {
    const sid = String(it.workspace_section_id);
    const list = itemsBySection.get(sid) ?? [];
    list.push(it);
    itemsBySection.set(sid, list);
  }

  let required_item_count = 0;
  let total_item_count = 0;
  const mappedSections = (sections ?? []).map((sec) => {
    const secItems = sortChecklistItemsByPosition(
      (itemsBySection.get(String(sec.id)) ?? []).map((it) => ({
        raw: it,
        id: String(it.id),
        position: Number(it.position),
      })),
    );
    const mappedItems = secItems.map(({ raw: it }) => {
      const structureOnly = Boolean(it.is_structure_only);
      if (!structureOnly) {
        total_item_count += 1;
        if (Boolean(it.is_required)) required_item_count += 1;
      }
      return {
        id: String(it.id),
        section_id: String(sec.id),
        description: String(it.description),
        is_required: Boolean(it.is_required),
        position: Number(it.position),
        peso: it.peso !== null && it.peso !== undefined ? Number(it.peso) : 1,
        is_structure_only: structureOnly,
        created_at: String(it.created_at),
      };
    });
    return {
      id: String(sec.id),
      template_id: String(template.id),
      title: String(sec.title),
      position: Number(sec.position),
      created_at: String(sec.created_at),
      items: mappedItems,
    };
  });

  return {
    id: String(template.id),
    name: String(template.name),
    portaria_ref: "",
    uf: "*",
    applies_to: [],
    description: "Modelo da equipe (workspace).",
    version: Number(template.version ?? 1),
    is_active: template.archived_at === null,
    created_at: String(template.created_at),
    updated_at: String(template.updated_at),
    sections: mappedSections,
    required_item_count,
    total_item_count,
  };
}

/* ─── Mutations ────────────────────────────────────────────────────────── */

function sanitizeInput(input: WorkspaceTemplateInput): {
  ok: true;
  name: string;
  sections: WorkspaceEditSection[];
} | { ok: false; error: string } {
  const name = (input.name ?? "").trim();
  if (name.length === 0) {
    return { ok: false, error: "O nome do checklist é obrigatório." };
  }
  if (name.length > 200) {
    return { ok: false, error: "O nome deve ter no máximo 200 caracteres." };
  }

  const sections: WorkspaceEditSection[] = [];
  for (const sec of input.sections ?? []) {
    const title = normalizeChecklistText(sec.title ?? "");
    if (title.length === 0) {
      return { ok: false, error: "Cada seção precisa de um título." };
    }
    const items: WorkspaceEditItem[] = [];
    for (const it of sec.items ?? []) {
      const desc = normalizeChecklistText(it.description ?? "");
      if (desc.length === 0) continue;
      items.push({
        id: it.id,
        description: desc,
        is_required: Boolean(it.is_required),
      });
    }
    if (items.length === 0) {
      return {
        ok: false,
        error: `A seção "${title}" precisa de pelo menos um item.`,
      };
    }
    sections.push({ id: sec.id, title, items });
  }

  if (sections.length === 0) {
    return { ok: false, error: "Adicione pelo menos uma seção com itens." };
  }

  return { ok: true, name, sections };
}

async function assertWorkspaceTemplateDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  templateId: string,
  workspaceOwnerId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabase
    .from("checklist_workspace_templates")
    .select("id, owner_user_id, archived_at, published_at, created_by_user_id")
    .eq("id", templateId)
    .maybeSingle();

  if (!existing || existing.owner_user_id !== workspaceOwnerId) {
    return { ok: false, error: "Rascunho não encontrado." };
  }
  if (existing.archived_at) {
    return { ok: false, error: "Rascunho arquivado não pode ser editado." };
  }
  if (existing.published_at !== null) {
    return { ok: false, error: "Este modelo já foi publicado." };
  }
  if (existing.created_by_user_id !== userId) {
    return { ok: false, error: "Sem permissão para editar este rascunho." };
  }
  return { ok: true };
}

async function createEmptyWorkspaceTemplateDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  userId: string,
): Promise<WorkspaceActionResult> {
  const { data: tpl, error: tErr } = await supabase
    .from("checklist_workspace_templates")
    .insert({
      owner_user_id: workspaceOwnerId,
      created_by_user_id: userId,
      name: WORKSPACE_TEMPLATE_DRAFT_DEFAULT_NAME,
      published_at: null,
    })
    .select("id")
    .single();

  if (tErr || !tpl) {
    return { ok: false, error: "Não foi possível iniciar o rascunho." };
  }

  const templateId = String(tpl.id);
  const { data: secRow, error: sErr } = await supabase
    .from("checklist_workspace_sections")
    .insert({
      workspace_template_id: templateId,
      title: "Geral",
      position: 0,
    })
    .select("id")
    .single();

  if (sErr || !secRow) {
    await supabase.from("checklist_workspace_templates").delete().eq("id", templateId);
    return { ok: false, error: "Não foi possível iniciar o rascunho." };
  }

  const { error: iErr } = await supabase.from("checklist_workspace_items").insert({
    workspace_section_id: secRow.id as string,
    description: "",
    is_required: false,
    position: 0,
  });

  if (iErr) {
    await supabase.from("checklist_workspace_templates").delete().eq("id", templateId);
    return { ok: false, error: "Não foi possível iniciar o rascunho." };
  }

  await logApplicationActivityAction({
    eventType: "checklist_workspace_draft_started",
    entityType: "checklist_workspace_templates",
    entityId: templateId,
    metadata: { name: WORKSPACE_TEMPLATE_DRAFT_DEFAULT_NAME },
  });

  return { ok: true, id: templateId };
}

/** Garante um rascunho ativo para a página de criação. */
export async function ensureWorkspaceTemplateDraftForPage(
  preferredDraftId?: string,
  options?: { forceNew?: boolean },
): Promise<WorkspaceTemplateLoadResult | null> {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return null;

  let templateId: string | null = null;

  if (!options?.forceNew && preferredDraftId) {
    const allowed = await assertWorkspaceTemplateDraft(
      supabase,
      preferredDraftId,
      workspaceOwnerId,
      user.id,
    );
    if (allowed.ok) templateId = preferredDraftId;
  }

  if (!options?.forceNew && !templateId) {
    const { data: existing } = await supabase
      .from("checklist_workspace_templates")
      .select("id")
      .eq("owner_user_id", workspaceOwnerId)
      .eq("created_by_user_id", user.id)
      .is("published_at", null)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) templateId = String(existing.id);
  }

  if (!templateId) {
    const created = await createEmptyWorkspaceTemplateDraft(
      supabase,
      workspaceOwnerId,
      user.id,
    );
    if (!created.ok) return null;
    templateId = created.id;
  }

  return loadWorkspaceTemplateForEditWithClient(supabase, workspaceOwnerId, templateId);
}

/** Autosave do rascunho durante a criação (validação relaxada). */
export async function saveWorkspaceTemplateDraftAction(
  templateId: string,
  input: WorkspaceTemplateInput,
): Promise<WorkspaceDraftSaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const allowed = await assertWorkspaceTemplateDraft(
    supabase,
    templateId,
    workspaceOwnerId,
    user.id,
  );
  if (!allowed.ok) return allowed;

  const normalized = normalizeDraftTemplateInput(input);
  const persisted = await persistWorkspaceTemplateStructure(
    supabase,
    templateId,
    workspaceOwnerId,
    normalized,
    { isDraft: true, bumpVersionIfUsed: false },
  );
  if (!persisted.ok) return persisted;

  await logApplicationActivityAction({
    eventType: "checklist_workspace_draft_autosaved",
    entityType: "checklist_workspace_templates",
    entityId: templateId,
    metadata: {
      name: normalized.name,
      section_count: normalized.sections.length,
      item_count: normalized.sections.reduce(
        (acc, sec) => acc + sec.items.length,
        0,
      ),
    },
  });

  return { ok: true, id: templateId, sections: persisted.sections };
}

/** Publica um rascunho como modelo definitivo da equipe. */
export async function publishWorkspaceTemplateAction(
  templateId: string,
  input: WorkspaceTemplateInput,
): Promise<WorkspaceActionResult> {
  const sanitized = sanitizeInput(input);
  if (!sanitized.ok) return sanitized;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const allowed = await assertWorkspaceTemplateDraft(
    supabase,
    templateId,
    workspaceOwnerId,
    user.id,
  );
  if (!allowed.ok) return allowed;

  const persisted = await persistWorkspaceTemplateStructure(
    supabase,
    templateId,
    workspaceOwnerId,
    sanitized,
    { isDraft: true, bumpVersionIfUsed: false },
  );
  if (!persisted.ok) return persisted;

  const { error: publishErr } = await supabase
    .from("checklist_workspace_templates")
    .update({ published_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("owner_user_id", workspaceOwnerId)
    .is("published_at", null);

  if (publishErr) {
    return { ok: false, error: "Não foi possível publicar o modelo." };
  }

  await logApplicationActivityAction({
    eventType: "checklist_workspace_draft_published",
    entityType: "checklist_workspace_templates",
    entityId: templateId,
    metadata: { name: sanitized.name },
  });

  revalidatePath("/checklists");
  revalidatePath("/checklists/equipe");
  revalidatePath("/checklists/novo");
  invalidateWorkspaceCatalogCache(workspaceOwnerId);

  return { ok: true, id: templateId };
}

export async function discardWorkspaceTemplateDraftAction(
  templateId: string,
): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const allowed = await assertWorkspaceTemplateDraft(
    supabase,
    templateId,
    workspaceOwnerId,
    user.id,
  );
  if (!allowed.ok) return allowed;

  const { error } = await supabase
    .from("checklist_workspace_templates")
    .delete()
    .eq("id", templateId)
    .eq("owner_user_id", workspaceOwnerId)
    .is("published_at", null);

  if (error) {
    return { ok: false, error: "Não foi possível descartar o rascunho." };
  }

  await logApplicationActivityAction({
    eventType: "checklist_workspace_draft_discarded",
    entityType: "checklist_workspace_templates",
    entityId: templateId,
  });

  revalidatePath("/checklists/equipe");
  revalidatePath("/checklists/novo");
  invalidateWorkspaceCatalogCache(workspaceOwnerId);

  return { ok: true, id: templateId };
}

export async function createWorkspaceTemplateAction(
  input: WorkspaceTemplateInput,
): Promise<WorkspaceActionResult> {
  const sanitized = sanitizeInput(input);
  if (!sanitized.ok) return sanitized;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: tpl, error: tErr } = await supabase
    .from("checklist_workspace_templates")
    .insert({
      owner_user_id: workspaceOwnerId,
      created_by_user_id: user.id,
      name: sanitized.name,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (tErr || !tpl) {
    return { ok: false, error: "Não foi possível criar o modelo." };
  }

  const templateId = String(tpl.id);

  for (let secIdx = 0; secIdx < sanitized.sections.length; secIdx++) {
    const sec = sanitized.sections[secIdx];
    const { data: secRow, error: sErr } = await supabase
      .from("checklist_workspace_sections")
      .insert({
        workspace_template_id: templateId,
        title: sec.title,
        position: secIdx,
      })
      .select("id")
      .single();

    if (sErr || !secRow) {
      await supabase.from("checklist_workspace_templates").delete().eq("id", templateId);
      return { ok: false, error: "Não foi possível salvar as seções." };
    }

    const itemRows = sec.items.map((it, idx) => ({
      workspace_section_id: secRow.id as string,
      description: it.description,
      is_required: it.is_required,
      position: idx,
    }));

    if (itemRows.length > 0) {
      const { error: iErr } = await supabase
        .from("checklist_workspace_items")
        .insert(itemRows);
      if (iErr) {
        await supabase
          .from("checklist_workspace_templates")
          .delete()
          .eq("id", templateId);
        return { ok: false, error: "Não foi possível salvar os itens." };
      }
    }
  }

  revalidatePath("/checklists");
  revalidatePath("/checklists/equipe");
  invalidateWorkspaceCatalogCache(workspaceOwnerId);

  return { ok: true, id: templateId };
}

export async function updateWorkspaceTemplateAction(
  templateId: string,
  input: WorkspaceTemplateInput,
): Promise<WorkspaceActionResult> {
  const sanitized = sanitizeInput(input);
  if (!sanitized.ok) return sanitized;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: existing } = await supabase
    .from("checklist_workspace_templates")
    .select("id, owner_user_id, archived_at")
    .eq("id", templateId)
    .maybeSingle();

  if (!existing || existing.owner_user_id !== workspaceOwnerId) {
    return { ok: false, error: "Modelo não encontrado." };
  }
  if (existing.archived_at) {
    return { ok: false, error: "Modelo arquivado não pode ser editado." };
  }

  const persisted = await persistWorkspaceTemplateStructure(
    supabase,
    templateId,
    workspaceOwnerId,
    sanitized,
    { isDraft: false, bumpVersionIfUsed: true },
  );
  if (!persisted.ok) return persisted;

  revalidatePath("/checklists");
  revalidatePath("/checklists/equipe");
  revalidatePath(`/checklists/equipe/${templateId}/editar`);
  invalidateWorkspaceCatalogCache(workspaceOwnerId);

  return { ok: true, id: templateId };
}

export async function archiveWorkspaceTemplateAction(
  templateId: string,
): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: existing } = await supabase
    .from("checklist_workspace_templates")
    .select("id, owner_user_id")
    .eq("id", templateId)
    .maybeSingle();

  if (!existing || existing.owner_user_id !== workspaceOwnerId) {
    return { ok: false, error: "Modelo não encontrado." };
  }

  const { error } = await supabase
    .from("checklist_workspace_templates")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("owner_user_id", workspaceOwnerId);

  if (error) return { ok: false, error: "Não foi possível arquivar o modelo." };

  revalidatePath("/checklists");
  revalidatePath("/checklists/equipe");
  invalidateWorkspaceCatalogCache(workspaceOwnerId);

  return { ok: true, id: templateId };
}

export async function unarchiveWorkspaceTemplateAction(
  templateId: string,
): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: existing } = await supabase
    .from("checklist_workspace_templates")
    .select("id, owner_user_id, archived_at")
    .eq("id", templateId)
    .maybeSingle();

  if (!existing || existing.owner_user_id !== workspaceOwnerId) {
    return { ok: false, error: "Modelo não encontrado." };
  }
  if (!existing.archived_at) {
    return { ok: false, error: "Este modelo já está ativo." };
  }

  const { error } = await supabase
    .from("checklist_workspace_templates")
    .update({ archived_at: null })
    .eq("id", templateId)
    .eq("owner_user_id", workspaceOwnerId);

  if (error) return { ok: false, error: "Não foi possível reativar o modelo." };

  revalidatePath("/checklists");
  revalidatePath("/checklists/equipe");
  invalidateWorkspaceCatalogCache(workspaceOwnerId);

  return { ok: true, id: templateId };
}

/* ─── Início de preenchimento ─────────────────────────────────────────── */

export async function startWorkspaceTemplateFill(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const workspaceTemplateId = String(
    formData.get("workspace_template_id") ?? "",
  ).trim();
  const establishmentId = String(formData.get("establishment_id") ?? "").trim();
  const areaIdRaw = String(formData.get("area_id") ?? "").trim();

  if (!workspaceTemplateId || !establishmentId) {
    redirect("/checklists?err=missing");
  }

  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", establishmentId)
    .maybeSingle();
  if (!est) redirect("/checklists?err=forbidden");
  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", est!.client_id as string)
    .maybeSingle();
  if (!cl || cl.owner_user_id !== workspaceOwnerId) {
    redirect("/checklists?err=forbidden");
  }

  const { data: tpl } = await supabase
    .from("checklist_workspace_templates")
    .select("id, owner_user_id, archived_at, published_at")
    .eq("id", workspaceTemplateId)
    .maybeSingle();
  if (
    !tpl ||
    tpl.owner_user_id !== workspaceOwnerId ||
    tpl.archived_at !== null ||
    tpl.published_at === null
  ) {
    redirect("/checklists?err=template");
  }

  let resolvedAreaId: string | null = null;
  if (areaIdRaw) {
    const { data: area } = await supabase
      .from("establishment_areas")
      .select("id")
      .eq("id", areaIdRaw)
      .eq("establishment_id", establishmentId)
      .eq("owner_user_id", workspaceOwnerId)
      .maybeSingle();
    if (area) resolvedAreaId = area.id;
  }

  const { data: session, error } = await supabase
    .from("checklist_fill_sessions")
    .insert({
      user_id: user.id,
      establishment_id: establishmentId,
      template_id: null,
      custom_template_id: null,
      workspace_template_id: workspaceTemplateId,
      area_id: resolvedAreaId,
    })
    .select("id")
    .single();

  if (error || !session) redirect("/checklists?err=session");

  redirect(`/checklists/preencher/${session.id}`);
}

export type StartWorkspaceFillBatchResult =
  | { ok: true; sessionIds: string[]; firstSessionId: string; totalSessions: number }
  | { ok: false; error: string };

export async function startWorkspaceTemplateFillBatch(input: {
  workspaceTemplateId: string;
  establishmentId: string;
  areaIds: string[];
}): Promise<StartWorkspaceFillBatchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const { workspaceTemplateId, establishmentId, areaIds } = input;

  if (!workspaceTemplateId || !establishmentId) {
    return { ok: false, error: "missing_fields" };
  }

  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", establishmentId)
    .maybeSingle();
  if (!est) return { ok: false, error: "forbidden" };
  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", est.client_id as string)
    .maybeSingle();
  if (!cl || cl.owner_user_id !== workspaceOwnerId) {
    return { ok: false, error: "forbidden" };
  }

  const { data: tpl } = await supabase
    .from("checklist_workspace_templates")
    .select("id, owner_user_id, archived_at, published_at")
    .eq("id", workspaceTemplateId)
    .maybeSingle();
  if (
    !tpl ||
    tpl.owner_user_id !== workspaceOwnerId ||
    tpl.archived_at !== null ||
    tpl.published_at === null
  ) {
    return { ok: false, error: "template_not_found" };
  }

  const resolvedAreas: (string | null)[] = areaIds.length > 0 ? areaIds : [null];

  for (const areaId of resolvedAreas) {
    if (areaId) {
      const { data: area } = await supabase
        .from("establishment_areas")
        .select("id")
        .eq("id", areaId)
        .eq("establishment_id", establishmentId)
        .maybeSingle();
      if (!area) return { ok: false, error: `area_not_found:${areaId}` };
    }
  }

  const sessionIds: string[] = [];
  const templateBundle = await loadWorkspaceTemplateBundle(workspaceTemplateId);

  for (const areaId of resolvedAreas) {
    const { data: session, error } = await supabase
      .from("checklist_fill_sessions")
      .insert({
        user_id: user.id,
        establishment_id: establishmentId,
        template_id: null,
        custom_template_id: null,
        workspace_template_id: workspaceTemplateId,
        area_id: areaId,
      })
      .select("*")
      .single();
    if (error || !session) return { ok: false, error: "session_create_failed" };
    if (templateBundle) {
      await seedInheritedValidResponsesForSession(
        supabase,
        session as ChecklistFillSessionRow,
        templateBundle,
        user.id,
      );
    }
    sessionIds.push(session.id);
  }

  const first = sessionIds[0];
  if (!first) return { ok: false, error: "session_create_failed" };
  return {
    ok: true,
    sessionIds,
    firstSessionId: first,
    totalSessions: sessionIds.length,
  };
}

/* ─── Base template para criação ──────────────────────────────────────── */

/**
 * Carrega todos os templates disponíveis como base para criação de novo
 * checklist da equipe: catálogo oficial + modelos da própria equipe.
 */
export async function loadBaseTemplateCandidates(): Promise<
  BaseCandidateTemplate[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const [officialResult, workspaceResult] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("id, name, portaria_ref, uf")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("checklist_workspace_templates")
      .select("id, name, created_by_user_id")
      .eq("owner_user_id", workspaceOwnerId)
      .is("archived_at", null)
      .not("published_at", "is", null)
      .order("name"),
  ]);

  const candidates: BaseCandidateTemplate[] = [];

  for (const t of officialResult.data ?? []) {
    const ref = t.portaria_ref ? String(t.portaria_ref) : "";
    const uf =
      t.uf && t.uf !== "*" ? ` · ${String(t.uf)}` : "";
    candidates.push({
      id: String(t.id),
      name: String(t.name),
      type: "official",
      subtitle: ref + uf || "Catálogo oficial",
    });
  }

  // Busca nomes dos criadores dos modelos da equipe
  const userIds = [
    ...new Set(
      (workspaceResult.data ?? []).map((t) =>
        String(t.created_by_user_id),
      ),
    ),
  ];
  const profileNames = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);
    for (const p of profiles ?? []) {
      const name = String(p.full_name ?? "").trim();
      if (name.length > 0) profileNames.set(String(p.user_id), name);
    }
  }

  for (const t of workspaceResult.data ?? []) {
    const creator = profileNames.get(String(t.created_by_user_id));
    candidates.push({
      id: String(t.id),
      name: String(t.name),
      type: "workspace",
      subtitle: creator ? `Equipe · ${creator}` : "Modelo da equipe",
    });
  }

  return candidates;
}

/**
 * Retorna as seções de um template (oficial ou da equipe) formatadas para
 * uso como ponto de partida no WorkspaceChecklistBuilder.
 */
export async function fetchBaseTemplateSectionsAction(
  templateId: string,
  type: "official" | "workspace",
): Promise<WorkspaceEditSection[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (type === "official") {
    const bundle = await loadChecklistTemplateBundleById(templateId);
    if (!bundle) return null;
    return bundle.sections
      .map((sec) => ({
        title: sec.title,
        items: sec.items
          .filter((it) => !(it as { is_structure_only?: boolean }).is_structure_only)
          .map((it) => ({
            description: it.description,
            is_required: it.is_required,
          })),
      }))
      .filter((sec) => sec.items.length > 0);
  }

  // workspace
  const template = await loadWorkspaceTemplateForEdit(templateId);
  if (!template) return null;
  return template.sections.map((sec) => ({
    title: sec.title,
    items: sec.items.map((it) => ({
      description: it.description,
      is_required: it.is_required,
    })),
  }));
}
