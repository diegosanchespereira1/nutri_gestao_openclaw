"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { loadSessionItemPhotosWithUrls } from "@/lib/actions/checklist-fill-photos";
import { loadCustomTemplateUnified } from "@/lib/actions/checklist-custom";
import { loadChecklistTemplateBundleById } from "@/lib/actions/checklists";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import {
  MAX_CHECKLIST_ITEM_ANNOTATION_CHARS,
  type SectionValidationIssue,
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

export async function startChecklistFill(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const templateId = String(formData.get("template_id") ?? "").trim();
  const establishmentId = String(formData.get("establishment_id") ?? "").trim();
  const areaIdRaw = String(formData.get("area_id") ?? "").trim();

  if (!templateId || !establishmentId) {
    redirect("/checklists?err=missing");
  }

  const ok = await assertEstablishmentOwned(supabase, workspaceOwnerId, establishmentId);
  if (!ok) redirect("/checklists?err=forbidden");

  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("id", templateId)
    .eq("is_active", true)
    .maybeSingle();

  if (!template) redirect("/checklists?err=template");

  // Validar area_id se fornecido: deve pertencer ao estabelecimento e ao owner
  let resolvedAreaId: string | null = null;
  if (areaIdRaw) {
    const { data: area } = await supabase
      .from("establishment_areas")
      .select("id")
      .eq("id", areaIdRaw)
      .eq("establishment_id", establishmentId)
      .eq("owner_user_id", workspaceOwnerId)
      .maybeSingle();
    if (!area) redirect("/checklists?err=area");
    resolvedAreaId = area.id;
  }

  const { data: session, error } = await supabase
    .from("checklist_fill_sessions")
    .insert({
      user_id: user.id,
      establishment_id: establishmentId,
      template_id: templateId,
      custom_template_id: null,
      area_id: resolvedAreaId,
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

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const customTemplateId = String(formData.get("custom_template_id") ?? "").trim();
  const areaIdRawCustom = String(formData.get("area_id") ?? "").trim();
  if (!customTemplateId) redirect("/checklists/personalizados?err=missing");

  const { data: ct } = await supabase
    .from("checklist_custom_templates")
    .select("id, establishment_id")
    .eq("id", customTemplateId)
    .maybeSingle();

  if (!ct) redirect("/checklists/personalizados?err=forbidden");

  // Validar area_id se fornecido
  let resolvedAreaIdCustom: string | null = null;
  if (areaIdRawCustom) {
    const { data: area } = await supabase
      .from("establishment_areas")
      .select("id")
      .eq("id", areaIdRawCustom)
      .eq("establishment_id", ct.establishment_id as string)
      .eq("owner_user_id", workspaceOwnerId)
      .maybeSingle();
    if (area) resolvedAreaIdCustom = area.id;
  }

  const { data: session, error } = await supabase
    .from("checklist_fill_sessions")
    .insert({
      user_id: user.id,
      establishment_id: ct.establishment_id as string,
      template_id: null,
      custom_template_id: customTemplateId,
      area_id: resolvedAreaIdCustom,
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
  /** Nome do cliente (PJ) para nome de ficheiro do PDF do dossiê. */
  pdfClientLabel: string;
  /** Nome da área física avaliada nesta sessão (null quando não aplicável). */
  areaName: string | null;
  itemResponseSource: "global" | "custom";
  itemPhotos: Record<string, ChecklistFillPhotoView[]>;
  latestPdfExport: ChecklistFillPdfExportRow | null;
  /** Info do utilizador que criou o rascunho (pode ser diferente do utilizador atual). */
  createdByName: string | null;
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
      validUntil: r.valid_until ?? null,
    };
  }

  const { data: est } = await supabase
    .from("establishments")
    .select("*, clients(legal_name, trade_name, lifecycle_status)")
    .eq("id", session.establishment_id)
    .maybeSingle();

  const pdfClientLabel = est
    ? establishmentClientLabel(est as EstablishmentWithClientNames)
    : "Cliente";

  const establishmentLabel = est
    ? `${(est as EstablishmentWithClientNames).name} — ${pdfClientLabel}`
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

  let createdByName: string | null = null;
  if (row.user_id !== user.id) {
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", row.user_id)
      .maybeSingle();
    createdByName = creatorProfile?.full_name ?? null;
  }

  // Resolver nome da área (se a sessão tiver area_id)
  let areaName: string | null = null;
  if (row.area_id) {
    const { data: areaRow } = await supabase
      .from("establishment_areas")
      .select("name")
      .eq("id", row.area_id)
      .maybeSingle();
    areaName = areaRow?.name ?? null;
  }

  return {
    session: { ...row, area_name: areaName },
    template,
    responses,
    establishmentLabel,
    pdfClientLabel,
    areaName,
    itemResponseSource,
    itemPhotos,
    latestPdfExport,
    createdByName,
  };
}

export type LoadFillResponsesResult =
  | { ok: true; responses: FillResponsesMap }
  | { ok: false; error: string };

/** Mapa de respostas persistidas (reconciliação antes de finalizar/aprovar). */
export async function loadFillResponsesMapForSession(
  sessionId: string,
): Promise<LoadFillResponsesResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("establishment_id, dossier_approved_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sess) return { ok: false, error: "Rascunho não encontrado." };

  const estOwned = await assertEstablishmentOwned(
    supabase,
    workspaceOwnerId,
    sess.establishment_id as string,
  );
  if (!estOwned) return { ok: false, error: "Sem permissão para este rascunho." };

  if (sess.dossier_approved_at) {
    return { ok: false, error: "Dossiê já aprovado." };
  }

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
      validUntil: r.valid_until ?? null,
    };
  }

  return { ok: true, responses };
}

function buildResponseUpdatePayload(input: {
  outcome: ChecklistFillOutcome;
  noteTrim: string;
  annotationTrim: string;
  validUntil: string | null;
  existingNote: string | null;
  existingAnnotation: string | null;
  existingValidUntil: string | null;
  persistMode: "full" | "merge";
}): {
  outcome: ChecklistFillOutcome;
  note: string | null;
  item_annotation: string | null;
  valid_until: string | null;
} {
  const { outcome, noteTrim, annotationTrim, existingNote, existingAnnotation, persistMode } =
    input;

  if (persistMode === "full") {
    return {
      outcome,
      note: noteTrim.length > 0 ? noteTrim : null,
      item_annotation: annotationTrim.length > 0 ? annotationTrim : null,
      valid_until: input.validUntil,
    };
  }

  // merge: não anular nota/anotação já gravadas quando o payload veio vazio (flush/reconciliação).
  let note: string | null;
  if (outcome !== "nc") {
    note = null;
  } else if (noteTrim.length > 0) {
    note = noteTrim;
  } else {
    const keep = (existingNote ?? "").trim().length > 0 ? existingNote : null;
    note = keep;
  }

  let item_annotation: string | null;
  if (annotationTrim.length > 0) {
    item_annotation = annotationTrim;
  } else {
    const keepAnn = (existingAnnotation ?? "").trim().length > 0 ? existingAnnotation : null;
    item_annotation = keepAnn;
  }

  const valid_until = input.validUntil ?? input.existingValidUntil ?? null;
  return { outcome, note, item_annotation, valid_until };
}

export async function saveFillItemResponse(input: {
  sessionId: string;
  itemId: string;
  itemResponseSource: "global" | "custom";
  outcome: ChecklistFillOutcome | null;
  note: string | null;
  annotation: string | null;
  validUntil: string | null;
  /** merge: atualização parcial — não apaga note/anotação no BD se o cliente enviar vazio. */
  persistMode?: "full" | "merge";
}): Promise<FillActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { sessionId, itemId, itemResponseSource, outcome, note, annotation, validUntil } =
    input;
  const persistMode = input.persistMode ?? "full";

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("id, template_id, custom_template_id, dossier_approved_at, establishment_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sess) return { ok: false, error: "Rascunho não encontrado." };

  const estOwned = await assertEstablishmentOwned(
    supabase,
    workspaceOwnerId,
    sess.establishment_id as string,
  );
  if (!estOwned) return { ok: false, error: "Sem permissão para este rascunho." };

  if (sess.dossier_approved_at) {
    return {
      ok: false,
      error:
        "Dossiê já aprovado: não é possível alterar respostas (registro imutável, FR70).",
    };
  }

  const sessionIsCustom = Boolean(sess.custom_template_id);
  if (sessionIsCustom !== (itemResponseSource === "custom")) {
    return { ok: false, error: "Tipo de item incompatível com a sessão." };
  }

  if (itemResponseSource === "global") {
    const { data: itemMeta } = await supabase
      .from("checklist_template_items")
      .select("id")
      .eq("id", itemId)
      .maybeSingle();
    if (!itemMeta) return { ok: false, error: "Item inválido." };
  } else {
    const { data: itemMeta } = await supabase
      .from("checklist_custom_items")
      .select("id, custom_section_id")
      .eq("id", itemId)
      .maybeSingle();
    if (!itemMeta) return { ok: false, error: "Item inválido." };

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

  const noteTrim = (note ?? "").trim();
  let annotationTrim = (annotation ?? "").trim();
  if (annotationTrim.length > MAX_CHECKLIST_ITEM_ANNOTATION_CHARS) {
    annotationTrim = annotationTrim.slice(0, MAX_CHECKLIST_ITEM_ANNOTATION_CHARS);
  }
  const normalizedValidUntil = (validUntil ?? "").trim() || null;

  if (itemResponseSource === "global") {
    const { data: existing } = await supabase
      .from("checklist_fill_item_responses")
      .select("id, note, item_annotation, valid_until")
      .eq("session_id", sessionId)
      .eq("template_item_id", itemId)
      .maybeSingle();

    if (existing) {
      const payload = buildResponseUpdatePayload({
        outcome,
        noteTrim,
        annotationTrim,
        validUntil: normalizedValidUntil,
        existingNote: existing.note as string | null,
        existingAnnotation: existing.item_annotation as string | null,
        existingValidUntil: existing.valid_until as string | null,
        persistMode,
      });
      const { error } = await supabase
        .from("checklist_fill_item_responses")
        .update(payload)
        .eq("id", existing.id as string);
      if (error) return { ok: false, error: "Não foi possível salvar." };
    } else {
      const { error } = await supabase.from("checklist_fill_item_responses").insert({
        session_id: sessionId,
        template_item_id: itemId,
        custom_item_id: null,
        outcome,
        note: noteTrim.length > 0 ? noteTrim : null,
        item_annotation: annotationTrim.length > 0 ? annotationTrim : null,
        valid_until: normalizedValidUntil,
      });
      if (error) return { ok: false, error: "Não foi possível salvar." };
    }
  } else {
    const { data: existing } = await supabase
      .from("checklist_fill_item_responses")
      .select("id, note, item_annotation, valid_until")
      .eq("session_id", sessionId)
      .eq("custom_item_id", itemId)
      .maybeSingle();

    if (existing) {
      const payload = buildResponseUpdatePayload({
        outcome,
        noteTrim,
        annotationTrim,
        validUntil: normalizedValidUntil,
        existingNote: existing.note as string | null,
        existingAnnotation: existing.item_annotation as string | null,
        existingValidUntil: existing.valid_until as string | null,
        persistMode,
      });
      const { error } = await supabase
        .from("checklist_fill_item_responses")
        .update(payload)
        .eq("id", existing.id as string);
      if (error) return { ok: false, error: "Não foi possível salvar." };
    } else {
      const { error } = await supabase.from("checklist_fill_item_responses").insert({
        session_id: sessionId,
        template_item_id: null,
        custom_item_id: itemId,
        outcome,
        note: noteTrim.length > 0 ? noteTrim : null,
        item_annotation: annotationTrim.length > 0 ? annotationTrim : null,
        valid_until: normalizedValidUntil,
      });
      if (error) return { ok: false, error: "Não foi possível salvar." };
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

/* ─── Task C.2: checkExistingOpenFillSession ────────────────────────────── */

export type ExistingOpenSession = {
  id: string;
  updated_at: string;
  response_count: number;
  started_by_me: boolean;
  /** Nome de quem iniciou (null = fui eu mesmo). */
  started_by_name: string | null;
};

/**
 * Verifica se já existe sessão em aberto (dossier_approved_at IS NULL) para o par
 * estabelecimento + template, com ao menos 1 resposta salva.
 * Escopo: qualquer sessão cujo estabelecimento pertence a um cliente do usuário atual
 * (via join establishments → clients → owner_user_id).
 * Retorna a sessão mais recente elegível, ou null se não houver nenhuma.
 */
export async function checkExistingOpenFillSession(input: {
  establishmentId: string;
  templateId: string | null;
  customTemplateId: string | null;
}): Promise<ExistingOpenSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  // Validar posse do estabelecimento (assertEstablishmentOwned como primeira verificação).
  const ok = await assertEstablishmentOwned(supabase, workspaceOwnerId, input.establishmentId);
  if (!ok) return null;

  const { establishmentId, templateId, customTemplateId } = input;

  // Buscar sessões abertas para esse par estabelecimento + template, ordenadas pela
  // mais recente. A nova RLS policy permite ler sessões de qualquer membro da equipe
  // que pertença ao mesmo tenant (client owner).
  let query = supabase
    .from("checklist_fill_sessions")
    .select("id, user_id, updated_at")
    .eq("establishment_id", establishmentId)
    .is("dossier_approved_at", null)
    .order("updated_at", { ascending: false });

  if (templateId) {
    query = query.eq("template_id", templateId);
  } else if (customTemplateId) {
    query = query.eq("custom_template_id", customTemplateId);
  } else {
    return null;
  }

  const { data: sessions } = await query;
  if (!sessions || sessions.length === 0) return null;

  // Para cada sessão, verificar se tem ao menos 1 resposta salva.
  for (const sess of sessions) {
    const { count } = await supabase
      .from("checklist_fill_item_responses")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sess.id);

    const responseCount = count ?? 0;
    if (responseCount > 0) {
      const isMine = sess.user_id === user.id;
      let startedByName: string | null = null;
      if (!isMine) {
        // Busca pelo team_members do workspace (RLS permite leitura via owner_user_id).
        // O member_user_id liga o registro de membro ao auth.uid() de quem iniciou a sessão.
        const { data: member } = await supabase
          .from("team_members")
          .select("full_name")
          .eq("owner_user_id", workspaceOwnerId)
          .eq("member_user_id", sess.user_id)
          .maybeSingle();
        startedByName = member?.full_name ?? null;

        // Fallback: profiles (funciona quando o próprio criador é o owner do workspace)
        if (!startedByName) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", sess.user_id)
            .maybeSingle();
          startedByName = profile?.full_name ?? null;
        }
      }
      return {
        id: sess.id,
        updated_at: sess.updated_at,
        response_count: responseCount,
        started_by_me: isMine,
        started_by_name: startedByName,
      };
    }
  }

  return null;
}

/* ─── startChecklistFillBatch ─────────────────────────────────────────── */

/**
 * Cria uma sessão de preenchimento para cada área selecionada (ou uma única sessão
 * sem área se `areaIds` for vazio). Retorna o ID da primeira sessão criada para
 * redirecionar o cliente — não faz redirect internamente.
 */
export async function startChecklistFillBatch(input: {
  templateId: string;
  establishmentId: string;
  areaIds: string[]; // [] = sem área
}): Promise<
  | { ok: true; sessionIds: string[]; firstSessionId: string; totalSessions: number }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const { templateId, establishmentId, areaIds } = input;

  if (!templateId || !establishmentId) {
    return { ok: false, error: "missing_fields" };
  }

  const owned = await assertEstablishmentOwned(supabase, workspaceOwnerId, establishmentId);
  if (!owned) return { ok: false, error: "forbidden" };

  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("id", templateId)
    .eq("is_active", true)
    .maybeSingle();
  if (!template) return { ok: false, error: "template_not_found" };

  // Resolver lista de area_ids (null = sem área)
  const resolvedAreas: (string | null)[] = areaIds.length > 0 ? areaIds : [null];

  // Validar cada área fornecida
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
        template_id: templateId,
        custom_template_id: null,
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

/* ─── Delete draft session ────────────────────────────────────────────── */

/**
 * Deleta permanentemente uma sessão de preenchimento **não aprovada**.
 * Remove fotos do storage e, via cascade no banco, as respostas e PDF exports.
 */
export async function deleteChecklistFillSessionAction(
  sessionId: string,
): Promise<FillActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("id, establishment_id, dossier_approved_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sess) return { ok: false, error: "Rascunho não encontrado." };

  if (sess.dossier_approved_at) {
    return {
      ok: false,
      error: "Dossiê já aprovado: não é possível excluir.",
    };
  }

  const estOwned = await assertEstablishmentOwned(
    supabase,
    workspaceOwnerId,
    sess.establishment_id as string,
  );
  if (!estOwned) return { ok: false, error: "Sem permissão para excluir este rascunho." };

  // Remove fotos do bucket antes de deletar os registros (cascade).
  const { data: photos } = await supabase
    .from("checklist_fill_item_photos")
    .select("storage_path")
    .eq("session_id", sessionId);

  const paths = (photos ?? [])
    .map((p) => p.storage_path as string)
    .filter(Boolean);

  if (paths.length > 0) {
    const { CHECKLIST_FILL_PHOTOS_BUCKET } = await import(
      "@/lib/constants/checklist-fill-photos-storage"
    );
    await supabase.storage.from(CHECKLIST_FILL_PHOTOS_BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from("checklist_fill_sessions")
    .delete()
    .eq("id", sessionId)
    .is("dossier_approved_at", null);

  if (error) {
    return { ok: false, error: "Não foi possível excluir o rascunho." };
  }

  revalidatePath("/inicio");
  revalidatePath("/checklists");

  return { ok: true };
}

export type ApproveDossierResult =
  | { ok: true; approvedAt: string }
  | { ok: false; error: string };

function formatIssueWithSectionAndItem(
  template: ChecklistTemplateWithSections,
  issue: SectionValidationIssue,
): string {
  const sectionIndex = template.sections.findIndex((section) =>
    section.items.some((item) => item.id === issue.item_id),
  );
  if (sectionIndex < 0) return issue.message;
  const section = template.sections[sectionIndex];
  const item = section.items.find((it) => it.id === issue.item_id);
  if (!section || !item) return issue.message;
  return `Seção ${sectionIndex + 1} (${section.title}) — Item "${item.description}": ${issue.message}`;
}

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
      return {
        ok: false,
        error: formatIssueWithSectionAndItem(bundle.template, issues[0]),
      };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const estOwned = await assertEstablishmentOwned(
    supabase,
    workspaceOwnerId,
    bundle.session.establishment_id as string,
  );
  if (!estOwned) return { ok: false, error: "Sem permissão para aprovar este dossiê." };

  const approvedAt = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("checklist_fill_sessions")
    .update({ dossier_approved_at: approvedAt })
    .eq("id", sessionId)
    .is("dossier_approved_at", null)
    .select("dossier_approved_at")
    .maybeSingle();

  if (error || !updated?.dossier_approved_at) {
    return { ok: false, error: "Não foi possível aprovar o dossiê." };
  }

  // Calcular e persistir a pontuação (best-effort: não impede a aprovação se falhar)
  await supabase.rpc("calculate_and_store_session_score", {
    p_session_id: sessionId,
  });

  const at = String(updated.dossier_approved_at);

  const visitId = bundle.session.scheduled_visit_id;
  if (visitId) {
    await supabase
      .from("scheduled_visits")
      .update({ status: "completed" })
      .eq("id", visitId)
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

