"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";

function revalidateGlobalChecklistCatalog() {
  updateTag("checklist-catalog");
}
import { createClient } from "@/lib/supabase/server";
import { normalizeChecklistText } from "@/lib/checklists/capitalize-checklist-text";
import { parseAppliesTo } from "@/lib/checklists/parse-applies-to";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { EstablishmentType } from "@/lib/types/establishments";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const allowed = ["admin", "super_admin"];
  if (!profile || !allowed.includes(profile.role)) {
    redirect("/admin/checklists?err=sem_permissao");
  }
  return { supabase };
}

async function bumpVersionIfApplied(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  templateId: string,
): Promise<void> {
  const { count } = await supabase
    .from("checklist_fill_sessions")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  if (count && count > 0) {
    const { data: t } = await supabase
      .from("checklist_templates")
      .select("version")
      .eq("id", templateId)
      .maybeSingle();

    await supabase
      .from("checklist_templates")
      .update({ version: (t?.version ?? 1) + 1 })
      .eq("id", templateId);
  }
}

export async function loadTemplateForAdmin(templateId: string): Promise<{
  template: ChecklistTemplateWithSections | null;
  fillSessionCount: number;
}> {
  const { supabase } = await requireAdmin();

  const [{ data: t }, { count: fillCount }] = await Promise.all([
    supabase
      .from("checklist_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle(),
    supabase
      .from("checklist_fill_sessions")
      .select("id", { count: "exact", head: true })
      .eq("template_id", templateId),
  ]);

  if (!t) return { template: null, fillSessionCount: 0 };

  const { data: sectionsRaw } = await supabase
    .from("checklist_template_sections")
    .select("*")
    .eq("template_id", templateId)
    .order("position", { ascending: true });

  const sectionIds = (sectionsRaw ?? []).map((s: Record<string, unknown>) =>
    String(s.id),
  );

  const { data: itemsRaw } =
    sectionIds.length > 0
      ? await supabase
          .from("checklist_template_items")
          .select("*")
          .in("section_id", sectionIds)
          .order("position", { ascending: true })
      : { data: [] as Record<string, unknown>[] };

  const sections = (sectionsRaw ?? []).map((s: Record<string, unknown>) => {
    const items = (itemsRaw ?? [])
      .filter(
        (it: Record<string, unknown>) =>
          String(it.section_id) === String(s.id),
      )
      .map((it: Record<string, unknown>) => ({
        id: String(it.id),
        section_id: String(it.section_id),
        description: String(it.description),
        is_required: Boolean(it.is_required),
        position: Number(it.position),
        peso: it.peso != null ? Number(it.peso) : 1,
        is_structure_only: Boolean(it.is_structure_only),
        created_at: String(it.created_at),
      }));

    return {
      id: String(s.id),
      template_id: String(s.template_id),
      title: String(s.title),
      position: Number(s.position),
      created_at: String(s.created_at),
      items,
    };
  });

  const allItems = sections.flatMap((s) => s.items);
  const required_item_count = allItems.filter(
    (it) => !it.is_structure_only && it.is_required,
  ).length;
  const total_item_count = allItems.filter((it) => !it.is_structure_only).length;

  const raw = t as Record<string, unknown>;
  const template: ChecklistTemplateWithSections = {
    id: String(raw.id),
    name: String(raw.name),
    portaria_ref: String(raw.portaria_ref ?? ""),
    uf: String(raw.uf ?? ""),
    applies_to: parseAppliesTo(raw.applies_to) as EstablishmentType[],
    description: raw.description != null ? String(raw.description) : null,
    version: Number(raw.version),
    is_active: Boolean(raw.is_active),
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
    sections,
    required_item_count,
    total_item_count,
  };

  return { template, fillSessionCount: fillCount ?? 0 };
}

// ── Template metadata ─────────────────────────────────────────────────────────

export async function updateChecklistTemplateMetaAction(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const templateId = String(formData.get("template_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const portaria_ref = String(formData.get("portaria_ref") ?? "").trim();
  const uf = String(formData.get("uf") ?? "").trim();
  const description =
    String(formData.get("description") ?? "").trim() || null;
  const is_active = formData.get("is_active") === "true";

  if (!templateId || !name)
    redirect(`/admin/checklists/${templateId}/editar?err=invalid`);

  const { error } = await supabase
    .from("checklist_templates")
    .update({ name, portaria_ref, uf, description, is_active })
    .eq("id", templateId);

  if (error) redirect(`/admin/checklists/${templateId}/editar?err=save`);

  await bumpVersionIfApplied(supabase, templateId);

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  redirect(`/admin/checklists/${templateId}/editar?ok=meta_saved`);
}

// ── Sections ──────────────────────────────────────────────────────────────────

export async function addChecklistSectionAction(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const templateId = String(formData.get("template_id") ?? "").trim();
  const title = normalizeChecklistText(String(formData.get("title") ?? ""));

  if (!templateId || !title)
    redirect(`/admin/checklists/${templateId}/editar?err=invalid`);

  const { data: existing } = await supabase
    .from("checklist_template_sections")
    .select("position")
    .eq("template_id", templateId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existing?.[0]?.position != null ? existing[0].position + 1 : 1;

  const { error } = await supabase
    .from("checklist_template_sections")
    .insert({ template_id: templateId, title, position: nextPosition });

  if (error) redirect(`/admin/checklists/${templateId}/editar?err=save`);

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  redirect(`/admin/checklists/${templateId}/editar?ok=section_added`);
}

export async function updateChecklistSectionAction(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const templateId = String(formData.get("template_id") ?? "").trim();
  const sectionId = String(formData.get("section_id") ?? "").trim();
  const title = normalizeChecklistText(String(formData.get("title") ?? ""));
  const position = parseInt(String(formData.get("position") ?? "1"), 10);

  if (!templateId || !sectionId || !title)
    redirect(`/admin/checklists/${templateId}/editar?err=invalid`);

  const { error } = await supabase
    .from("checklist_template_sections")
    .update({ title, position })
    .eq("id", sectionId)
    .eq("template_id", templateId);

  if (error) redirect(`/admin/checklists/${templateId}/editar?err=save`);

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  redirect(`/admin/checklists/${templateId}/editar?ok=section_saved`);
}

export async function deleteChecklistSectionAction(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const templateId = String(formData.get("template_id") ?? "").trim();
  const sectionId = String(formData.get("section_id") ?? "").trim();

  if (!templateId || !sectionId)
    redirect(`/admin/checklists/${templateId}/editar?err=invalid`);

  await supabase
    .from("checklist_template_items")
    .delete()
    .eq("section_id", sectionId);

  const { error } = await supabase
    .from("checklist_template_sections")
    .delete()
    .eq("id", sectionId)
    .eq("template_id", templateId);

  if (error) redirect(`/admin/checklists/${templateId}/editar?err=save`);

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  redirect(`/admin/checklists/${templateId}/editar?ok=section_deleted`);
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function addChecklistItemAction(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const templateId = String(formData.get("template_id") ?? "").trim();
  const sectionId = String(formData.get("section_id") ?? "").trim();
  const description = normalizeChecklistText(
    String(formData.get("description") ?? ""),
  );
  const is_required = formData.get("is_required") === "true";
  const peso = parseFloat(String(formData.get("peso") ?? "1")) || 1;
  const is_structure_only = formData.get("is_structure_only") === "true";

  if (!templateId || !sectionId || !description)
    redirect(`/admin/checklists/${templateId}/editar?err=invalid`);

  const { data: existing } = await supabase
    .from("checklist_template_items")
    .select("position")
    .eq("section_id", sectionId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existing?.[0]?.position != null ? existing[0].position + 1 : 1;

  const { error } = await supabase
    .from("checklist_template_items")
    .insert({
      section_id: sectionId,
      description,
      is_required,
      peso,
      is_structure_only,
      position: nextPosition,
    });

  if (error) redirect(`/admin/checklists/${templateId}/editar?err=save`);

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  redirect(`/admin/checklists/${templateId}/editar?ok=item_added`);
}

export async function updateChecklistItemAction(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const templateId = String(formData.get("template_id") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const description = normalizeChecklistText(
    String(formData.get("description") ?? ""),
  );
  const is_required = formData.get("is_required") === "true";
  const peso = parseFloat(String(formData.get("peso") ?? "1")) || 1;
  const is_structure_only = formData.get("is_structure_only") === "true";
  const position = parseInt(String(formData.get("position") ?? "1"), 10);

  if (!templateId || !itemId || !description)
    redirect(`/admin/checklists/${templateId}/editar?err=invalid`);

  const { error } = await supabase
    .from("checklist_template_items")
    .update({ description, is_required, peso, is_structure_only, position })
    .eq("id", itemId);

  if (error) redirect(`/admin/checklists/${templateId}/editar?err=save`);

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  redirect(`/admin/checklists/${templateId}/editar?ok=item_saved`);
}

export async function undoChecklistItemAction(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const templateId = String(formData.get("template_id") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();
  const description = normalizeChecklistText(
    String(formData.get("description") ?? ""),
  );
  const is_required = formData.get("is_required") === "true";
  const peso = parseFloat(String(formData.get("peso") ?? "1")) || 1;
  const is_structure_only = formData.get("is_structure_only") === "true";
  const position = parseInt(String(formData.get("position") ?? "1"), 10);

  if (!templateId || !itemId || !description)
    redirect(`/admin/checklists/${templateId}/editar?err=invalid`);

  const { error } = await supabase
    .from("checklist_template_items")
    .update({ description, is_required, peso, is_structure_only, position })
    .eq("id", itemId);

  if (error) redirect(`/admin/checklists/${templateId}/editar?err=save`);

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  redirect(`/admin/checklists/${templateId}/editar?ok=item_saved`);
}

export async function deleteChecklistItemAction(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireAdmin();

  const templateId = String(formData.get("template_id") ?? "").trim();
  const itemId = String(formData.get("item_id") ?? "").trim();

  if (!templateId || !itemId)
    redirect(`/admin/checklists/${templateId}/editar?err=invalid`);

  const { error } = await supabase
    .from("checklist_template_items")
    .delete()
    .eq("id", itemId);

  if (error) redirect(`/admin/checklists/${templateId}/editar?err=save`);

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  redirect(`/admin/checklists/${templateId}/editar?ok=item_deleted`);
}

// ── Structural operations (Client Component call — no redirect) ───────────────

export async function addSectionQuickAction(payload: {
  templateId: string;
  title: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireAdmin();
  const { templateId, title: rawTitle } = payload;
  const title = normalizeChecklistText(rawTitle);
  if (!templateId || !title) return { ok: false, error: "invalid" };

  const { data: existing } = await supabase
    .from("checklist_template_sections")
    .select("position")
    .eq("template_id", templateId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existing?.[0]?.position != null ? existing[0].position + 1 : 1;

  const { error } = await supabase
    .from("checklist_template_sections")
    .insert({ template_id: templateId, title, position: nextPosition });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  return { ok: true };
}

export async function deleteSectionQuickAction(payload: {
  templateId: string;
  sectionId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireAdmin();
  const { templateId, sectionId } = payload;
  if (!templateId || !sectionId) return { ok: false, error: "invalid" };

  await supabase
    .from("checklist_template_items")
    .delete()
    .eq("section_id", sectionId);

  const { error } = await supabase
    .from("checklist_template_sections")
    .delete()
    .eq("id", sectionId)
    .eq("template_id", templateId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  return { ok: true };
}

export async function addItemQuickAction(payload: {
  templateId: string;
  sectionId: string;
  description: string;
  is_required: boolean;
  peso: number;
  is_structure_only: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireAdmin();
  const {
    templateId,
    sectionId,
    description: rawDescription,
    is_required,
    peso,
    is_structure_only,
  } = payload;
  const description = normalizeChecklistText(rawDescription);
  if (!templateId || !sectionId || !description)
    return { ok: false, error: "invalid" };

  const { data: existing } = await supabase
    .from("checklist_template_items")
    .select("position")
    .eq("section_id", sectionId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existing?.[0]?.position != null ? existing[0].position + 1 : 1;

  const { error } = await supabase.from("checklist_template_items").insert({
    section_id: sectionId,
    description,
    is_required,
    peso,
    is_structure_only,
    position: nextPosition,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  return { ok: true };
}

export async function deleteItemQuickAction(payload: {
  templateId: string;
  itemId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireAdmin();
  const { templateId, itemId } = payload;
  if (!templateId || !itemId) return { ok: false, error: "invalid" };

  const { error } = await supabase
    .from("checklist_template_items")
    .delete()
    .eq("id", itemId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();
  return { ok: true };
}

// ── Draft batch save (Client Component call — no redirect) ────────────────────

type SectionUpdate = { id: string; title: string; position: number };
type ItemUpdate = {
  id: string;
  description: string;
  is_required: boolean;
  peso: number;
  is_structure_only: boolean;
  position: number;
};

export async function saveChecklistDraftAction(payload: {
  templateId: string;
  sections: SectionUpdate[];
  items: ItemUpdate[];
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireAdmin();
  const { templateId, sections, items } = payload;

  if (!templateId) return { ok: false, error: "invalid" };

  const [sectionResults, itemResults] = await Promise.all([
    Promise.all(
      sections.map((s) =>
        supabase
          .from("checklist_template_sections")
          .update({
            title: normalizeChecklistText(s.title),
            position: s.position,
          })
          .eq("id", s.id)
          .eq("template_id", templateId),
      ),
    ),
    Promise.all(
      items.map((it) =>
        supabase
          .from("checklist_template_items")
          .update({
            description: normalizeChecklistText(it.description),
            is_required: it.is_required,
            peso: it.peso,
            is_structure_only: it.is_structure_only,
            position: it.position,
          })
          .eq("id", it.id),
      ),
    ),
  ]);

  const firstError = [...sectionResults, ...itemResults].find((r) => r.error);
  if (firstError?.error) return { ok: false, error: firstError.error.message };

  revalidatePath(`/admin/checklists/${templateId}/editar`);
  revalidatePath("/admin/checklists");
  revalidateGlobalChecklistCatalog();

  return { ok: true };
}
