"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadChecklistTemplateBundleById } from "@/lib/actions/checklists";
import { parseAppliesTo } from "@/lib/checklists/parse-applies-to";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

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

/** Dados para o editor (inclui flag de item extra). */
export async function loadCustomTemplateEditData(
  customTemplateId: string,
): Promise<{ name: string; sections: CustomEditSection[] } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ct, error: cErr } = await supabase
    .from("checklist_custom_templates")
    .select("id, name")
    .eq("id", customTemplateId)
    .maybeSingle();

  if (cErr || !ct) return null;

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
  };
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
    is_active: true,
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
    .select("id, name, establishment_id, source_template_id, updated_at")
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
        title: sec.title,
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
      description: it.description,
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
  const title = String(formData.get("title") ?? "").trim();
  if (!customTemplateId || !title) return;

  const { data: ct } = await supabase
    .from("checklist_custom_templates")
    .select("id")
    .eq("id", customTemplateId)
    .maybeSingle();

  if (!ct) return;

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

export async function addCustomItemAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const customSectionId = String(formData.get("custom_section_id") ?? "").trim();
  const customTemplateId = String(formData.get("custom_template_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isRequired = String(formData.get("is_required") ?? "") === "on";
  const pesoRaw = parseFloat(String(formData.get("peso") ?? "1"));
  const peso = isFinite(pesoRaw) && pesoRaw > 0 ? pesoRaw : 1;

  if (!customSectionId || !customTemplateId || !description) return;

  const { data: ct } = await supabase
    .from("checklist_custom_templates")
    .select("id")
    .eq("id", customTemplateId)
    .maybeSingle();

  if (!ct) return;

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
