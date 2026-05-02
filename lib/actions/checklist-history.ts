"use server";

import { createClient } from "@/lib/supabase/server";
import type { ChecklistFillPdfExportRow } from "@/lib/types/checklist-fill-pdf";
import type { ChecklistFillSessionReopenEventRow } from "@/lib/types/checklist-reopen";
import type { EstablishmentType } from "@/lib/types/establishments";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

/* ─── Tipos exportados ───────────────────────────────────────────────────── */

export type ChecklistSessionSummary = {
  id: string;
  /** Número sequencial do checklist dentro deste cliente (1-based, por ordem de criação). */
  seq_number: number;
  started_by_label: string;
  created_at: string;
  updated_at: string;
  dossier_approved_at: string | null;
  status: "em_andamento" | "aprovado";
  template_name: string;
  /** Origem do modelo: oficial (system), personalizado por estabelecimento (custom) ou da equipe (workspace). */
  template_origin: "system" | "custom" | "workspace";
  portaria_ref: string | null;
  establishment_id: string;
  establishment_name: string;
  establishment_type: EstablishmentType;
  /** Nome da área avaliada (null quando não vinculado a área). */
  area_id: string | null;
  area_name: string | null;
  conformant_count: number;
  nc_count: number;
  na_count: number;
  pending_count: number;
  total_items: number;
  /** Score de conformidade (0-100), disponível após aprovação do dossiê. */
  score_percentage: number | null;
  score_points_earned: number | null;
  score_points_total: number | null;
  latestPdfExport?: ChecklistFillPdfExportRow | null;
  /** PDFs `ready` da sessão (histórico de versões / obsoletos). */
  pdf_export_history?: ChecklistFillPdfExportRow[];
  /** Reaberturas após aprovação (auditoria). */
  reopen_events?: ChecklistFillSessionReopenEventRow[];
};

export type NcItemDetail = {
  item_id: string;
  description: string;
  is_required: boolean;
  note: string | null;
  item_annotation: string | null;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

async function assertClientOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerUserId: string,
  clientId: string,
): Promise<boolean> {
  const { data: cl } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", clientId)
    .maybeSingle();
  return Boolean(cl && cl.owner_user_id === ownerUserId);
}

function mapPdfRow(raw: Record<string, unknown>): ChecklistFillPdfExportRow {
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    session_id: String(raw.session_id),
    status: raw.status as ChecklistFillPdfExportRow["status"],
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
    storage_path: (raw.storage_path as string | null) ?? null,
    error_message: (raw.error_message as string | null) ?? null,
    version_number:
      typeof raw.version_number === "number"
        ? raw.version_number
        : Number(raw.version_number) || 1,
    superseded_at: (raw.superseded_at as string | null) ?? null,
    superseded_by_version:
      raw.superseded_by_version === null || raw.superseded_by_version === undefined
        ? null
        : Number(raw.superseded_by_version),
  };
}

/* ─── E.1: loadChecklistSessionsForClient ───────────────────────────────── */

/**
 * Carrega o histórico de checklists de todos os estabelecimentos de um cliente,
 * com métricas calculadas (conforme / NC / NA / pendente).
 * Valida que o usuário autenticado é owner do cliente antes de qualquer query.
 *
 * PERFORMANCE: queries independentes rodam em paralelo via Promise.all,
 * reduzindo de ~14 roundtrips sequenciais para 4 rounds paralelos.
 */
export async function loadChecklistSessionsForClient(input: {
  clientId: string;
  establishmentId?: string | null;
  /** Filtrar por área específica do estabelecimento. */
  areaId?: string | null;
  status?: "em_andamento" | "aprovado" | null;
  limit?: number;
  offset?: number;
}): Promise<{ rows: ChecklistSessionSummary[]; total: number }> {
  const empty = { rows: [], total: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  // ── Round 2: validação de posse + perfil próprio em paralelo ─────────────
  const [owned, ownProfileResult] = await Promise.all([
    assertClientOwned(supabase, workspaceOwnerId, input.clientId),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!owned) return empty;
  const ownUserLabel =
    String(ownProfileResult.data?.full_name ?? "").trim() || "Você";

  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;

  // ── Round 3: estabelecimentos do cliente ──────────────────────────────────
  let estQuery = supabase
    .from("establishments")
    .select("id, name, establishment_type")
    .eq("client_id", input.clientId);
  if (input.establishmentId) {
    estQuery = estQuery.eq("id", input.establishmentId);
  }

  const { data: estRows } = await estQuery;
  if (!estRows || estRows.length === 0) return empty;

  const estMap = new Map<
    string,
    { name: string; establishment_type: EstablishmentType }
  >();
  for (const e of estRows) {
    estMap.set(e.id, {
      name: e.name,
      establishment_type: e.establishment_type as EstablishmentType,
    });
  }
  const estIds = [...estMap.keys()];

  // ── Round 4: sessões paginadas ────────────────────────────────────────────
  let sessionQuery = supabase
    .from("checklist_fill_sessions")
    .select(
      "id, user_id, establishment_id, template_id, custom_template_id, workspace_template_id, dossier_approved_at, area_id, score_percentage, score_points_earned, score_points_total, created_at, updated_at",
      { count: "exact" },
    )
    .in("establishment_id", estIds)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (input.status === "aprovado") {
    sessionQuery = sessionQuery.not("dossier_approved_at", "is", null);
  } else if (input.status === "em_andamento") {
    sessionQuery = sessionQuery.is("dossier_approved_at", null);
  }
  if (input.areaId) {
    sessionQuery = sessionQuery.eq("area_id", input.areaId);
  }

  const { data: sessions, count: totalCount } = await sessionQuery;
  if (!sessions || sessions.length === 0) return empty;

  // Extrai IDs necessários para os lookups paralelos
  const sessionIds = sessions.map((s) => s.id);
  const sessionUserIds = [
    ...new Set(sessions.map((s) => String(s.user_id)).filter(Boolean)),
  ];
  const templateIds = [
    ...new Set(sessions.map((s) => s.template_id).filter(Boolean)),
  ] as string[];
  const customTemplateIds = [
    ...new Set(sessions.map((s) => s.custom_template_id).filter(Boolean)),
  ] as string[];
  const workspaceTemplateIds = [
    ...new Set(
      sessions
        .map((s) => (s as Record<string, unknown>).workspace_template_id as string | null)
        .filter(Boolean),
    ),
  ] as string[];
  const areaIds = [
    ...new Set(
      sessions
        .map((s) => (s as Record<string, unknown>).area_id as string | null)
        .filter(Boolean),
    ),
  ] as string[];

  // ── Round 5: todos os lookups em paralelo ─────────────────────────────────
  const [
    profilesResult,
    teamMembersResult,
    allSessionIdsResult,
    responsesResult,
    templateNamesResult,
    customTemplateNamesResult,
    workspaceTemplateNamesResult,
    areaNamesResult,
    pdfExportsResult,
    reopenEventsResult,
    templateSectionsResult,
    customSectionsResult,
    workspaceSectionsResult,
  ] = await Promise.all([
    // Nomes de quem iniciou a sessão (profiles)
    sessionUserIds.length > 0
      ? supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", sessionUserIds)
      : Promise.resolve({ data: [] as { user_id: string; full_name: string | null }[] }),

    // Nomes de membros da equipe
    sessionUserIds.length > 0
      ? supabase
          .from("team_members")
          .select("member_user_id, full_name")
          .eq("owner_user_id", workspaceOwnerId)
          .in("member_user_id", sessionUserIds)
      : Promise.resolve({ data: [] as { member_user_id: string | null; full_name: string | null }[] }),

    // Numeração sequencial (ordenada por created_at)
    supabase
      .from("checklist_fill_sessions")
      .select("id")
      .in("establishment_id", estIds)
      .order("created_at", { ascending: true }),

    // Contagem de respostas por sessão
    supabase
      .from("checklist_fill_item_responses")
      .select("session_id, outcome")
      .in("session_id", sessionIds),

    // Nomes de templates globais (sistema)
    templateIds.length > 0
      ? supabase
          .from("checklist_templates")
          .select("id, name, portaria_ref")
          .in("id", templateIds)
      : Promise.resolve({ data: [] as { id: string; name: string; portaria_ref: string }[] }),

    // Nomes de templates personalizados
    customTemplateIds.length > 0
      ? supabase
          .from("checklist_custom_templates")
          .select("id, name")
          .in("id", customTemplateIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),

    // Nomes de templates da equipe (workspace)
    workspaceTemplateIds.length > 0
      ? supabase
          .from("checklist_workspace_templates")
          .select("id, name")
          .in("id", workspaceTemplateIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),

    // Nomes das áreas
    areaIds.length > 0
      ? supabase
          .from("establishment_areas")
          .select("id, name")
          .in("id", areaIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),

    // Exports de PDF
    supabase
      .from("checklist_fill_pdf_exports")
      .select(
        "id, user_id, session_id, status, created_at, updated_at, storage_path, error_message, version_number, superseded_at, superseded_by_version",
      )
      .in("session_id", sessionIds)
      .order("version_number", { ascending: false })
      .order("created_at", { ascending: false }),

    // Eventos de reabertura
    supabase
      .from("checklist_fill_session_reopen_events")
      .select(
        "id, session_id, reopened_by_label, reopened_by_role, justification, previous_approved_at, created_at",
      )
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false }),

    // Seções de templates globais (para contar itens)
    templateIds.length > 0
      ? supabase
          .from("checklist_template_sections")
          .select("id, template_id")
          .in("template_id", templateIds)
      : Promise.resolve({ data: [] as { id: string; template_id: string }[] }),

    // Seções de templates personalizados
    customTemplateIds.length > 0
      ? supabase
          .from("checklist_custom_sections")
          .select("id, custom_template_id")
          .in("custom_template_id", customTemplateIds)
      : Promise.resolve({ data: [] as { id: string; custom_template_id: unknown }[] }),

    // Seções de templates workspace
    workspaceTemplateIds.length > 0
      ? supabase
          .from("checklist_workspace_sections")
          .select("id, workspace_template_id")
          .in("workspace_template_id", workspaceTemplateIds)
      : Promise.resolve({ data: [] as { id: string; workspace_template_id: unknown }[] }),
  ]);

  // Mapas de nomes de quem iniciou
  const profileNameByUserId = new Map<string, string>();
  for (const profile of profilesResult.data ?? []) {
    const fullName = String(profile.full_name ?? "").trim();
    if (fullName.length > 0) {
      profileNameByUserId.set(String(profile.user_id), fullName);
    }
  }

  const teamMemberNameByUserId = new Map<string, string>();
  for (const member of teamMembersResult.data ?? []) {
    const memberUserId = String(member.member_user_id ?? "").trim();
    const memberName = String(member.full_name ?? "").trim();
    if (memberUserId.length > 0 && memberName.length > 0) {
      teamMemberNameByUserId.set(memberUserId, memberName);
    }
  }

  // Mapa de numeração sequencial
  const seqMap = new Map<string, number>();
  for (let i = 0; i < (allSessionIdsResult.data ?? []).length; i++) {
    seqMap.set(allSessionIdsResult.data![i].id, i + 1);
  }

  // Contagem de respostas por sessão
  type OutcomeCounts = { conforme: number; nc: number; na: number };
  const countsBySession = new Map<string, OutcomeCounts>();
  for (const r of responsesResult.data ?? []) {
    const sid = r.session_id;
    const cur = countsBySession.get(sid) ?? { conforme: 0, nc: 0, na: 0 };
    if (r.outcome === "conforme") cur.conforme++;
    else if (r.outcome === "nc") cur.nc++;
    else if (r.outcome === "na") cur.na++;
    countsBySession.set(sid, cur);
  }

  // Mapas de nomes de templates
  const templateNameMap = new Map<string, { name: string; portaria_ref: string }>();
  for (const t of templateNamesResult.data ?? []) {
    templateNameMap.set(t.id, { name: t.name, portaria_ref: t.portaria_ref });
  }

  const customTemplateNameMap = new Map<string, string>();
  for (const ct of customTemplateNamesResult.data ?? []) {
    customTemplateNameMap.set(ct.id, ct.name);
  }

  const workspaceTemplateNameMap = new Map<string, string>();
  for (const wt of workspaceTemplateNamesResult.data ?? []) {
    workspaceTemplateNameMap.set(wt.id, wt.name);
  }

  // Mapa de nomes de áreas
  const areaNameMap = new Map<string, string>();
  for (const a of areaNamesResult.data ?? []) {
    areaNameMap.set(a.id, a.name);
  }

  // Mapas de seções para contar itens no Round 6
  const sectionToTemplate = new Map<string, string>();
  for (const s of templateSectionsResult.data ?? []) {
    sectionToTemplate.set(s.id, s.template_id);
  }

  const cSectionToTemplate = new Map<string, string>();
  for (const s of customSectionsResult.data ?? []) {
    cSectionToTemplate.set(s.id, s.custom_template_id as string);
  }

  const wSectionToTemplate = new Map<string, string>();
  for (const s of workspaceSectionsResult.data ?? []) {
    wSectionToTemplate.set(s.id, s.workspace_template_id as string);
  }

  // ── Round 6: itens de todos os tipos de template em paralelo ─────────────
  const [itemsResult, customItemsResult, workspaceItemsResult] =
    await Promise.all([
      sectionToTemplate.size > 0
        ? supabase
            .from("checklist_template_items")
            .select("id, section_id")
            .in("section_id", [...sectionToTemplate.keys()])
        : Promise.resolve({ data: [] as { id: string; section_id: string }[] }),

      cSectionToTemplate.size > 0
        ? supabase
            .from("checklist_custom_items")
            .select("id, custom_section_id")
            .in("custom_section_id", [...cSectionToTemplate.keys()])
        : Promise.resolve({ data: [] as { id: string; custom_section_id: unknown }[] }),

      wSectionToTemplate.size > 0
        ? supabase
            .from("checklist_workspace_items")
            .select("id, workspace_section_id")
            .in("workspace_section_id", [...wSectionToTemplate.keys()])
        : Promise.resolve({ data: [] as { id: string; workspace_section_id: unknown }[] }),
    ]);

  // Conta itens por template
  const templateTotalItemsMap = new Map<string, number>();
  for (const item of itemsResult.data ?? []) {
    const tid = sectionToTemplate.get(item.section_id);
    if (tid) {
      templateTotalItemsMap.set(tid, (templateTotalItemsMap.get(tid) ?? 0) + 1);
    }
  }

  const customTemplateTotalItemsMap = new Map<string, number>();
  for (const item of customItemsResult.data ?? []) {
    const ctid = cSectionToTemplate.get(item.custom_section_id as string);
    if (ctid) {
      customTemplateTotalItemsMap.set(ctid, (customTemplateTotalItemsMap.get(ctid) ?? 0) + 1);
    }
  }

  const workspaceTemplateTotalItemsMap = new Map<string, number>();
  for (const item of workspaceItemsResult.data ?? []) {
    const wtid = wSectionToTemplate.get(item.workspace_section_id as string);
    if (wtid) {
      workspaceTemplateTotalItemsMap.set(
        wtid,
        (workspaceTemplateTotalItemsMap.get(wtid) ?? 0) + 1,
      );
    }
  }

  // Processa PDFs por sessão
  const pdfRowsBySession = new Map<string, ChecklistFillPdfExportRow[]>();
  for (const pdf of pdfExportsResult.data ?? []) {
    const row = mapPdfRow(pdf as Record<string, unknown>);
    const sid = row.session_id;
    const arr = pdfRowsBySession.get(sid) ?? [];
    arr.push(row);
    pdfRowsBySession.set(sid, arr);
  }
  for (const arr of pdfRowsBySession.values()) {
    arr.sort(
      (a, b) =>
        b.version_number - a.version_number ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  function pickLatestPdfForSession(sessionId: string): ChecklistFillPdfExportRow | null {
    const list = pdfRowsBySession.get(sessionId) ?? [];
    if (list.length === 0) return null;
    const activeReady = list.find((r) => r.status === "ready" && !r.superseded_at);
    if (activeReady) return activeReady;
    const processing = list.find(
      (r) => r.status === "processing" || r.status === "pending",
    );
    if (processing) return processing;
    return list[0] ?? null;
  }

  function pickPdfHistoryForSession(sessionId: string): ChecklistFillPdfExportRow[] {
    const list = pdfRowsBySession.get(sessionId) ?? [];
    return list
      .filter((r) => r.status === "ready")
      .sort((a, b) => b.version_number - a.version_number);
  }

  // Processa eventos de reabertura por sessão
  const reopenBySession = new Map<string, ChecklistFillSessionReopenEventRow[]>();
  for (const raw of reopenEventsResult.data ?? []) {
    const ev = raw as ChecklistFillSessionReopenEventRow;
    const sid = ev.session_id;
    const arr = reopenBySession.get(sid) ?? [];
    if (arr.length >= 20) continue;
    arr.push(ev);
    reopenBySession.set(sid, arr);
  }

  // ── Montagem final dos resultados ─────────────────────────────────────────
  const rows: ChecklistSessionSummary[] = sessions.map((sess) => {
    const est = estMap.get(sess.establishment_id) ?? {
      name: "Estabelecimento",
      establishment_type: "outros" as EstablishmentType,
    };
    const counts = countsBySession.get(sess.id) ?? { conforme: 0, nc: 0, na: 0 };

    let templateName = "—";
    let portariaRef: string | null = null;
    let totalItems = 0;
    let templateOrigin: "system" | "custom" | "workspace" = "system";

    const sessRowAny = sess as Record<string, unknown>;
    const sessWorkspaceTemplateId =
      (sessRowAny.workspace_template_id as string | null) ?? null;

    if (sessWorkspaceTemplateId) {
      templateOrigin = "workspace";
      templateName =
        workspaceTemplateNameMap.get(sessWorkspaceTemplateId) ?? "Modelo da equipe";
      totalItems =
        workspaceTemplateTotalItemsMap.get(sessWorkspaceTemplateId) ?? 0;
    } else if (sess.template_id) {
      templateOrigin = "system";
      const tInfo = templateNameMap.get(sess.template_id);
      templateName = tInfo?.name ?? "Template";
      portariaRef = tInfo?.portaria_ref ?? null;
      totalItems = templateTotalItemsMap.get(sess.template_id) ?? 0;
    } else if (sess.custom_template_id) {
      templateOrigin = "custom";
      templateName =
        customTemplateNameMap.get(sess.custom_template_id) ??
        "Template personalizado";
      totalItems =
        customTemplateTotalItemsMap.get(sess.custom_template_id) ?? 0;
    }

    const answeredCount = counts.conforme + counts.nc + counts.na;
    const pendingCount = Math.max(0, totalItems - answeredCount);
    const startedByLabel =
      profileNameByUserId.get(String(sess.user_id)) ??
      teamMemberNameByUserId.get(String(sess.user_id)) ??
      (sess.user_id === user.id
        ? ownUserLabel
        : "Profissional não identificado");

    const sessRaw = sess as Record<string, unknown>;
    const areaId = (sessRaw.area_id as string | null) ?? null;

    return {
      id: sess.id,
      seq_number: seqMap.get(sess.id) ?? 0,
      started_by_label: startedByLabel,
      created_at: sess.created_at,
      updated_at: sess.updated_at,
      dossier_approved_at: sess.dossier_approved_at ?? null,
      status: sess.dossier_approved_at ? "aprovado" : "em_andamento",
      template_name: templateName,
      template_origin: templateOrigin,
      portaria_ref: portariaRef,
      establishment_id: sess.establishment_id,
      establishment_name: est.name,
      establishment_type: est.establishment_type,
      area_id: areaId,
      area_name: areaId ? (areaNameMap.get(areaId) ?? null) : null,
      conformant_count: counts.conforme,
      nc_count: counts.nc,
      na_count: counts.na,
      pending_count: pendingCount,
      total_items: totalItems,
      score_percentage: (sessRaw.score_percentage as number | null) ?? null,
      score_points_earned: (sessRaw.score_points_earned as number | null) ?? null,
      score_points_total: (sessRaw.score_points_total as number | null) ?? null,
      latestPdfExport: pickLatestPdfForSession(sess.id),
      pdf_export_history: pickPdfHistoryForSession(sess.id),
      reopen_events: reopenBySession.get(sess.id) ?? [],
    };
  });

  return { rows, total: totalCount ?? rows.length };
}

/* ─── E.2: loadChecklistSessionNcItems ─────────────────────────────────── */

/**
 * Carrega os itens em não conformidade de uma sessão de preenchimento.
 * Valida ownership via join establishments → clients → owner_user_id.
 * Usado no lazy-load ao expandir um card de histórico.
 */
export async function loadChecklistSessionNcItems(
  sessionId: string,
): Promise<NcItemDetail[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  // VALIDAÇÃO: verificar que a sessão pertence a um estabelecimento de um cliente do usuário.
  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select(
      "id, establishment_id, template_id, custom_template_id, workspace_template_id",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!sess) return [];

  const { data: est } = await supabase
    .from("establishments")
    .select("client_id")
    .eq("id", sess.establishment_id)
    .maybeSingle();

  if (!est) return [];

  const owned = await assertClientOwned(
    supabase,
    workspaceOwnerId,
    est.client_id as string,
  );
  if (!owned) return [];

  // Buscar respostas NC desta sessão
  const { data: ncResponses } = await supabase
    .from("checklist_fill_item_responses")
    .select(
      "id, template_item_id, custom_item_id, workspace_item_id, note, item_annotation",
    )
    .eq("session_id", sessionId)
    .eq("outcome", "nc");

  if (!ncResponses || ncResponses.length === 0) return [];

  const globalItemIds = ncResponses
    .filter((r) => r.template_item_id)
    .map((r) => r.template_item_id as string);

  const customItemIds = ncResponses
    .filter((r) => r.custom_item_id)
    .map((r) => r.custom_item_id as string);

  const workspaceItemIds = ncResponses
    .filter((r) => (r as Record<string, unknown>).workspace_item_id)
    .map((r) => (r as Record<string, unknown>).workspace_item_id as string);

  // Buscar detalhes dos itens em paralelo
  const [globalItemRows, customItemRows, workspaceItemRows] = await Promise.all([
    globalItemIds.length > 0
      ? supabase
          .from("checklist_template_items")
          .select("id, description, is_required")
          .in("id", globalItemIds)
      : Promise.resolve({ data: [] as { id: string; description: string; is_required: boolean }[] }),

    customItemIds.length > 0
      ? supabase
          .from("checklist_custom_items")
          .select("id, description, is_required")
          .in("id", customItemIds)
      : Promise.resolve({ data: [] as { id: string; description: string; is_required: boolean }[] }),

    workspaceItemIds.length > 0
      ? supabase
          .from("checklist_workspace_items")
          .select("id, description, is_required")
          .in("id", workspaceItemIds)
      : Promise.resolve({ data: [] as { id: string; description: string; is_required: boolean }[] }),
  ]);

  const globalItemMap = new Map<string, { description: string; is_required: boolean }>();
  for (const it of globalItemRows.data ?? []) {
    globalItemMap.set(it.id, { description: it.description, is_required: Boolean(it.is_required) });
  }

  const customItemMap = new Map<string, { description: string; is_required: boolean }>();
  for (const it of customItemRows.data ?? []) {
    customItemMap.set(it.id, { description: it.description, is_required: Boolean(it.is_required) });
  }

  const workspaceItemMap = new Map<string, { description: string; is_required: boolean }>();
  for (const it of workspaceItemRows.data ?? []) {
    workspaceItemMap.set(it.id, { description: it.description, is_required: Boolean(it.is_required) });
  }

  // Montar resultado
  const result: NcItemDetail[] = [];
  for (const r of ncResponses) {
    const rowAny = r as Record<string, unknown>;
    const workspaceItemId = rowAny.workspace_item_id as string | null;
    const itemInfo = r.template_item_id
      ? globalItemMap.get(r.template_item_id)
      : r.custom_item_id
        ? customItemMap.get(r.custom_item_id)
        : workspaceItemId
          ? workspaceItemMap.get(workspaceItemId)
          : null;

    if (!itemInfo) continue;

    result.push({
      item_id: (r.template_item_id ?? r.custom_item_id ?? workspaceItemId) as string,
      description: itemInfo.description,
      is_required: itemInfo.is_required,
      note: (r.note as string | null) ?? null,
      item_annotation: (r.item_annotation as string | null) ?? null,
    });
  }

  return result;
}

/* ─── E.3: loadChecklistScoreHistory ────────────────────────────────────── */

export type ScoreHistoryPoint = {
  sessionId: string;
  approvedAt: string;
  scorePercentage: number;
  templateName: string;
  templateId: string;
  areaName: string | null;
};

/**
 * Carrega o histórico de pontuações aprovadas de um cliente,
 * agrupadas por template para exibição no gráfico de evolução.
 * Só retorna sessões com score calculado (não-null).
 */
export async function loadChecklistScoreHistory(
  clientId: string,
): Promise<{
  byTemplate: {
    templateId: string;
    templateName: string;
    points: ScoreHistoryPoint[];
  }[];
}> {
  const empty = { byTemplate: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const owned = await assertClientOwned(supabase, workspaceOwnerId, clientId);
  if (!owned) return empty;

  // Estabelecimentos do cliente
  const { data: ests } = await supabase
    .from("establishments")
    .select("id")
    .eq("client_id", clientId);
  const estIds = (ests ?? []).map((e) => e.id as string);
  if (estIds.length === 0) return empty;

  // Sessões aprovadas com score
  const { data: sessions } = await supabase
    .from("checklist_fill_sessions")
    .select(
      "id, template_id, custom_template_id, workspace_template_id, dossier_approved_at, score_percentage, area_id",
    )
    .in("establishment_id", estIds)
    .not("dossier_approved_at", "is", null)
    .not("score_percentage", "is", null)
    .order("dossier_approved_at", { ascending: true });

  if (!sessions || sessions.length === 0) return empty;

  // Extrai IDs únicos
  const globalTemplateIds = [
    ...new Set(sessions.filter((s) => s.template_id).map((s) => s.template_id as string)),
  ];
  const customTemplateIds = [
    ...new Set(
      sessions.filter((s) => s.custom_template_id).map((s) => s.custom_template_id as string),
    ),
  ];
  const workspaceTemplateIds = [
    ...new Set(
      sessions
        .filter((s) => (s as Record<string, unknown>).workspace_template_id)
        .map((s) => (s as Record<string, unknown>).workspace_template_id as string),
    ),
  ];
  const areaIds = [
    ...new Set(
      sessions.filter((s) => s.area_id).map((s) => s.area_id as string),
    ),
  ];

  // Lookups de nomes em paralelo
  const [tRows, cRows, wRows, areaRows] = await Promise.all([
    globalTemplateIds.length > 0
      ? supabase
          .from("checklist_templates")
          .select("id, name")
          .in("id", globalTemplateIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),

    customTemplateIds.length > 0
      ? supabase
          .from("checklist_custom_templates")
          .select("id, name")
          .in("id", customTemplateIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),

    workspaceTemplateIds.length > 0
      ? supabase
          .from("checklist_workspace_templates")
          .select("id, name")
          .in("id", workspaceTemplateIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),

    areaIds.length > 0
      ? supabase
          .from("establishment_areas")
          .select("id, name")
          .in("id", areaIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const templateNameMap = new Map<string, string>();
  for (const t of tRows.data ?? []) templateNameMap.set(t.id, t.name);
  for (const t of cRows.data ?? []) templateNameMap.set(t.id, t.name);
  for (const t of wRows.data ?? []) templateNameMap.set(t.id, t.name);

  const areaNameMap = new Map<string, string>();
  for (const a of areaRows.data ?? []) areaNameMap.set(a.id, a.name);

  // Agrupa por template
  const groups = new Map<
    string,
    { templateName: string; points: ScoreHistoryPoint[] }
  >();
  for (const s of sessions) {
    const sAny = s as Record<string, unknown>;
    const templateId = (s.template_id ??
      s.custom_template_id ??
      (sAny.workspace_template_id as string | null)) as string;
    if (!templateId) continue;
    const templateName = templateNameMap.get(templateId) ?? "Template";
    if (!groups.has(templateId)) groups.set(templateId, { templateName, points: [] });
    groups.get(templateId)!.points.push({
      sessionId: s.id as string,
      approvedAt: s.dossier_approved_at as string,
      scorePercentage: Number(s.score_percentage),
      templateName,
      templateId,
      areaName: s.area_id ? (areaNameMap.get(s.area_id as string) ?? null) : null,
    });
  }

  return {
    byTemplate: Array.from(groups.entries()).map(
      ([templateId, { templateName, points }]) => ({
        templateId,
        templateName,
        points,
      }),
    ),
  };
}
