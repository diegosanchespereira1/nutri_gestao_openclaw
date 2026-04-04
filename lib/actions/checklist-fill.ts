"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { loadSessionItemPhotosWithUrls } from "@/lib/actions/checklist-fill-photos";
import { loadCustomTemplateUnified } from "@/lib/actions/checklist-custom";
import { loadChecklistTemplateBundleById } from "@/lib/actions/checklists";
import { createClient } from "@/lib/supabase/server";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import {
  MAX_CHECKLIST_ITEM_ANNOTATION_CHARS,
  validateChecklistSection,
  type ChecklistFillItemResponseRow,
  type ChecklistFillOutcome,
  type ChecklistFillSessionRow,
  type FillResponsesMap,
} from "@/lib/types/checklist-fill";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { ChecklistFillPdfExportRow } from "@/lib/types/checklist-fill-pdf";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
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
  itemPhotos: Record<string, ChecklistFillPhotoView[]>;
  latestPdfExport: ChecklistFillPdfExportRow | null;
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
      annotation: r.item_annotation ?? null,
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

  const itemPhotos = await loadSessionItemPhotosWithUrls(supabase, sessionId);

  const pdfRes = await supabase
    .from("checklist_fill_pdf_exports")
    .select(
      "id, user_id, session_id, status, storage_path, error_message, created_at, updated_at",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestPdfExport =
    !pdfRes.error && pdfRes.data
      ? (pdfRes.data as ChecklistFillPdfExportRow)
      : null;

  return {
    session: row,
    template,
    responses,
    establishmentLabel,
    itemResponseSource,
    itemPhotos,
    latestPdfExport,
  };
}

export async function saveFillItemResponse(input: {
  sessionId: string;
  itemId: string;
  itemResponseSource: "global" | "custom";
  outcome: ChecklistFillOutcome | null;
  note: string | null;
  annotation: string | null;
}): Promise<FillActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { sessionId, itemId, itemResponseSource, outcome, note, annotation } =
    input;

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("id, template_id, custom_template_id, dossier_approved_at")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sess) return { ok: false, error: "Rascunho não encontrado." };

  if (sess.dossier_approved_at) {
    return {
      ok: false,
      error:
        "Dossiê já aprovado: não é possível alterar respostas (registo imutável, FR70).",
    };
  }

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

    const { data: sessMetaClear } = await supabase
      .from("checklist_fill_sessions")
      .select("scheduled_visit_id")
      .eq("id", sessionId)
      .maybeSingle();

    const visitClear = sessMetaClear?.scheduled_visit_id;
    if (visitClear) {
      const vid = String(visitClear);
      revalidatePath(`/visitas/${vid}`);
      revalidatePath(`/visitas/${vid}/iniciar`);
    }

    return { ok: true };
  }

  if (outcome === "na" && isRequired) {
    return {
      ok: false,
      error: "Itens obrigatórios não podem ser Não aplicável.",
    };
  }

  const noteTrim = (note ?? "").trim();
  let annotationTrim = (annotation ?? "").trim();
  if (annotationTrim.length > MAX_CHECKLIST_ITEM_ANNOTATION_CHARS) {
    annotationTrim = annotationTrim.slice(0, MAX_CHECKLIST_ITEM_ANNOTATION_CHARS);
  }

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
          item_annotation: annotationTrim.length > 0 ? annotationTrim : null,
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
        item_annotation: annotationTrim.length > 0 ? annotationTrim : null,
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
          item_annotation: annotationTrim.length > 0 ? annotationTrim : null,
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
        item_annotation: annotationTrim.length > 0 ? annotationTrim : null,
      });
      if (error) return { ok: false, error: "Não foi possível guardar." };
    }
  }

  revalidatePath(`/checklists/preencher/${sessionId}`);

  const { data: sessMeta } = await supabase
    .from("checklist_fill_sessions")
    .select("scheduled_visit_id")
    .eq("id", sessionId)
    .maybeSingle();

  const visitId = sessMeta?.scheduled_visit_id;
  if (visitId) {
    const vid = String(visitId);
    revalidatePath(`/visitas/${vid}`);
    revalidatePath(`/visitas/${vid}/iniciar`);
  }

  return { ok: true };
}

export type ApproveDossierResult =
  | { ok: true; approvedAt: string }
  | { ok: false; error: string };

/** Aprova o dossiê: valida todo o modelo, regista data e bloqueia edições (FR23); visita ligada → concluída. */
export async function approveChecklistFillDossierAction(
  sessionId: string,
): Promise<ApproveDossierResult> {
  const bundle = await loadFillSessionPageData(sessionId);
  if (!bundle) return { ok: false, error: "Rascunho não encontrado." };

  if (bundle.session.dossier_approved_at) {
    return { ok: false, error: "Este dossiê já foi aprovado." };
  }

  for (const sec of bundle.template.sections) {
    const issues = validateChecklistSection(sec, bundle.responses);
    if (issues.length > 0) {
      return { ok: false, error: issues[0].message };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const approvedAt = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("checklist_fill_sessions")
    .update({ dossier_approved_at: approvedAt })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .is("dossier_approved_at", null)
    .select("dossier_approved_at")
    .maybeSingle();

  if (error || !updated?.dossier_approved_at) {
    return { ok: false, error: "Não foi possível aprovar o dossiê." };
  }

  const at = String(updated.dossier_approved_at);

  const visitId = bundle.session.scheduled_visit_id;
  if (visitId) {
    await supabase
      .from("scheduled_visits")
      .update({ status: "completed" })
      .eq("id", visitId)
      .eq("user_id", user.id)
      .in("status", ["scheduled", "in_progress"]);
  }

  revalidatePath(`/checklists/preencher/${sessionId}`);
  if (visitId) {
    const vid = String(visitId);
    revalidatePath(`/visitas/${vid}`);
    revalidatePath(`/visitas/${vid}/iniciar`);
  }
  revalidatePath("/visitas");
  revalidatePath("/inicio");

  if (visitId) {
    const vid = String(visitId);
    const sid = sessionId;
    after(() => {
      void import("@/lib/actions/checklist-fill-dossier-email").then((m) =>
        m.trySendDossierEmailAfterApprove(vid, sid),
      );
    });
  }

  return { ok: true, approvedAt: at };
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
