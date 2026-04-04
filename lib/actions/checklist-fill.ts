"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadCustomTemplateUnified } from "@/lib/actions/checklist-custom";
import { loadChecklistTemplateBundleById } from "@/lib/actions/checklists";
import { createClient } from "@/lib/supabase/server";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import {
  validateChecklistSection,
  type ChecklistFillItemResponseRow,
  type ChecklistFillOutcome,
  type ChecklistFillSessionRow,
  type FillResponsesMap,
} from "@/lib/types/checklist-fill";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { EstablishmentWithClientNames } from "@/lib/types/establishments";

export type FillActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function assertEstablishmentOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
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

  return Boolean(cl && cl.owner_user_id === userId);
}

export async function startChecklistFill(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templateId = String(formData.get("template_id") ?? "").trim();
  const establishmentId = String(formData.get("establishment_id") ?? "").trim();

  if (!templateId || !establishmentId) {
    redirect("/checklists?err=missing");
  }

  const ok = await assertEstablishmentOwned(supabase, user.id, establishmentId);
  if (!ok) redirect("/checklists?err=forbidden");

  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("id", templateId)
    .eq("is_active", true)
    .maybeSingle();

  if (!template) redirect("/checklists?err=template");

  const { data: session, error } = await supabase
    .from("checklist_fill_sessions")
    .insert({
      user_id: user.id,
      establishment_id: establishmentId,
      template_id: templateId,
      custom_template_id: null,
    })
    .select("id")
    .single();

  if (error || !session) redirect("/checklists?err=session");

  redirect(`/checklists/preencher/${session.id}`);
}

export async function startChecklistCustomFill(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const customTemplateId = String(formData.get("custom_template_id") ?? "").trim();
  if (!customTemplateId) redirect("/checklists/personalizados?err=missing");

  const { data: ct } = await supabase
    .from("checklist_custom_templates")
    .select("id, establishment_id")
    .eq("id", customTemplateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ct) redirect("/checklists/personalizados?err=forbidden");

  const { data: session, error } = await supabase
    .from("checklist_fill_sessions")
    .insert({
      user_id: user.id,
      establishment_id: ct.establishment_id as string,
      template_id: null,
      custom_template_id: customTemplateId,
    })
    .select("id")
    .single();

  if (error || !session) redirect("/checklists/personalizados?err=session");

  redirect(`/checklists/preencher/${session.id}`);
}

export async function loadFillSessionPageData(sessionId: string): Promise<{
  session: ChecklistFillSessionRow;
  template: ChecklistTemplateWithSections;
  responses: FillResponsesMap;
  establishmentLabel: string;
  itemResponseSource: "global" | "custom";
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session, error: sErr } = await supabase
    .from("checklist_fill_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sErr || !session) return null;

  const row = session as ChecklistFillSessionRow & {
    custom_template_id?: string | null;
  };

  const itemResponseSource: "global" | "custom" = row.custom_template_id
    ? "custom"
    : "global";

  let template: ChecklistTemplateWithSections | null = null;
  if (row.custom_template_id) {
    template = await loadCustomTemplateUnified(row.custom_template_id);
  } else if (row.template_id) {
    template = await loadChecklistTemplateBundleById(row.template_id);
  }

  if (!template) return null;

  const { data: respRows } = await supabase
    .from("checklist_fill_item_responses")
    .select("*")
    .eq("session_id", sessionId);

  const responses: FillResponsesMap = {};
  for (const raw of respRows ?? []) {
    const r = raw as ChecklistFillItemResponseRow;
    const key = r.template_item_id ?? r.custom_item_id;
    if (!key) continue;
    responses[key] = {
      outcome: r.outcome,
      note: r.note,
    };
  }

  const { data: est } = await supabase
    .from("establishments")
    .select("*, clients(legal_name, trade_name, lifecycle_status)")
    .eq("id", session.establishment_id)
    .maybeSingle();

  const establishmentLabel = est
    ? `${(est as EstablishmentWithClientNames).name} — ${establishmentClientLabel(est as EstablishmentWithClientNames)}`
    : "Estabelecimento";

  return {
    session: row,
    template,
    responses,
    establishmentLabel,
    itemResponseSource,
  };
}

export async function saveFillItemResponse(input: {
  sessionId: string;
  itemId: string;
  itemResponseSource: "global" | "custom";
  outcome: ChecklistFillOutcome | null;
  note: string | null;
}): Promise<FillActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { sessionId, itemId, itemResponseSource, outcome, note } = input;

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("id, template_id, custom_template_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sess) return { ok: false, error: "Rascunho não encontrado." };

  const sessionIsCustom = Boolean(sess.custom_template_id);
  if (sessionIsCustom !== (itemResponseSource === "custom")) {
    return { ok: false, error: "Tipo de item incompatível com a sessão." };
  }

  let isRequired = false;
  if (itemResponseSource === "global") {
    const { data: itemMeta } = await supabase
      .from("checklist_template_items")
      .select("id, is_required")
      .eq("id", itemId)
      .maybeSingle();
    if (!itemMeta) return { ok: false, error: "Item inválido." };
    isRequired = Boolean(itemMeta.is_required);
  } else {
    const { data: itemMeta } = await supabase
      .from("checklist_custom_items")
      .select("id, is_required, custom_section_id")
      .eq("id", itemId)
      .maybeSingle();
    if (!itemMeta) return { ok: false, error: "Item inválido." };
    isRequired = Boolean(itemMeta.is_required);

    const { data: sec } = await supabase
      .from("checklist_custom_sections")
      .select("custom_template_id")
      .eq("id", itemMeta.custom_section_id as string)
      .maybeSingle();

    if (!sec || sec.custom_template_id !== sess.custom_template_id) {
      return { ok: false, error: "Item inválido para este modelo." };
    }
  }

  if (outcome === null) {
    if (itemResponseSource === "global") {
      await supabase
        .from("checklist_fill_item_responses")
        .delete()
        .eq("session_id", sessionId)
        .eq("template_item_id", itemId);
    } else {
      await supabase
        .from("checklist_fill_item_responses")
        .delete()
        .eq("session_id", sessionId)
        .eq("custom_item_id", itemId);
    }
    revalidatePath(`/checklists/preencher/${sessionId}`);
    return { ok: true };
  }

  if (outcome === "na" && isRequired) {
    return {
      ok: false,
      error: "Itens obrigatórios não podem ser Não aplicável.",
    };
  }

  const noteTrim = (note ?? "").trim();

  if (itemResponseSource === "global") {
    const { data: existing } = await supabase
      .from("checklist_fill_item_responses")
      .select("id")
      .eq("session_id", sessionId)
      .eq("template_item_id", itemId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("checklist_fill_item_responses")
        .update({
          outcome,
          note: noteTrim.length > 0 ? noteTrim : null,
        })
        .eq("id", existing.id as string);
      if (error) return { ok: false, error: "Não foi possível guardar." };
    } else {
      const { error } = await supabase.from("checklist_fill_item_responses").insert({
        session_id: sessionId,
        template_item_id: itemId,
        custom_item_id: null,
        outcome,
        note: noteTrim.length > 0 ? noteTrim : null,
      });
      if (error) return { ok: false, error: "Não foi possível guardar." };
    }
  } else {
    const { data: existing } = await supabase
      .from("checklist_fill_item_responses")
      .select("id")
      .eq("session_id", sessionId)
      .eq("custom_item_id", itemId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("checklist_fill_item_responses")
        .update({
          outcome,
          note: noteTrim.length > 0 ? noteTrim : null,
        })
        .eq("id", existing.id as string);
      if (error) return { ok: false, error: "Não foi possível guardar." };
    } else {
      const { error } = await supabase.from("checklist_fill_item_responses").insert({
        session_id: sessionId,
        template_item_id: null,
        custom_item_id: itemId,
        outcome,
        note: noteTrim.length > 0 ? noteTrim : null,
      });
      if (error) return { ok: false, error: "Não foi possível guardar." };
    }
  }

  revalidatePath(`/checklists/preencher/${sessionId}`);
  return { ok: true };
}

/** Valida secção com base nas respostas persistidas (servidor). */
export async function validateFillSectionAction(
  sessionId: string,
  sectionId: string,
): Promise<FillActionResult> {
  const bundle = await loadFillSessionPageData(sessionId);
  if (!bundle) return { ok: false, error: "Rascunho não encontrado." };

  const section = bundle.template.sections.find((s) => s.id === sectionId);
  if (!section) return { ok: false, error: "Secção inválida." };

  const issues = validateChecklistSection(section, bundle.responses);
  if (issues.length > 0) {
    return { ok: false, error: issues[0].message };
  }

  return { ok: true };
}
