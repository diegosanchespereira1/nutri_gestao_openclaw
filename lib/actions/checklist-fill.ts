"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";

import { requireWorkspaceAuthContext } from "@/lib/actions/auth-context";
import { getClientSignatureRequiredAction } from "@/lib/actions/checklist-pdf-settings";
import { generateDocumentHash } from "@/lib/checklists/document-hash";
import { resolveApprovalClientIp } from "@/lib/server/client-ip";
import { loadSessionItemPhotosWithUrls } from "@/lib/actions/checklist-fill-photos";
import { loadCustomTemplateUnified } from "@/lib/actions/checklist-custom";
import { loadChecklistTemplateBundleByIdDirect } from "@/lib/actions/checklists";
import {
  getProfileSignatureDataUrl,
  MAX_SESSION_SIGNATURE_DATA_URL_CHARS,
} from "@/lib/profile/signature-sync";
import {
  loadWorkspaceTemplateBundle,
  startWorkspaceTemplateFillBatch,
} from "@/lib/actions/checklist-workspace";
import { checklistValidityAlertsCacheTag } from "@/lib/cache-tags";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { createClient } from "@/lib/supabase/server";
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
import { todayKey } from "@/lib/datetime/calendar-tz";

export type FillActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function assertEstablishmentOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  establishmentId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("establishments")
    .select("clients!inner(owner_user_id)")
    .eq("id", establishmentId)
    .maybeSingle();
  if (!data) return false;
  // Supabase types the join as array; at runtime PostgREST returns a single object for many-to-one FK
  const ownerRow = data.clients as unknown as { owner_user_id: string } | null;
  return ownerRow?.owner_user_id === workspaceOwnerId;
}

export async function startChecklistFill(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) redirect("/login");

  const templateId = String(formData.get("template_id") ?? "").trim();
  const establishmentId = String(formData.get("establishment_id") ?? "").trim();
  const areaIdRaw = String(formData.get("area_id") ?? "").trim();

  if (!templateId || !establishmentId) {
    redirect("/checklists?err=missing");
  }

  const ok = await assertEstablishmentOwned(supabase, auth.workspaceOwnerId, establishmentId);
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
      .eq("owner_user_id", auth.workspaceOwnerId)
      .maybeSingle();
    if (!area) redirect("/checklists?err=area");
    resolvedAreaId = area.id;
  }

  const { data: session, error } = await supabase
    .from("checklist_fill_sessions")
    .insert({
      user_id: auth.userId,
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
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) redirect("/login");

  const customTemplateId = String(formData.get("custom_template_id") ?? "").trim();
  const areaIdRawCustom = String(formData.get("area_id") ?? "").trim();
  if (!customTemplateId) redirect("/checklists/personalizados?err=missing");

  const { data: ct } = await supabase
    .from("checklist_custom_templates")
    .select("id, establishment_id, archived_at")
    .eq("id", customTemplateId)
    .maybeSingle();

  if (!ct || ct.archived_at) redirect("/checklists/personalizados?err=forbidden");

  // Validar area_id se fornecido
  let resolvedAreaIdCustom: string | null = null;
  if (areaIdRawCustom) {
    const { data: area } = await supabase
      .from("establishment_areas")
      .select("id")
      .eq("id", areaIdRawCustom)
      .eq("establishment_id", ct.establishment_id as string)
      .eq("owner_user_id", auth.workspaceOwnerId)
      .maybeSingle();
    if (area) resolvedAreaIdCustom = area.id;
  }

  const { data: session, error } = await supabase
    .from("checklist_fill_sessions")
    .insert({
      user_id: auth.userId,
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

/**
 * Para sessões recém-criadas (sem nenhuma resposta), copia as respostas com
 * valid_until ainda vigente da sessão aprovada mais recente para o mesmo escopo
 * (template + estabelecimento + área). Retorna o número de itens herdados.
 */
async function inheritValidResponsesIfFreshSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: ChecklistFillSessionRow & {
    custom_template_id?: string | null;
    workspace_template_id?: string | null;
  },
): Promise<number> {
  const todayIso = todayKey(new Date(), "America/Sao_Paulo");
  const curArea = session.area_id ?? null;

  // Determina a coluna de template da sessão atual
  const templateCol = session.workspace_template_id
    ? ("workspace_template_id" as const)
    : session.custom_template_id
      ? ("custom_template_id" as const)
      : session.template_id
        ? ("template_id" as const)
        : null;

  if (!templateCol) return 0;

  const templateId =
    templateCol === "workspace_template_id"
      ? session.workspace_template_id!
      : templateCol === "custom_template_id"
        ? session.custom_template_id!
        : session.template_id!;

  // Busca sessões aprovadas para o mesmo escopo (retorna area_id para filtrar)
  const { data: candidates, error: prevErr } = await supabase
    .from("checklist_fill_sessions")
    .select("id, area_id")
    .eq("establishment_id", session.establishment_id)
    .neq("id", session.id)
    .eq(templateCol, templateId)
    .not("dossier_approved_at", "is", null)
    .order("dossier_approved_at", { ascending: false })
    .limit(20);

  if (prevErr) {
    console.error("[inherit] erro ao buscar sessões anteriores:", prevErr.message);
    return 0;
  }

  // Seleciona a mais recente com o mesmo area_id (comparação normaliza null/undefined)
  const prevSession = (candidates ?? []).find(
    (s) => ((s as { area_id?: string | null }).area_id ?? null) === curArea,
  );

  if (!prevSession) {
    console.log("[inherit] nenhuma sessão aprovada anterior com mesma área encontrada");
    return 0;
  }

  const prevSessionId = (prevSession as { id: string }).id;

  // Busca respostas com validade ainda vigente
  const { data: srcRows, error: srcErr } = await supabase
    .from("checklist_fill_item_responses")
    .select("*")
    .eq("session_id", prevSessionId)
    .not("valid_until", "is", null)
    .gte("valid_until", todayIso);

  if (srcErr) {
    console.error("[inherit] erro ao buscar respostas da sessão anterior:", srcErr.message);
    return 0;
  }
  if (!srcRows?.length) {
    console.log("[inherit] nenhum item com validade futura na sessão anterior");
    return 0;
  }

  const itemCol = session.workspace_template_id
    ? "workspace_item_id"
    : session.custom_template_id
      ? "custom_item_id"
      : "template_item_id";

  const inserts = (
    srcRows as (ChecklistFillItemResponseRow & { workspace_item_id?: string | null })[]
  ).map((r) => ({
    session_id: session.id,
    [itemCol]: r.template_item_id ?? r.custom_item_id ?? r.workspace_item_id,
    outcome: r.outcome,
    note: r.note,
    item_annotation: r.item_annotation ?? null,
    valid_until: r.valid_until,
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from("checklist_fill_item_responses")
    .insert(inserts)
    .select("id");

  if (insertErr) {
    console.error("[inherit] erro ao inserir respostas herdadas:", insertErr.message, insertErr.details);
    return 0;
  }
  return inserted?.length ?? 0;
}

export async function loadFillSessionPageData(sessionId: string): Promise<{
  session: ChecklistFillSessionRow;
  template: ChecklistTemplateWithSections;
  responses: FillResponsesMap;
  establishmentLabel: string;
  /** Quantos itens foram herdados automaticamente de sessão anterior (0 = nenhum). */
  inheritedCount: number;
  /** Nome do cliente (PJ) para nome de ficheiro do PDF do dossiê. */
  pdfClientLabel: string;
  /** Nome da área física avaliada nesta sessão (null quando não aplicável). */
  areaName: string | null;
  itemResponseSource: "global" | "custom" | "workspace";
  itemPhotos: Record<string, ChecklistFillPhotoView[]>;
  latestPdfExport: ChecklistFillPdfExportRow | null;
  /** Todos os PDFs `ready` da sessão (versão atual primeiro), para histórico de obsolescência. */
  pdfExportHistory: ChecklistFillPdfExportRow[];
  /** Info do utilizador que criou o rascunho (pode ser diferente do utilizador atual). */
  createdByName: string | null;
} | null> {
  // Usa o contexto já resolvido pela página (cookie-based, sem round-trip de autenticação)
  const { supabase, user } = await getServerContext();
  if (!user) return null;

  const { data: session, error: sErr } = await supabase
    .from("checklist_fill_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (sErr || !session) return null;

  const row = session as ChecklistFillSessionRow & {
    custom_template_id?: string | null;
    workspace_template_id?: string | null;
  };

  const itemResponseSource: "global" | "custom" | "workspace" = row.workspace_template_id
    ? "workspace"
    : row.custom_template_id
      ? "custom"
      : "global";

  // Phase 2: todos os dados dependentes da sessão em paralelo.
  // loadChecklistTemplateBundleByIdDirect usa o mesmo cliente — sem round-trip extra de auth.
  // loadWorkspaceTemplateBundle / loadCustomTemplateUnified ainda criam o próprio cliente
  // mas correm em paralelo com as outras queries, não adicionando ao caminho crítico.
  const templatePromise: Promise<ChecklistTemplateWithSections | null> =
    row.workspace_template_id
      ? loadWorkspaceTemplateBundle(row.workspace_template_id)
      : row.custom_template_id
        ? loadCustomTemplateUnified(row.custom_template_id)
        : row.template_id
          ? loadChecklistTemplateBundleByIdDirect(supabase, row.template_id)
          : Promise.resolve(null);

  const [
    template,
    respRowsResult,
    estResult,
    pdfResult,
    itemPhotos,
    creatorResult,
    areaResult,
  ] = await Promise.all([
    templatePromise,
    supabase
      .from("checklist_fill_item_responses")
      .select("*")
      .eq("session_id", sessionId),
    supabase
      .from("establishments")
      .select("*, clients(legal_name, trade_name, lifecycle_status)")
      .eq("id", session.establishment_id)
      .maybeSingle(),
    supabase
      .from("checklist_fill_pdf_exports")
      .select(
        "id, user_id, session_id, status, storage_path, error_message, created_at, updated_at, version_number, superseded_at, superseded_by_version",
      )
      .eq("session_id", sessionId)
      .order("version_number", { ascending: false })
      .order("created_at", { ascending: false }),
    loadSessionItemPhotosWithUrls(supabase, sessionId),
    // Creator name — só se o rascunho foi criado por outro utilizador
    row.user_id !== user.id
      ? supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", row.user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Area name — só se a sessão tiver area_id
    row.area_id
      ? supabase
          .from("establishment_areas")
          .select("name")
          .eq("id", row.area_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!template) return null;

  let { data: respRows } = respRowsResult;

  // Herança automática de itens com validade vigente (apenas na 1ª abertura)
  let inheritedCount = 0;
  const isFirstOpen = (respRows ?? []).length === 0;
  console.log("[inherit] sessão:", session.id, "| respostas existentes:", (respRows ?? []).length, "| é fresh:", isFirstOpen);
  if (isFirstOpen) {
    inheritedCount = await inheritValidResponsesIfFreshSession(supabase, row);
    if (inheritedCount > 0) {
      const { data: refreshed } = await supabase
        .from("checklist_fill_item_responses")
        .select("*")
        .eq("session_id", sessionId);
      respRows = refreshed;
    }
  }

  const responses: FillResponsesMap = {};
  for (const raw of respRows ?? []) {
    const r = raw as ChecklistFillItemResponseRow & {
      workspace_item_id?: string | null;
    };
    const key = r.template_item_id ?? r.custom_item_id ?? r.workspace_item_id;
    if (!key) continue;
    responses[key] = {
      outcome: r.outcome,
      note: r.note,
      annotation: r.item_annotation ?? null,
      validUntil: r.valid_until ?? null,
    };
  }

  const est = estResult.data;
  const { data: pdfRows, error: pdfErr } = pdfResult;

  const pdfClientLabel = est
    ? establishmentClientLabel(est as EstablishmentWithClientNames)
    : "Cliente";

  const establishmentLabel = est
    ? `${(est as EstablishmentWithClientNames).name} — ${pdfClientLabel}`
    : "Estabelecimento";

  const pdfList: ChecklistFillPdfExportRow[] = (pdfRows ?? []).map((raw) => ({
    id: raw.id as string,
    user_id: raw.user_id as string,
    session_id: raw.session_id as string,
    status: raw.status as ChecklistFillPdfExportRow["status"],
    storage_path: (raw.storage_path as string | null) ?? null,
    error_message: (raw.error_message as string | null) ?? null,
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
    version_number:
      typeof raw.version_number === "number" ? raw.version_number : Number(raw.version_number) || 1,
    superseded_at: (raw.superseded_at as string | null) ?? null,
    superseded_by_version:
      raw.superseded_by_version === null || raw.superseded_by_version === undefined
        ? null
        : Number(raw.superseded_by_version),
  }));

  const latestPdfExport = (() => {
    if (pdfErr || pdfList.length === 0) return null;
    const activeReady = pdfList.find((r) => r.status === "ready" && !r.superseded_at);
    if (activeReady) return activeReady;
    const processing = pdfList.find((r) => r.status === "processing" || r.status === "pending");
    if (processing) return processing;
    return pdfList[0] ?? null;
  })();

  const pdfExportHistory = pdfList
    .filter((r) => r.status === "ready")
    .sort((a, b) => b.version_number - a.version_number);

  const createdByName: string | null = creatorResult.data?.full_name ?? null;
  const areaName: string | null = areaResult.data?.name ?? null;

  return {
    session: { ...row, area_name: areaName },
    template,
    responses,
    inheritedCount,
    establishmentLabel,
    pdfClientLabel,
    areaName,
    itemResponseSource,
    itemPhotos,
    latestPdfExport,
    pdfExportHistory,
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
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("establishment_id, dossier_approved_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sess) return { ok: false, error: "Rascunho não encontrado." };

  const estOwned = await assertEstablishmentOwned(
    supabase,
    auth.workspaceOwnerId,
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
    const r = raw as ChecklistFillItemResponseRow & {
      workspace_item_id?: string | null;
    };
    const key = r.template_item_id ?? r.custom_item_id ?? r.workspace_item_id;
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
  itemResponseSource: "global" | "custom" | "workspace";
  outcome: ChecklistFillOutcome | null;
  note: string | null;
  annotation: string | null;
  validUntil: string | null;
  /** merge: atualização parcial — não apaga note/anotação no BD se o cliente enviar vazio. */
  persistMode?: "full" | "merge";
  /** Em autosave/batch, evita custo de revalidatePath a cada item. */
  withRevalidate?: boolean;
}): Promise<FillActionResult> {
  const supabase = await createClient();
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) return { ok: false, error: auth.error };

  const { sessionId, itemId, itemResponseSource, outcome, note, annotation, validUntil } =
    input;
  const persistMode = input.persistMode ?? "full";
  const withRevalidate = input.withRevalidate ?? true;

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select(
      "id, template_id, custom_template_id, workspace_template_id, dossier_approved_at, establishment_id",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!sess) return { ok: false, error: "Rascunho não encontrado." };

  const estOwned = await assertEstablishmentOwned(
    supabase,
    auth.workspaceOwnerId,
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

  const sessionOrigin: "global" | "custom" | "workspace" = sess.workspace_template_id
    ? "workspace"
    : sess.custom_template_id
      ? "custom"
      : "global";
  if (sessionOrigin !== itemResponseSource) {
    return { ok: false, error: "Tipo de item incompatível com a sessão." };
  }

  if (itemResponseSource === "global") {
    const { data: itemMeta } = await supabase
      .from("checklist_template_items")
      .select("id, is_structure_only")
      .eq("id", itemId)
      .maybeSingle();
    if (!itemMeta) return { ok: false, error: "Item inválido." };
    if (Boolean((itemMeta as { is_structure_only?: boolean }).is_structure_only)) {
      return {
        ok: false,
        error: "Este tópico é apenas um agrupador da lista e não recebe avaliação.",
      };
    }
  } else if (itemResponseSource === "custom") {
    const { data: itemMeta } = await supabase
      .from("checklist_custom_items")
      .select("id, custom_section_id, is_structure_only")
      .eq("id", itemId)
      .maybeSingle();
    if (!itemMeta) return { ok: false, error: "Item inválido." };
    if (Boolean((itemMeta as { is_structure_only?: boolean }).is_structure_only)) {
      return {
        ok: false,
        error: "Este tópico é apenas um agrupador da lista e não recebe avaliação.",
      };
    }

    const { data: sec } = await supabase
      .from("checklist_custom_sections")
      .select("custom_template_id")
      .eq("id", itemMeta.custom_section_id as string)
      .maybeSingle();

    if (!sec || sec.custom_template_id !== sess.custom_template_id) {
      return { ok: false, error: "Item inválido para este modelo." };
    }
  } else {
    const { data: itemMeta } = await supabase
      .from("checklist_workspace_items")
      .select("id, workspace_section_id, is_structure_only")
      .eq("id", itemId)
      .maybeSingle();
    if (!itemMeta) return { ok: false, error: "Item inválido." };
    if (Boolean((itemMeta as { is_structure_only?: boolean }).is_structure_only)) {
      return {
        ok: false,
        error: "Este tópico é apenas um agrupador da lista e não recebe avaliação.",
      };
    }

    const { data: sec } = await supabase
      .from("checklist_workspace_sections")
      .select("workspace_template_id")
      .eq("id", itemMeta.workspace_section_id as string)
      .maybeSingle();

    if (!sec || sec.workspace_template_id !== sess.workspace_template_id) {
      return { ok: false, error: "Item inválido para este modelo." };
    }
  }

  const itemColumn =
    itemResponseSource === "global"
      ? "template_item_id"
      : itemResponseSource === "custom"
        ? "custom_item_id"
        : "workspace_item_id";

  if (outcome === null) {
    await supabase
      .from("checklist_fill_item_responses")
      .delete()
      .eq("session_id", sessionId)
      .eq(itemColumn, itemId);
    if (withRevalidate) {
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
    }

    revalidateTag(checklistValidityAlertsCacheTag(auth.workspaceOwnerId), "max");
    return { ok: true };
  }

  const noteTrim = (note ?? "").trim();
  let annotationTrim = (annotation ?? "").trim();
  if (annotationTrim.length > MAX_CHECKLIST_ITEM_ANNOTATION_CHARS) {
    annotationTrim = annotationTrim.slice(0, MAX_CHECKLIST_ITEM_ANNOTATION_CHARS);
  }
  const normalizedValidUntil = (validUntil ?? "").trim() || null;

  const { data: existing } = await supabase
    .from("checklist_fill_item_responses")
    .select("id, note, item_annotation, valid_until")
    .eq("session_id", sessionId)
    .eq(itemColumn, itemId)
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
    if (error) {
      console.error(
        "[saveFillItemResponse] UPDATE error",
        JSON.stringify({
          sessionId,
          itemId,
          itemColumn,
          responseId: existing.id,
          error,
        }),
      );
      return { ok: false, error: "Não foi possível salvar." };
    }
  } else {
    const insertPayload: Record<string, unknown> = {
      session_id: sessionId,
      template_item_id: null,
      custom_item_id: null,
      workspace_item_id: null,
      outcome,
      note: noteTrim.length > 0 ? noteTrim : null,
      item_annotation: annotationTrim.length > 0 ? annotationTrim : null,
      valid_until: normalizedValidUntil,
    };
    insertPayload[itemColumn] = itemId;
    const { error } = await supabase
      .from("checklist_fill_item_responses")
      .insert(insertPayload);
    if (error && error.code === "23505") {
      // Corrida benigna: outro save (autosave/blur ou outro dispositivo) inseriu
      // a resposta entre o SELECT e o INSERT. A linha já existe — atualiza-a.
      const { data: raceRow } = await supabase
        .from("checklist_fill_item_responses")
        .select("id, note, item_annotation, valid_until")
        .eq("session_id", sessionId)
        .eq(itemColumn, itemId)
        .maybeSingle();
      if (raceRow) {
        const racePayload = buildResponseUpdatePayload({
          outcome,
          noteTrim,
          annotationTrim,
          validUntil: normalizedValidUntil,
          existingNote: raceRow.note as string | null,
          existingAnnotation: raceRow.item_annotation as string | null,
          existingValidUntil: raceRow.valid_until as string | null,
          persistMode,
        });
        const { error: raceErr } = await supabase
          .from("checklist_fill_item_responses")
          .update(racePayload)
          .eq("id", raceRow.id as string);
        if (raceErr) {
          console.error(
            "[saveFillItemResponse] UPDATE-after-conflict error",
            JSON.stringify({ sessionId, itemId, itemColumn, error: raceErr }),
          );
          return { ok: false, error: "Não foi possível salvar." };
        }
      }
    } else if (error) {
      console.error(
        "[saveFillItemResponse] INSERT error",
        JSON.stringify({
          sessionId,
          itemId,
          itemColumn,
          error,
        }),
      );
      return { ok: false, error: "Não foi possível salvar." };
    }
  }

  if (withRevalidate) {
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
  }

  revalidateTag(checklistValidityAlertsCacheTag(auth.workspaceOwnerId), "max");
  return { ok: true };
}

type SaveFillBatchEntry = {
  itemId: string;
  outcome: ChecklistFillOutcome | null;
  note: string | null;
  annotation: string | null;
  validUntil: string | null;
};

export async function saveFillResponsesBatch(input: {
  sessionId: string;
  itemResponseSource: "global" | "custom" | "workspace";
  entries: SaveFillBatchEntry[];
  persistMode?: "full" | "merge";
  withRevalidate?: boolean;
}): Promise<FillActionResult> {
  const supabase = await createClient();
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) return { ok: false, error: auth.error };

  const { sessionId, itemResponseSource } = input;
  const persistMode = input.persistMode ?? "full";
  const withRevalidate = input.withRevalidate ?? true;
  if (!input.entries.length) return { ok: true };

  const requestedItemIds = Array.from(
    new Set(input.entries.map((entry) => entry.itemId).filter(Boolean)),
  );
  if (requestedItemIds.length === 0) return { ok: true };

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select(
      "id, template_id, custom_template_id, workspace_template_id, dossier_approved_at, establishment_id, scheduled_visit_id",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!sess) return { ok: false, error: "Rascunho não encontrado." };

  const estOwned = await assertEstablishmentOwned(
    supabase,
    auth.workspaceOwnerId,
    sess.establishment_id as string,
  );
  if (!estOwned) return { ok: false, error: "Sem permissão para este rascunho." };

  if (sess.dossier_approved_at) {
    return {
      ok: false,
      error: "Dossiê já aprovado: não é possível alterar respostas (registro imutável, FR70).",
    };
  }

  const sessionOrigin: "global" | "custom" | "workspace" = sess.workspace_template_id
    ? "workspace"
    : sess.custom_template_id
      ? "custom"
      : "global";
  if (sessionOrigin !== itemResponseSource) {
    return { ok: false, error: "Tipo de item incompatível com a sessão." };
  }

  const itemColumn =
    itemResponseSource === "global"
      ? "template_item_id"
      : itemResponseSource === "custom"
        ? "custom_item_id"
        : "workspace_item_id";

  const structureIds = new Set<string>();
  const validItemIds = new Set<string>();
  if (itemResponseSource === "global") {
    const { data: rows } = await supabase
      .from("checklist_template_items")
      .select("id, is_structure_only")
      .in("id", requestedItemIds);
    for (const row of rows ?? []) {
      const id = String(row.id);
      if (Boolean((row as { is_structure_only?: boolean }).is_structure_only)) {
        structureIds.add(id);
      } else {
        validItemIds.add(id);
      }
    }
  } else if (itemResponseSource === "custom") {
    const { data: rows } = await supabase
      .from("checklist_custom_items")
      .select("id, custom_section_id, is_structure_only")
      .in("id", requestedItemIds);
    const sectionIds = Array.from(
      new Set((rows ?? []).map((row) => String(row.custom_section_id))),
    );
    const { data: secRows } = await supabase
      .from("checklist_custom_sections")
      .select("id, custom_template_id")
      .in("id", sectionIds);
    const sectionTemplateMap = new Map<string, string>();
    for (const sec of secRows ?? []) {
      sectionTemplateMap.set(String(sec.id), String(sec.custom_template_id));
    }
    for (const row of rows ?? []) {
      const sectionTemplateId = sectionTemplateMap.get(String(row.custom_section_id));
      if (!sectionTemplateId || sectionTemplateId !== sess.custom_template_id) continue;
      const id = String(row.id);
      if (Boolean((row as { is_structure_only?: boolean }).is_structure_only)) {
        structureIds.add(id);
      } else {
        validItemIds.add(id);
      }
    }
  } else {
    const { data: rows } = await supabase
      .from("checklist_workspace_items")
      .select("id, workspace_section_id, is_structure_only")
      .in("id", requestedItemIds);
    const sectionIds = Array.from(
      new Set((rows ?? []).map((row) => String(row.workspace_section_id))),
    );
    const { data: secRows } = await supabase
      .from("checklist_workspace_sections")
      .select("id, workspace_template_id")
      .in("id", sectionIds);
    const sectionTemplateMap = new Map<string, string>();
    for (const sec of secRows ?? []) {
      sectionTemplateMap.set(String(sec.id), String(sec.workspace_template_id));
    }
    for (const row of rows ?? []) {
      const sectionTemplateId = sectionTemplateMap.get(String(row.workspace_section_id));
      if (!sectionTemplateId || sectionTemplateId !== sess.workspace_template_id) continue;
      const id = String(row.id);
      if (Boolean((row as { is_structure_only?: boolean }).is_structure_only)) {
        structureIds.add(id);
      } else {
        validItemIds.add(id);
      }
    }
  }

  const entries = input.entries.filter((e) => !structureIds.has(e.itemId));
  if (entries.length === 0) {
    return { ok: true };
  }

  const itemIds = Array.from(new Set(entries.map((entry) => entry.itemId).filter(Boolean)));

  for (const itemId of itemIds) {
    if (!validItemIds.has(itemId)) {
      return { ok: false, error: "Item inválido para este modelo." };
    }
  }

  const { data: existingRows } = await supabase
    .from("checklist_fill_item_responses")
    .select("id, note, item_annotation, valid_until, template_item_id, custom_item_id, workspace_item_id")
    .eq("session_id", sessionId)
    .in(itemColumn, itemIds);

  const existingByItemId = new Map<
    string,
    {
      id: string;
      note: string | null;
      item_annotation: string | null;
      valid_until: string | null;
    }
  >();
  for (const row of existingRows ?? []) {
    const key =
      (row.template_item_id as string | null) ??
      (row.custom_item_id as string | null) ??
      (row.workspace_item_id as string | null);
    if (!key) continue;
    existingByItemId.set(key, {
      id: String(row.id),
      note: (row.note as string | null) ?? null,
      item_annotation: (row.item_annotation as string | null) ?? null,
      valid_until: (row.valid_until as string | null) ?? null,
    });
  }

  // Classify entries into batches to avoid N+1 round-trips
  const deleteIds: string[] = [];
  const updateOps: Array<{ id: string; payload: Record<string, unknown> }> = [];
  const insertRows: Array<Record<string, unknown>> = [];

  for (const entry of entries) {
    const itemId = entry.itemId;
    const existing = existingByItemId.get(itemId);
    const normalizedValidUntil = (entry.validUntil ?? "").trim() || null;
    const noteTrim = (entry.note ?? "").trim();
    let annotationTrim = (entry.annotation ?? "").trim();
    if (annotationTrim.length > MAX_CHECKLIST_ITEM_ANNOTATION_CHARS) {
      annotationTrim = annotationTrim.slice(0, MAX_CHECKLIST_ITEM_ANNOTATION_CHARS);
    }

    if (entry.outcome === null) {
      if (existing) deleteIds.push(existing.id);
      continue;
    }

    if (existing) {
      const payload = buildResponseUpdatePayload({
        outcome: entry.outcome,
        noteTrim,
        annotationTrim,
        validUntil: normalizedValidUntil,
        existingNote: existing.note,
        existingAnnotation: existing.item_annotation,
        existingValidUntil: existing.valid_until,
        persistMode,
      });
      updateOps.push({ id: existing.id, payload });
      continue;
    }

    const insertPayload: Record<string, unknown> = {
      session_id: sessionId,
      template_item_id: null,
      custom_item_id: null,
      workspace_item_id: null,
      outcome: entry.outcome,
      note: noteTrim.length > 0 ? noteTrim : null,
      item_annotation: annotationTrim.length > 0 ? annotationTrim : null,
      valid_until: normalizedValidUntil,
    };
    insertPayload[itemColumn] = itemId;
    insertRows.push(insertPayload);
  }

  /**
   * INSERT com recuperação de corrida (23505): se outro save concorrente
   * (blur + autosave, outro separador/dispositivo) inseriu a mesma resposta
   * entre o SELECT e o INSERT, converte as linhas em conflito para UPDATE
   * em vez de devolver "Não foi possível salvar." ao utilizador.
   */
  const runInsertsWithConflictRecovery = async (): Promise<{ error: unknown }> => {
    if (insertRows.length === 0) return { error: null };
    const { error } = await supabase
      .from("checklist_fill_item_responses")
      .insert(insertRows);
    if (!error || error.code !== "23505") return { error };

    const insertItemIds = insertRows.map((row) => String(row[itemColumn]));
    const { data: raceRows, error: raceSelErr } = await supabase
      .from("checklist_fill_item_responses")
      .select("id, note, item_annotation, valid_until, template_item_id, custom_item_id, workspace_item_id")
      .eq("session_id", sessionId)
      .in(itemColumn, insertItemIds);
    if (raceSelErr) return { error: raceSelErr };

    const raceByItemId = new Map<
      string,
      { id: string; note: string | null; item_annotation: string | null; valid_until: string | null }
    >();
    for (const row of raceRows ?? []) {
      const key =
        (row.template_item_id as string | null) ??
        (row.custom_item_id as string | null) ??
        (row.workspace_item_id as string | null);
      if (!key) continue;
      raceByItemId.set(key, {
        id: String(row.id),
        note: (row.note as string | null) ?? null,
        item_annotation: (row.item_annotation as string | null) ?? null,
        valid_until: (row.valid_until as string | null) ?? null,
      });
    }

    for (const row of insertRows) {
      const itemId = String(row[itemColumn]);
      const existing = raceByItemId.get(itemId);
      if (!existing) {
        const { error: retryInsErr } = await supabase
          .from("checklist_fill_item_responses")
          .insert(row);
        if (retryInsErr && retryInsErr.code !== "23505") return { error: retryInsErr };
        continue;
      }
      const payload = buildResponseUpdatePayload({
        outcome: row.outcome as ChecklistFillOutcome,
        noteTrim: (row.note as string | null) ?? "",
        annotationTrim: (row.item_annotation as string | null) ?? "",
        validUntil: (row.valid_until as string | null) ?? null,
        existingNote: existing.note,
        existingAnnotation: existing.item_annotation,
        existingValidUntil: existing.valid_until,
        persistMode,
      });
      const { error: raceUpdErr } = await supabase
        .from("checklist_fill_item_responses")
        .update(payload)
        .eq("id", existing.id);
      if (raceUpdErr) return { error: raceUpdErr };
    }
    return { error: null };
  };

  // Em sequência (não Promise.all): vários UPDATEs em paralelo disputavam o mesmo
  // lock em checklist_fill_sessions via trigger touch_session.
  if (deleteIds.length > 0) {
    const { error: delErr } = await supabase
      .from("checklist_fill_item_responses")
      .delete()
      .in("id", deleteIds);
    if (delErr) {
      console.error(
        "[saveFillResponsesBatch] DB error",
        JSON.stringify({
          sessionId,
          ops: [`DELETE ids=[${deleteIds.join(",")}]`],
          error: delErr,
        }),
      );
      return { ok: false, error: "Não foi possível salvar." };
    }
  }

  const insertErrResult = await runInsertsWithConflictRecovery();
  if (insertErrResult.error) {
    console.error(
      "[saveFillResponsesBatch] DB error",
      JSON.stringify({
        sessionId,
        ops: insertRows.length > 0 ? [`INSERT rows=${insertRows.length}`] : [],
        error: insertErrResult.error,
      }),
    );
    return { ok: false, error: "Não foi possível salvar." };
  }

  for (const { id, payload } of updateOps) {
    const { error: updErr } = await supabase
      .from("checklist_fill_item_responses")
      .update(payload)
      .eq("id", id);
    if (updErr) {
      console.error(
        "[saveFillResponsesBatch] DB error",
        JSON.stringify({
          sessionId,
          ops: [`UPDATE id=${id}`],
          error: updErr,
        }),
      );
      return { ok: false, error: "Não foi possível salvar." };
    }
  }

  if (withRevalidate) {
    revalidatePath(`/checklists/preencher/${sessionId}`);
    const visitId = sess.scheduled_visit_id;
    if (visitId) {
      const vid = String(visitId);
      revalidatePath(`/visitas/${vid}`);
      revalidatePath(`/visitas/${vid}/iniciar`);
    }
  }

  revalidateTag(checklistValidityAlertsCacheTag(auth.workspaceOwnerId), "max");
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
  workspaceTemplateId?: string | null;
}): Promise<ExistingOpenSession | null> {
  const supabase = await createClient();
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) return null;

  // Validar posse do estabelecimento (assertEstablishmentOwned como primeira verificação).
  const ok = await assertEstablishmentOwned(
    supabase,
    auth.workspaceOwnerId,
    input.establishmentId,
  );
  if (!ok) return null;

  const { establishmentId, templateId, customTemplateId } = input;
  const workspaceTemplateId = input.workspaceTemplateId ?? null;

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
  } else if (workspaceTemplateId) {
    query = query.eq("workspace_template_id", workspaceTemplateId);
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
      const isMine = sess.user_id === auth.userId;
      let startedByName: string | null = null;
      if (!isMine) {
        // Busca pelo team_members do workspace (RLS permite leitura via owner_user_id).
        // O member_user_id liga o registro de membro ao auth.uid() de quem iniciou a sessão.
        const { data: member } = await supabase
          .from("team_members")
          .select("full_name")
          .eq("owner_user_id", auth.workspaceOwnerId)
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
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) return { ok: false, error: "not_authenticated" };
  const { templateId, establishmentId, areaIds } = input;

  if (!templateId || !establishmentId) {
    return { ok: false, error: "missing_fields" };
  }

  const owned = await assertEstablishmentOwned(supabase, auth.workspaceOwnerId, establishmentId);
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
        user_id: auth.userId,
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

  const first = sessionIds[0];
  if (!first) return { ok: false, error: "session_create_failed" };
  return {
    ok: true,
    sessionIds,
    firstSessionId: first,
    totalSessions: sessionIds.length,
  };
}

/**
 * Cria sessão(ões) a partir de um modelo personalizado (cópia por estabelecimento).
 */
export async function startCustomTemplateFillBatch(input: {
  customTemplateId: string;
  areaIds: string[];
}): Promise<
  | { ok: true; sessionIds: string[]; firstSessionId: string; totalSessions: number }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) return { ok: false, error: "not_authenticated" };

  const { data: ct } = await supabase
    .from("checklist_custom_templates")
    .select("id, establishment_id, archived_at")
    .eq("id", input.customTemplateId)
    .maybeSingle();
  if (!ct || ct.archived_at) return { ok: false, error: "template_not_found" };

  const establishmentId = String(ct.establishment_id);
  const owned = await assertEstablishmentOwned(supabase, auth.workspaceOwnerId, establishmentId);
  if (!owned) return { ok: false, error: "forbidden" };

  const resolvedAreas: (string | null)[] = input.areaIds.length > 0 ? input.areaIds : [null];
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
        user_id: auth.userId,
        establishment_id: establishmentId,
        template_id: null,
        custom_template_id: input.customTemplateId,
        area_id: areaId,
      })
      .select("id")
      .single();
    if (error || !session) return { ok: false, error: "session_create_failed" };
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

/** Resultado de «Usar template» no catálogo: conflito com rascunho existente ou sessão criada. */
export type CatalogTemplateFillPrepareResult =
  | { ok: true; kind: "conflict"; existing: ExistingOpenSession }
  | {
      ok: true;
      kind: "started";
      sessionIds: string[];
      firstSessionId: string;
      totalSessions: number;
    }
  | { ok: false; error: string };

/**
 * Uma única chamada ao servidor para o fluxo «Usar template» (sistema): verifica sessão
 * em aberto com respostas e, se não houver conflito, cria a(s) sessão(ões).
 */
export async function startSystemTemplateFillOrGetConflict(input: {
  templateId: string;
  establishmentId: string;
  areaIds: string[];
}): Promise<CatalogTemplateFillPrepareResult> {
  const existing = await checkExistingOpenFillSession({
    establishmentId: input.establishmentId,
    templateId: input.templateId,
    customTemplateId: null,
  });
  if (existing) {
    return { ok: true, kind: "conflict", existing };
  }
  const started = await startChecklistFillBatch(input);
  if (!started.ok) {
    return { ok: false, error: started.error };
  }
  return {
    ok: true,
    kind: "started",
    sessionIds: started.sessionIds,
    firstSessionId: started.firstSessionId,
    totalSessions: started.totalSessions,
  };
}

/**
 * Uma única chamada ao servidor para o fluxo «Usar template» (modelo da equipe).
 */
export async function startWorkspaceTemplateFillOrGetConflict(input: {
  workspaceTemplateId: string;
  establishmentId: string;
  areaIds: string[];
}): Promise<CatalogTemplateFillPrepareResult> {
  const existing = await checkExistingOpenFillSession({
    establishmentId: input.establishmentId,
    templateId: null,
    customTemplateId: null,
    workspaceTemplateId: input.workspaceTemplateId,
  });
  if (existing) {
    return { ok: true, kind: "conflict", existing };
  }
  const started = await startWorkspaceTemplateFillBatch(input);
  if (!started.ok) {
    return { ok: false, error: started.error };
  }
  return {
    ok: true,
    kind: "started",
    sessionIds: started.sessionIds,
    firstSessionId: started.firstSessionId,
    totalSessions: started.totalSessions,
  };
}

/**
 * Uma única chamada ao servidor para o fluxo «Usar template» (modelo personalizado).
 */
export async function startCustomTemplateFillOrGetConflict(input: {
  customTemplateId: string;
  areaIds: string[];
}): Promise<CatalogTemplateFillPrepareResult> {
  const { data: ct } = await (await createClient())
    .from("checklist_custom_templates")
    .select("establishment_id, archived_at")
    .eq("id", input.customTemplateId)
    .maybeSingle();
  if (!ct || ct.archived_at) return { ok: false, error: "template_not_found" };

  const establishmentId = String(ct.establishment_id);
  const existing = await checkExistingOpenFillSession({
    establishmentId,
    templateId: null,
    customTemplateId: input.customTemplateId,
  });
  if (existing) {
    return { ok: true, kind: "conflict", existing };
  }
  const started = await startCustomTemplateFillBatch(input);
  if (!started.ok) {
    return { ok: false, error: started.error };
  }
  return {
    ok: true,
    kind: "started",
    sessionIds: started.sessionIds,
    firstSessionId: started.firstSessionId,
    totalSessions: started.totalSessions,
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
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) return { ok: false, error: auth.error };

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
    auth.workspaceOwnerId,
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
  | { ok: true; approvedAt: string; documentHash: string | null; approvedClientIp: string | null }
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

/**
 * Carregamento mínimo para aprovação — evita signed URLs de fotos e histórico PDF.
 * A aprovação só precisa de: sessão (status + FK), template (para validar) e respostas.
 */
async function loadFillSessionBundleForApproval(sessionId: string): Promise<{
  session: ChecklistFillSessionRow & { custom_template_id?: string | null; workspace_template_id?: string | null };
  template: ChecklistTemplateWithSections;
  responses: FillResponsesMap;
} | null> {
  const { supabase, user } = await getServerContext();
  if (!user) return null;

  const { data: session } = await supabase
    .from("checklist_fill_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;

  const row = session as ChecklistFillSessionRow & {
    custom_template_id?: string | null;
    workspace_template_id?: string | null;
  };

  const templatePromise: Promise<ChecklistTemplateWithSections | null> =
    row.workspace_template_id
      ? loadWorkspaceTemplateBundle(row.workspace_template_id)
      : row.custom_template_id
        ? loadCustomTemplateUnified(row.custom_template_id)
        : row.template_id
          ? loadChecklistTemplateBundleByIdDirect(supabase, row.template_id)
          : Promise.resolve(null);

  const [template, respResult] = await Promise.all([
    templatePromise,
    supabase
      .from("checklist_fill_item_responses")
      .select(
        "template_item_id, custom_item_id, workspace_item_id, outcome, note, item_annotation, valid_until",
      )
      .eq("session_id", sessionId),
  ]);

  if (!template) return null;

  const responses: FillResponsesMap = {};
  for (const raw of respResult.data ?? []) {
    const r = raw as ChecklistFillItemResponseRow & { workspace_item_id?: string | null };
    const key = r.template_item_id ?? r.custom_item_id ?? r.workspace_item_id;
    if (!key) continue;
    responses[key] = {
      outcome: r.outcome,
      note: r.note,
      annotation: r.item_annotation ?? null,
      validUntil: r.valid_until ?? null,
    };
  }

  return { session: row, template, responses };
}

/** Aprova o dossiê: valida todo o modelo, regista data e bloqueia edições (FR23); visita ligada → concluída. */
export async function approveChecklistFillDossierAction(
  sessionId: string,
  signatures?: {
    professional: string;
    client: string;
    clientSignerName?: string;
    deviceIp?: string | null;
  } | null,
): Promise<ApproveDossierResult> {
  const _t0 = Date.now();

  // Carrega bundle leve + configuração de assinatura em paralelo (evita signed URLs de fotos)
  const [bundle, clientSignatureRequired] = await Promise.all([
    loadFillSessionBundleForApproval(sessionId),
    getClientSignatureRequiredAction(),
  ]);
  const _tBundle = Date.now();
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
  const auth = await requireWorkspaceAuthContext(supabase);
  if (!auth.ok) return { ok: false, error: auth.error };
  const estOwned = await assertEstablishmentOwned(
    supabase,
    auth.workspaceOwnerId,
    bundle.session.establishment_id as string,
  );
  if (!estOwned) return { ok: false, error: "Sem permissão para aprovar este dossiê." };
  const _tAuth = Date.now();

  const approvedAt = new Date().toISOString();

  const MAX_SIG_BYTES = MAX_SESSION_SIGNATURE_DATA_URL_CHARS;
  const validateSig = (url: string | undefined | null): string | null => {
    if (!url) return null;
    if (!url.startsWith("data:image/")) return null;
    if (url.length > MAX_SIG_BYTES) return null;
    return url;
  };

  const hasSignaturePayload = Boolean(
    signatures?.professional || signatures?.client || signatures?.clientSignerName,
  );
  let professionalSig = hasSignaturePayload ? validateSig(signatures?.professional) : null;
  const clientSig = hasSignaturePayload ? validateSig(signatures?.client) : null;
  const clientSignerNameForSave =
    (signatures?.clientSignerName ?? "").trim().slice(0, 200) || null;

  if (!professionalSig) {
    const sessionUserId = String(bundle.session.user_id ?? "");
    if (sessionUserId) {
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("signature_storage_path")
        .eq("user_id", sessionUserId)
        .maybeSingle();
      const profilePath =
        (creatorProfile as { signature_storage_path?: string | null } | null)
          ?.signature_storage_path ?? null;
      professionalSig = validateSig(
        await getProfileSignatureDataUrl(supabase, profilePath),
      );
    }
  }

  if (!professionalSig) {
    return { ok: false, error: "A assinatura da profissional é obrigatória para aprovar o dossiê." };
  }
  if (clientSignatureRequired) {
    if (!clientSig) {
      return { ok: false, error: "A assinatura do cliente é obrigatória para aprovar o dossiê." };
    }
    if (!clientSignerNameForSave) {
      return { ok: false, error: "Informe o nome de quem assina pelo cliente." };
    }
  }

  // SHA-256: mesmos valores que serão persistidos (evita divergência hash vs BD).
  // Busca profiles e team_members em paralelo para evitar waterfall serial.
  let documentHash: string | null = null;
  try {
    const [{ data: profProfile }, { data: profMember }] = await Promise.all([
      supabase.from("profiles").select("full_name, crn").eq("user_id", auth.userId).maybeSingle(),
      supabase
        .from("team_members")
        .select("full_name, crn")
        .eq("member_user_id", auth.userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    let profName = String(profProfile?.full_name ?? "").trim();
    let profCrn = String(profProfile?.crn ?? "").trim();
    if (!profName) profName = String(profMember?.full_name ?? "").trim();
    if (!profCrn) profCrn = String(profMember?.crn ?? "").trim();

    const _tProfiles = Date.now();
    console.log(`[approveChecklist perf] profiles=${_tProfiles - _tAuth}ms | session=${sessionId}`);
    documentHash = generateDocumentHash({
      sessionId,
      approvedAtIso: approvedAt,
      professionalName: profName,
      crn: profCrn,
      clientSignerName: clientSignerNameForSave,
      professionalSignatureDataUrl: professionalSig,
      clientSignatureDataUrl: clientSig,
    });
  } catch (e) {
    console.error("[approveChecklistFillDossierAction] Erro ao gerar document_hash:", e);
    documentHash = null;
  }

  const sigPatch: Record<string, string | null> = {};
  if (professionalSig) sigPatch.professional_signature_data_url = professionalSig;
  if (clientSig) sigPatch.client_signature_data_url = clientSig;
  if (clientSignerNameForSave) sigPatch.client_signer_name = clientSignerNameForSave;

  const headersList = await headers();
  const approvedClientIp = resolveApprovalClientIp(
    headersList,
    signatures?.deviceIp ?? null,
  );

  // ── Aprovação + assinaturas + hash num único update (evita aprovação sem hash no BD / race com refresh)
  const approvalPayload: Record<string, unknown> = {
    dossier_approved_at: approvedAt,
    dossier_approved_client_ip: approvedClientIp,
    ...sigPatch,
    document_hash: documentHash,
  };

  const { data: updated, error } = await supabase
    .from("checklist_fill_sessions")
    .update(approvalPayload)
    .eq("id", sessionId)
    .is("dossier_approved_at", null)
    .select("dossier_approved_at, document_hash, dossier_approved_client_ip")
    .maybeSingle();

  let finalUpdated = updated;
  let finalDocumentHash = documentHash;
  let finalApprovedClientIp: string | null = approvedClientIp;

  if (error) {
    const errText = `${(error as { message?: string }).message ?? ""} ${JSON.stringify(error)}`.toLowerCase();
    const missingColumn =
      errText.includes("42703") ||
      (errText.includes("column") && errText.includes("does not exist"));

    if (missingColumn) {
      const retryPayload = { ...approvalPayload };
      if (errText.includes("document_hash")) {
        delete retryPayload.document_hash;
        finalDocumentHash = null;
      }
      if (errText.includes("dossier_approved_client_ip")) {
        delete retryPayload.dossier_approved_client_ip;
        finalApprovedClientIp = null;
      }

      const retry = await supabase
        .from("checklist_fill_sessions")
        .update(retryPayload)
        .eq("id", sessionId)
        .is("dossier_approved_at", null)
        .select("dossier_approved_at, document_hash, dossier_approved_client_ip")
        .maybeSingle();

      if (!retry.error && retry.data?.dossier_approved_at) {
        finalUpdated = retry.data;
        if (errText.includes("document_hash")) {
          console.warn(
            "[approveChecklistFillDossierAction] Coluna document_hash ausente no BD — aprovação concluída sem persistir hash. Aplique migration 20260724100002.",
          );
        }
        if (errText.includes("dossier_approved_client_ip")) {
          console.warn(
            "[approveChecklistFillDossierAction] Coluna dossier_approved_client_ip ausente no BD — aprovação concluída sem persistir IP. Aplique migration 20260820120000.",
          );
        }
      }
    }
  }

  if (error && !finalUpdated?.dossier_approved_at) {
    console.error("[approveChecklistFillDossierAction] Falha ao aprovar sessão:", error);
    return { ok: false, error: "Não foi possível aprovar o dossiê." };
  }

  if (!finalUpdated?.dossier_approved_at) {
    console.error("[approveChecklistFillDossierAction] Falha ao aprovar sessão:", error);
    return { ok: false, error: "Não foi possível aprovar o dossiê." };
  }

  const persistedHash =
    (finalUpdated as { document_hash?: string | null }).document_hash ?? finalDocumentHash;
  const persistedClientIp =
    (finalUpdated as { dossier_approved_client_ip?: string | null }).dossier_approved_client_ip
    ?? finalApprovedClientIp;
  const _tUpdate = Date.now();

  // ── 2. Pontuação (best-effort) ──────────────────────────────────────────
  // Calcular e persistir a pontuação (best-effort: não impede a aprovação se falhar)
  await supabase.rpc("calculate_and_store_session_score", {
    p_session_id: sessionId,
  });
  const _tScore = Date.now();

  const at = String(finalUpdated.dossier_approved_at);

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

  console.log(
    `[approveChecklist perf] session=${sessionId} responses=${Object.keys(bundle.responses).length}` +
      ` | bundle+cfg=${_tBundle - _t0}ms` +
      ` | auth+ownership=${_tAuth - _tBundle}ms` +
      ` | update=${_tUpdate - _tAuth}ms` +
      ` | score_rpc=${_tScore - _tUpdate}ms` +
      ` | TOTAL=${_tScore - _t0}ms`,
  );

  return {
    ok: true,
    approvedAt: at,
    documentHash: persistedHash,
    approvedClientIp: persistedClientIp,
  };
}

