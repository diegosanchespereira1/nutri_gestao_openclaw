"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadChecklistTemplateBundleById } from "@/lib/actions/checklists";
import { normalizeChecklistText } from "@/lib/checklists/capitalize-checklist-text";
import { parseAppliesTo } from "@/lib/checklists/parse-applies-to";
import { sortChecklistItemsByPosition } from "@/lib/checklists/sort-checklist-items";
import { canAccessAdminArea } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type {
  ChecklistTemplateSectionWithItems,
  ChecklistTemplateWithSections,
} from "@/lib/types/checklists";

export type CustomEditItem = {
  id: string;
  description: string;
  is_required: boolean;
  position: number;
  is_user_extra: boolean;
  /** Peso do item para cálculo de pontuação. Padrão 1. */
  peso: number;
};

export type CustomEditSection = {
  id: string;
  title: string;
  position: number;
  items: CustomEditItem[];
};

export type CustomTemplateListRow = {
  id: string;
  name: string;
  establishment_id: string;
  source_template_id: string;
  updated_at: string;
  establishment_label: string;
  created_by_user_id: string;
  created_by_name: string | null;
  /** true quando já existe ao menos 1 sessão de preenchimento usando este modelo. */
  has_been_used: boolean;
  /** Modelo arquivado (soft-delete) — visível para reativação. */
  is_archived: boolean;
};

async function assertEstablishmentOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  establishmentId: string,
): Promise<boolean> {
  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", establishmentId)
    .maybeSingle();
  if (!est) return false;
  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", est.client_id)
    .maybeSingle();
  return Boolean(cl && cl.owner_user_id === workspaceOwnerId);
}

/**
 * Verifica se o usuário (ou seu workspace) tem acesso ao template personalizado
 * via propriedade do estabelecimento associado.
 */
async function canDeleteCustomChecklistsForUser(args: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  authUserId: string;
  workspaceOwnerId: string;
}): Promise<boolean> {
  const { supabase, authUserId, workspaceOwnerId } = args;
  if (workspaceOwnerId === authUserId) return true;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", authUserId)
    .maybeSingle();

  return canAccessAdminArea(profile?.role ?? null);
}

export async function canCurrentUserDeleteCustomChecklists(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  return canDeleteCustomChecklistsForUser({
    supabase,
    authUserId: user.id,
    workspaceOwnerId,
  });
}

async function assertCustomTemplateWorkspaceAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customTemplateId: string,
  userId: string,
): Promise<boolean> {
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, userId);
  const { data: ct } = await supabase
    .from("checklist_custom_templates")
    .select("id, establishment_id")
    .eq("id", customTemplateId)
    .maybeSingle();
  if (!ct) return false;
  return assertEstablishmentOwned(
    supabase,
    workspaceOwnerId,
    ct.establishment_id as string,
  );
}

/** Dados para o editor (inclui flag de item extra e nome do criador). */
export async function loadCustomTemplateEditData(
  customTemplateId: string,
): Promise<{
  name: string;
  sections: CustomEditSection[];
  created_by_name: string | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: ct, error: cErr } = await supabase
    .from("checklist_custom_templates")
    .select("id, name, user_id, establishment_id, archived_at")
    .eq("id", customTemplateId)
    .maybeSingle();

  if (cErr || !ct || ct.archived_at) return null;

  // Verifica acesso via propriedade do estabelecimento (workspace-level)
  const owned = await assertEstablishmentOwned(
    supabase,
    workspaceOwnerId,
    ct.establishment_id as string,
  );
  if (!owned) return null;

  // Busca nome do criador
  let created_by_name: string | null = null;
  if (ct.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", ct.user_id as string)
      .maybeSingle();
    const n = String(profile?.full_name ?? "").trim();
    if (n.length > 0) created_by_name = n;
  }

  const { data: sections } = await supabase
    .from("checklist_custom_sections")
    .select("*")
    .eq("custom_template_id", customTemplateId)
    .order("position", { ascending: true });

  const sectionIds = (sections ?? []).map((s) => String(s.id));
  const { data: items } =
    sectionIds.length > 0
      ? await supabase
          .from("checklist_custom_items")
          .select("*")
          .in("custom_section_id", sectionIds)
          .order("position", { ascending: true })
      : { data: [] as Record<string, unknown>[] };

  const itemsBySection = new Map<string, CustomEditItem[]>();
  for (const it of items ?? []) {
    const sid = String(it.custom_section_id);
    const list = itemsBySection.get(sid) ?? [];
    list.push({
      id: String(it.id),
      description: String(it.description),
      is_required: Boolean(it.is_required),
      position: Number(it.position),
      is_user_extra: Boolean(it.is_user_extra),
      peso: it.peso !== null && it.peso !== undefined ? Number(it.peso) : 1,
    });
    itemsBySection.set(sid, list);
  }

  const mappedSections: CustomEditSection[] = (sections ?? []).map((sec) => ({
    id: String(sec.id),
    title: String(sec.title),
    position: Number(sec.position),
    items: itemsBySection.get(String(sec.id)) ?? [],
  }));

  return {
    name: String(ct.name),
    sections: mappedSections,
    created_by_name,
  };
}

/** Renomeia um template personalizado (qualquer membro do workspace pode fazê-lo). */
export async function renameCustomTemplateAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const customTemplateId = String(
    formData.get("custom_template_id") ?? "",
  ).trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!customTemplateId) return { ok: false, error: "Modelo não encontrado." };
  if (!name) return { ok: false, error: "O nome não pode estar vazio." };
  if (name.length > 200)
    return {
      ok: false,
      error: "O nome deve ter no máximo 200 caracteres.",
    };

  const ok = await assertCustomTemplateWorkspaceAccess(
    supabase,
    customTemplateId,
    user.id,
  );
  if (!ok) return { ok: false, error: "Sem permissão para editar este modelo." };

  const { error } = await supabase
    .from("checklist_custom_templates")
    .update({ name })
    .eq("id", customTemplateId);

  if (error) return { ok: false, error: "Não foi possível salvar o nome." };

  revalidatePath(`/checklists/personalizados/${customTemplateId}/editar`);
  revalidatePath("/checklists/personalizados");
  return { ok: true };
}

/** Seções e itens de um modelo personalizado — para expandir o cartão no catálogo. */
export async function loadCustomTemplatePreviewAction(
  customTemplateId: string,
): Promise<ChecklistTemplateSectionWithItems[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const id = customTemplateId.trim();
  if (!id) return null;

  const ok = await assertCustomTemplateWorkspaceAccess(supabase, id, user.id);
  if (!ok) return null;

  const bundle = await loadCustomTemplateUnified(id);
  return bundle?.sections ?? null;
}

/** Constrói o mesmo formato do catálogo global para reutilizar o wizard de preenchimento. */
export async function loadCustomTemplateUnified(
  customTemplateId: string,
): Promise<ChecklistTemplateWithSections | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ct, error: cErr } = await supabase
    .from("checklist_custom_templates")
    .select("*")
    .eq("id", customTemplateId)
    .maybeSingle();

  if (cErr || !ct) return null;

  const { data: src } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("id", ct.source_template_id)
    .maybeSingle();

  if (!src) return null;

  const { data: sections } = await supabase
    .from("checklist_custom_sections")
    .select("*")
    .eq("custom_template_id", customTemplateId)
    .order("position", { ascending: true });

  const sectionIds = (sections ?? []).map((s) => String(s.id));
  const { data: items } =
    sectionIds.length > 0
      ? await supabase
          .from("checklist_custom_items")
          .select("*")
          .in("custom_section_id", sectionIds)
          .order("position", { ascending: true })
      : { data: [] as Record<string, unknown>[] };

  const itemsBySection = new Map<string, typeof items>();
  for (const it of items ?? []) {
    const sid = String(it.custom_section_id);
    const list = itemsBySection.get(sid) ?? [];
    list.push(it);
    itemsBySection.set(sid, list);
  }

  let required_item_count = 0;
  let total_item_count = 0;
  const mappedSections = (sections ?? []).map((sec) => {
    const secItems = sortChecklistItemsByPosition(
      (itemsBySection.get(String(sec.id)) ?? []).map((it) => ({
        ...it,
        id: String(it.id),
        position: Number(it.position),
      })),
    );
    const mappedItems = secItems.map((it) => {
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
      template_id: String(ct.id),
      title: String(sec.title),
      position: Number(sec.position),
      created_at: String(sec.created_at),
      items: mappedItems,
    };
  });

  return {
    id: String(ct.id),
    name: String(ct.name),
    portaria_ref: String(src.portaria_ref),
    uf: String(src.uf),
    applies_to: parseAppliesTo(src.applies_to),
    description: `Modelo personalizado (base: ${String(src.name)}).`,
    version: 1,
    is_active: ct.archived_at === null,
    created_at: String(ct.created_at),
    updated_at: String(ct.updated_at),
    sections: mappedSections,
    required_item_count,
    total_item_count,
  };
}

export async function listCustomTemplatesForOwner(): Promise<{
  rows: CustomTemplateListRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data: customs, error } = await supabase
    .from("checklist_custom_templates")
    .select(
      "id, name, establishment_id, source_template_id, updated_at, user_id, archived_at",
    )
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false });

  if (error || !customs) return { rows: [] };
  if (customs.length === 0) return { rows: [] };

  const estIds = [...new Set(customs.map((c) => c.establishment_id as string))];
  const { data: estRows } = await supabase
    .from("establishments")
    .select("id, name, clients(legal_name, trade_name, lifecycle_status)")
    .in("id", estIds);

  const estMap = new Map<string, string>();
  for (const raw of estRows ?? []) {
    const e = raw as {
      id: string;
      name: string;
      clients:
        | {
            legal_name: string;
            trade_name: string | null;
            lifecycle_status: string;
          }
        | {
            legal_name: string;
            trade_name: string | null;
            lifecycle_status: string;
          }[]
        | null;
    };
    const c = Array.isArray(e.clients) ? e.clients[0] : e.clients;
    if (!c) {
      estMap.set(e.id, e.name);
      continue;
    }
    const t = c.trade_name?.trim();
    const clientLabel = t && t.length > 0 ? t : c.legal_name;
    estMap.set(e.id, `${e.name} — ${clientLabel}`);
  }

  // Busca nomes dos criadores
  const userIds = [
    ...new Set(customs.map((c) => c.user_id as string).filter(Boolean)),
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

  // Verifica quais modelos já foram usados em ao menos 1 sessão de preenchimento.
  const customIds = customs.map((c) => c.id as string);
  const usedCustomIds = new Set<string>();
  for (const cid of customIds) {
    const { count } = await supabase
      .from("checklist_fill_sessions")
      .select("id", { count: "exact", head: true })
      .eq("custom_template_id", cid);
    if ((count ?? 0) > 0) usedCustomIds.add(cid);
  }

  return {
    rows: customs.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      establishment_id: r.establishment_id as string,
      source_template_id: r.source_template_id as string,
      updated_at: r.updated_at as string,
      establishment_label:
        estMap.get(r.establishment_id as string) ??
        (r.establishment_id as string),
      created_by_user_id: r.user_id as string,
      created_by_name: profileNames.get(r.user_id as string) ?? null,
      has_been_used: usedCustomIds.has(r.id as string),
      is_archived: r.archived_at !== null,
    })),
  };
}

export async function duplicateGlobalTemplateAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const templateId = String(formData.get("template_id") ?? "").trim();
  const establishmentId = String(formData.get("establishment_id") ?? "").trim();
  if (!templateId || !establishmentId) {
    redirect("/checklists?err=missing");
  }

  const ok = await assertEstablishmentOwned(supabase, workspaceOwnerId, establishmentId);
  if (!ok) redirect("/checklists?err=forbidden");

  const bundle = await loadChecklistTemplateBundleById(templateId);
  if (!bundle?.is_active) redirect("/checklists?err=template");

  const customName = `${bundle.name} (personalizado)`;

  const { data: inserted, error: insErr } = await supabase
    .from("checklist_custom_templates")
    .insert({
      user_id: user.id,
      establishment_id: establishmentId,
      source_template_id: templateId,
      name: customName,
    })
    .select("id")
    .single();

  if (insErr || !inserted) redirect("/checklists?err=duplicate");

  const customId = inserted.id as string;

  for (const sec of bundle.sections) {
    const { data: newSec, error: sErr } = await supabase
      .from("checklist_custom_sections")
      .insert({
        custom_template_id: customId,
        title: normalizeChecklistText(sec.title),
        position: sec.position,
      })
      .select("id")
      .single();

    if (sErr || !newSec) {
      await supabase.from("checklist_custom_templates").delete().eq("id", customId);
      redirect("/checklists?err=duplicate");
    }

    const newSecId = newSec.id as string;
    const itemRows = sec.items.map((it) => ({
      custom_section_id: newSecId,
      description: normalizeChecklistText(it.description),
      is_required: it.is_required,
      position: it.position,
      is_user_extra: false,
      peso: it.peso ?? 1,
    }));

    if (itemRows.length > 0) {
      const { error: iErr } = await supabase
        .from("checklist_custom_items")
        .insert(itemRows);
      if (iErr) {
        await supabase.from("checklist_custom_templates").delete().eq("id", customId);
        redirect("/checklists?err=duplicate");
      }
    }
  }

  revalidatePath("/checklists");
  revalidatePath("/checklists/personalizados");
  redirect(`/checklists/personalizados/${customId}/editar`);
}

export async function addCustomSectionAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const customTemplateId = String(formData.get("custom_template_id") ?? "").trim();
  const title = normalizeChecklistText(String(formData.get("title") ?? ""));
  if (!customTemplateId || !title) return;

  // Qualquer membro do workspace pode editar
  const ok = await assertCustomTemplateWorkspaceAccess(
    supabase,
    customTemplateId,
    user.id,
  );
  if (!ok) return;

  const { count } = await supabase
    .from("checklist_custom_sections")
    .select("*", { count: "exact", head: true })
    .eq("custom_template_id", customTemplateId);

  const position = count ?? 0;

  const { error } = await supabase.from("checklist_custom_sections").insert({
    custom_template_id: customTemplateId,
    title,
    position,
  });

  if (error) return;

  revalidatePath(`/checklists/personalizados/${customTemplateId}/editar`);
}

export async function deleteCustomItemAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const customItemId = String(formData.get("custom_item_id") ?? "").trim();
  const customTemplateId = String(formData.get("custom_template_id") ?? "").trim();
  if (!customItemId || !customTemplateId) return;

  // Qualquer membro do workspace pode editar (não apenas o criador original)
  const ok = await assertCustomTemplateWorkspaceAccess(
    supabase,
    customTemplateId,
    user.id,
  );
  if (!ok) return;

  // Verifica que o item pertence a uma seção desse template
  const { data: it } = await supabase
    .from("checklist_custom_items")
    .select("id, custom_section_id, checklist_custom_sections!inner(custom_template_id)")
    .eq("id", customItemId)
    .maybeSingle();

  const secRef = it?.checklist_custom_sections as unknown as
    | { custom_template_id: string }
    | null;
  if (!it || secRef?.custom_template_id !== customTemplateId) return;

  await supabase.from("checklist_custom_items").delete().eq("id", customItemId);

  revalidatePath(`/checklists/personalizados/${customTemplateId}/editar`);
}

export async function deleteCustomSectionAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const customSectionId = String(formData.get("custom_section_id") ?? "").trim();
  const customTemplateId = String(formData.get("custom_template_id") ?? "").trim();
  if (!customSectionId || !customTemplateId) return;

  // Qualquer membro do workspace pode editar (não apenas o criador original)
  const ok = await assertCustomTemplateWorkspaceAccess(
    supabase,
    customTemplateId,
    user.id,
  );
  if (!ok) return;

  // Verifica que a seção pertence ao template
  const { data: sec } = await supabase
    .from("checklist_custom_sections")
    .select("id")
    .eq("id", customSectionId)
    .eq("custom_template_id", customTemplateId)
    .maybeSingle();
  if (!sec) return;

  // Exclui todos os itens da seção primeiro
  await supabase
    .from("checklist_custom_items")
    .delete()
    .eq("custom_section_id", customSectionId);

  await supabase
    .from("checklist_custom_sections")
    .delete()
    .eq("id", customSectionId);

  revalidatePath(`/checklists/personalizados/${customTemplateId}/editar`);
}

export async function addCustomItemAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const customSectionId = String(formData.get("custom_section_id") ?? "").trim();
  const customTemplateId = String(formData.get("custom_template_id") ?? "").trim();
  const description = normalizeChecklistText(
    String(formData.get("description") ?? ""),
  );
  const isRequired = String(formData.get("is_required") ?? "") === "on";
  const pesoRaw = parseFloat(String(formData.get("peso") ?? "1"));
  const peso = isFinite(pesoRaw) && pesoRaw > 0 ? pesoRaw : 1;

  if (!customSectionId || !customTemplateId || !description) return;

  // Qualquer membro do workspace pode editar
  const ok = await assertCustomTemplateWorkspaceAccess(
    supabase,
    customTemplateId,
    user.id,
  );
  if (!ok) return;

  const { data: sec } = await supabase
    .from("checklist_custom_sections")
    .select("id, custom_template_id")
    .eq("id", customSectionId)
    .maybeSingle();

  if (!sec || sec.custom_template_id !== customTemplateId) return;

  const { count } = await supabase
    .from("checklist_custom_items")
    .select("*", { count: "exact", head: true })
    .eq("custom_section_id", customSectionId);

  const position = count ?? 0;

  const { error } = await supabase.from("checklist_custom_items").insert({
    custom_section_id: customSectionId,
    description,
    is_required: isRequired,
    position,
    is_user_extra: true,
    peso,
  });

  if (error) return;

  revalidatePath(`/checklists/personalizados/${customTemplateId}/editar`);
}

export async function deleteCustomTemplateAction(
  customTemplateId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const trimmedId = customTemplateId.trim();
  if (!trimmedId) return { ok: false, error: "Modelo não encontrado." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const allowed = await canDeleteCustomChecklistsForUser({
    supabase,
    authUserId: user.id,
    workspaceOwnerId,
  });
  if (!allowed) {
    return {
      ok: false,
      error:
        "Apenas o titular da conta ou administradores podem remover modelos personalizados.",
    };
  }

  const hasAccess = await assertCustomTemplateWorkspaceAccess(
    supabase,
    trimmedId,
    user.id,
  );
  if (!hasAccess) return { ok: false, error: "Modelo não encontrado." };

  const { count: sessionCount } = await supabase
    .from("checklist_fill_sessions")
    .select("id", { count: "exact", head: true })
    .eq("custom_template_id", trimmedId);

  if ((sessionCount ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Este modelo já foi usado em preenchimentos e não pode ser removido.",
    };
  }

  const { error } = await supabase
    .from("checklist_custom_templates")
    .delete()
    .eq("id", trimmedId);

  if (error) {
    return { ok: false, error: "Não foi possível remover o modelo." };
  }

  revalidatePath("/checklists");
  revalidatePath("/checklists/personalizados");
  revalidatePath(`/checklists/personalizados/${trimmedId}/editar`);

  return { ok: true };
}

export async function archiveCustomTemplateAction(
  customTemplateId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const trimmedId = customTemplateId.trim();
  if (!trimmedId) return { ok: false, error: "Modelo não encontrado." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const allowed = await canDeleteCustomChecklistsForUser({
    supabase,
    authUserId: user.id,
    workspaceOwnerId,
  });
  if (!allowed) {
    return {
      ok: false,
      error:
        "Apenas o titular da conta ou administradores podem arquivar modelos personalizados.",
    };
  }

  const hasAccess = await assertCustomTemplateWorkspaceAccess(
    supabase,
    trimmedId,
    user.id,
  );
  if (!hasAccess) return { ok: false, error: "Modelo não encontrado." };

  const { data: existing } = await supabase
    .from("checklist_custom_templates")
    .select("id, archived_at")
    .eq("id", trimmedId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Modelo não encontrado." };
  if (existing.archived_at) {
    return { ok: false, error: "Este modelo já está arquivado." };
  }

  const { error } = await supabase
    .from("checklist_custom_templates")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", trimmedId);

  if (error) {
    return { ok: false, error: "Não foi possível arquivar o modelo." };
  }

  revalidatePath("/checklists");
  revalidatePath("/checklists/personalizados");
  revalidatePath(`/checklists/personalizados/${trimmedId}/editar`);

  return { ok: true };
}

export async function unarchiveCustomTemplateAction(
  customTemplateId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const trimmedId = customTemplateId.trim();
  if (!trimmedId) return { ok: false, error: "Modelo não encontrado." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const allowed = await canDeleteCustomChecklistsForUser({
    supabase,
    authUserId: user.id,
    workspaceOwnerId,
  });
  if (!allowed) {
    return {
      ok: false,
      error:
        "Apenas o titular da conta ou administradores podem reativar modelos personalizados.",
    };
  }

  const hasAccess = await assertCustomTemplateWorkspaceAccess(
    supabase,
    trimmedId,
    user.id,
  );
  if (!hasAccess) return { ok: false, error: "Modelo não encontrado." };

  const { data: existing } = await supabase
    .from("checklist_custom_templates")
    .select("id, archived_at")
    .eq("id", trimmedId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Modelo não encontrado." };
  if (!existing.archived_at) {
    return { ok: false, error: "Este modelo já está ativo." };
  }

  const { error: updateErr } = await supabase
    .from("checklist_custom_templates")
    .update({ archived_at: null })
    .eq("id", trimmedId);

  if (updateErr) {
    return { ok: false, error: "Não foi possível reativar o modelo." };
  }

  revalidatePath("/checklists");
  revalidatePath("/checklists/personalizados");
  revalidatePath(`/checklists/personalizados/${trimmedId}/editar`);

  return { ok: true };
}
