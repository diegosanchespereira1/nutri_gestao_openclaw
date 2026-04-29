"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

export type WorkspaceTemplateListRow = {
  id: string;
  name: string;
  created_by_user_id: string;
  created_by_name: string | null;
  total_item_count: number;
  required_item_count: number;
  updated_at: string;
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
  archived_at: string | null;
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

/* ─── Carregamento ─────────────────────────────────────────────────────── */

/** Lista todos os modelos do workspace (não arquivados). */
export async function loadWorkspaceTemplatesForCatalog(): Promise<{
  rows: WorkspaceTemplateListRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: templates, error } = await supabase
    .from("checklist_workspace_templates")
    .select("id, name, created_by_user_id, updated_at")
    .eq("owner_user_id", workspaceOwnerId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error || !templates || templates.length === 0) return { rows: [] };

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
      .in("workspace_section_id", sectionIds);

    for (const item of itemRows ?? []) {
      const tid = sectionToTemplate.get(String(item.workspace_section_id));
      if (!tid) continue;
      const cur = counts.get(tid) ?? { total: 0, required: 0 };
      cur.total += 1;
      if (item.is_required) cur.required += 1;
      counts.set(tid, cur);
    }
  }

  const userIds = [...new Set(templates.map((t) => String(t.created_by_user_id)))];
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

  return {
    rows: templates.map((t) => ({
      id: String(t.id),
      name: String(t.name),
      created_by_user_id: String(t.created_by_user_id),
      created_by_name: profileNames.get(String(t.created_by_user_id)) ?? null,
      total_item_count: counts.get(String(t.id))?.total ?? 0,
      required_item_count: counts.get(String(t.id))?.required ?? 0,
      updated_at: String(t.updated_at),
    })),
  };
}

/** Estrutura para o builder de edição. */
export async function loadWorkspaceTemplateForEdit(
  id: string,
): Promise<WorkspaceTemplateLoadResult | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: template } = await supabase
    .from("checklist_workspace_templates")
    .select("id, name, archived_at, owner_user_id")
    .eq("id", id)
    .maybeSingle();

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
    archived_at: template.archived_at as string | null,
    sections: (sections ?? []).map((sec) => ({
      id: String(sec.id),
      title: String(sec.title),
      position: Number(sec.position),
      items: itemsBySection.get(String(sec.id)) ?? [],
    })),
  };
}

/** Carrega no formato unificado para reusar o wizard de preenchimento. */
export async function loadWorkspaceTemplateBundle(
  id: string,
): Promise<ChecklistTemplateWithSections | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Sem filtrar por archived_at: sessões antigas devem continuar abrindo o dossiê
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
  const { data: items } =
    sectionIds.length > 0
      ? await supabase
          .from("checklist_workspace_items")
          .select("*")
          .in("workspace_section_id", sectionIds)
          .order("position", { ascending: true })
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
    const secItems = itemsBySection.get(String(sec.id)) ?? [];
    const mappedItems = secItems.map((it) => {
      total_item_count += 1;
      if (Boolean(it.is_required)) required_item_count += 1;
      return {
        id: String(it.id),
        section_id: String(sec.id),
        description: String(it.description),
        is_required: Boolean(it.is_required),
        position: Number(it.position),
        peso: it.peso !== null && it.peso !== undefined ? Number(it.peso) : 1,
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
    version: 1,
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
    const title = (sec.title ?? "").trim();
    if (title.length === 0) {
      return { ok: false, error: "Cada seção precisa de um título." };
    }
    const items: WorkspaceEditItem[] = [];
    for (const it of sec.items ?? []) {
      const desc = (it.description ?? "").trim();
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

  const { error: nameErr } = await supabase
    .from("checklist_workspace_templates")
    .update({ name: sanitized.name })
    .eq("id", templateId);
  if (nameErr) return { ok: false, error: "Não foi possível salvar o nome." };

  // Estratégia: apaga seções/itens existentes e recria. Como sessões antigas
  // continuam referenciando os IDs (cascade no delete só impacta itens não
  // preservados), preservamos só itens com o mesmo `id` (caso o front envie).
  // Para simplicidade e segurança, removemos tudo e criamos do zero — sessões
  // existentes ainda funcionam porque elas referenciam respostas com FK ON
  // DELETE CASCADE e o template antigo é preservado por ON DELETE RESTRICT.
  // Para evitar invalidar sessões em curso, validamos primeiro.
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

  // Apaga seções existentes (cascade nos itens). Itens em respostas aprovadas
  // serão preservados pelo ON DELETE CASCADE → impede a exclusão se houver
  // resposta. Para garantir que o histórico não quebre, criamos um snapshot:
  // apagamos só as seções/itens ainda não usados em respostas.
  const { data: oldSections } = await supabase
    .from("checklist_workspace_sections")
    .select("id")
    .eq("workspace_template_id", templateId);

  const oldSectionIds = (oldSections ?? []).map((s) => String(s.id));
  if (oldSectionIds.length > 0) {
    const { data: oldItems } = await supabase
      .from("checklist_workspace_items")
      .select("id")
      .in("workspace_section_id", oldSectionIds);
    const oldItemIds = (oldItems ?? []).map((i) => String(i.id));

    if (oldItemIds.length > 0) {
      const { data: usedRefs } = await supabase
        .from("checklist_fill_item_responses")
        .select("workspace_item_id")
        .in("workspace_item_id", oldItemIds);
      const usedItemIds = new Set(
        (usedRefs ?? [])
          .map((r) => r.workspace_item_id as string | null)
          .filter((id): id is string => Boolean(id)),
      );

      const safeToDelete = oldItemIds.filter((id) => !usedItemIds.has(id));
      if (safeToDelete.length > 0) {
        await supabase
          .from("checklist_workspace_items")
          .delete()
          .in("id", safeToDelete);
      }
      if (usedItemIds.size > 0) {
        // Há itens com respostas — mantém-los (e suas seções) para não quebrar
        // o histórico. A edição prossegue só com itens novos.
      }
    }

    // Remove seções vazias após a limpeza
    const { data: emptySections } = await supabase
      .from("checklist_workspace_sections")
      .select("id")
      .eq("workspace_template_id", templateId);
    for (const sec of emptySections ?? []) {
      const { count: itemCount } = await supabase
        .from("checklist_workspace_items")
        .select("id", { count: "exact", head: true })
        .eq("workspace_section_id", sec.id as string);
      if ((itemCount ?? 0) === 0) {
        await supabase
          .from("checklist_workspace_sections")
          .delete()
          .eq("id", sec.id as string);
      }
    }
  }

  // Cria as novas seções/itens. Posições começam após as preservadas.
  const { count: existingSecCount } = await supabase
    .from("checklist_workspace_sections")
    .select("id", { count: "exact", head: true })
    .eq("workspace_template_id", templateId);

  let nextSectionPos = existingSecCount ?? 0;
  for (const sec of sanitized.sections) {
    const { data: secRow, error: sErr } = await supabase
      .from("checklist_workspace_sections")
      .insert({
        workspace_template_id: templateId,
        title: sec.title,
        position: nextSectionPos++,
      })
      .select("id")
      .single();

    if (sErr || !secRow) {
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
      if (iErr) return { ok: false, error: "Não foi possível salvar os itens." };
    }
  }

  revalidatePath("/checklists");
  revalidatePath("/checklists/equipe");
  revalidatePath(`/checklists/equipe/${templateId}/editar`);

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
    .select("id, owner_user_id, archived_at")
    .eq("id", workspaceTemplateId)
    .maybeSingle();
  if (
    !tpl ||
    tpl.owner_user_id !== workspaceOwnerId ||
    tpl.archived_at !== null
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
    .select("id, owner_user_id, archived_at")
    .eq("id", workspaceTemplateId)
    .maybeSingle();
  if (
    !tpl ||
    tpl.owner_user_id !== workspaceOwnerId ||
    tpl.archived_at !== null
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
      .select("id")
      .single();
    if (error || !session) return { ok: false, error: "session_create_failed" };
    sessionIds.push(session.id);
  }

  revalidatePath("/checklists");
  const first = sessionIds[0];
  if (!first) return { ok: false, error: "session_create_failed" };
  return {
    ok: true,
    sessionIds,
    firstSessionId: first,
    totalSessions: sessionIds.length,
  };
}
