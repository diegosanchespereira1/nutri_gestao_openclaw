"use server";

import { APP_DASHBOARD_PATH } from "@/lib/routes";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import {
  startChecklistFillBatch,
  startCustomTemplateFillBatch,
  loadFillSessionPageData,
} from "@/lib/actions/checklist-fill";
import { loadChecklistCatalog } from "@/lib/actions/checklists";
import { listCustomTemplatesForOwner } from "@/lib/actions/checklist-custom";
import {
  loadChecklistSessionsForClient,
  type ChecklistSessionSummary,
} from "@/lib/actions/checklist-history";
import { loadAreasForEstablishment } from "@/lib/actions/establishment-areas";
import {
  loadWorkspaceTemplatesForCatalogLight,
  startWorkspaceTemplateFillBatch,
} from "@/lib/actions/checklist-workspace";
import { loadScheduledVisitById } from "@/lib/visits/load-scheduled-visits";
import {
  assembleVisitChecklistOptions,
  parseVisitChecklistChoice,
  resolveVisitSelectedAreaIds,
  type VisitChecklistOption,
} from "@/lib/visits/visit-checklist-options";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { FillResponsesMap } from "@/lib/types/checklist-fill";
import type { ChecklistFillBatchItem } from "@/lib/checklist-fill-batch-storage";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";
import type { EstablishmentWithClientNames } from "@/lib/types/establishments";

type EstPick = { id: string; label: string };

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

export async function markScheduledVisitInProgress(
  visitId: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row } = await supabase
    .from("scheduled_visits")
    .select("status")
    .eq("id", visitId)
    .maybeSingle();

  if (!row || row.status !== "scheduled") return;

  await supabase
    .from("scheduled_visits")
    .update({ status: "in_progress" })
    .eq("id", visitId);

  // Não chamar revalidatePath durante o render do RSC (ex.: página iniciar).
  after(() => {
    revalidatePath("/visitas");
    revalidatePath(APP_DASHBOARD_PATH);
    revalidatePath(`/visitas/${visitId}`);
  });
}

async function loadPatientEstablishmentOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  userId: string,
): Promise<EstPick[] | null> {
  const { data: pat, error } = await supabase
    .from("patients")
    .select("id, establishment_id, client_id")
    .eq("id", patientId)
    .maybeSingle();

  if (error || !pat) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", pat.client_id as string)
    .maybeSingle();

  if (!client || client.owner_user_id !== userId) return null;

  if (pat.establishment_id) {
    return [{ id: pat.establishment_id as string, label: "" }];
  }

  const { data: estRows } = await supabase
    .from("establishments")
    .select("id, name, clients(legal_name, trade_name, lifecycle_status)")
    .eq("client_id", pat.client_id as string);

  const picks: EstPick[] = [];
  for (const raw of estRows ?? []) {
    const e = raw as unknown as {
      id: string;
      name: string;
      clients:
        | { legal_name: string; trade_name: string | null }
        | { legal_name: string; trade_name: string | null }[]
        | null;
    };
    const c = Array.isArray(e.clients) ? e.clients[0] : e.clients;
    const clientLabel =
      c?.trade_name?.trim() && c.trade_name.trim().length > 0
        ? c.trade_name.trim()
        : (c?.legal_name ?? "");
    picks.push({
      id: e.id,
      label: `${e.name} — ${clientLabel}`,
    });
  }
  return picks;
}

/** Resolve o estabelecimento usado para portaria / checklist (visita a estabelecimento ou paciente). */
export async function resolveVisitChecklistEstablishmentId(input: {
  visit: ScheduledVisitWithTargets;
  authUserId: string;
  ctxEstablishmentId: string | null;
}): Promise<
  | { ok: true; establishmentId: string }
  | { ok: false; reason: "no_context"; message: string }
  | { ok: false; reason: "pick"; options: EstPick[] }
> {
  const { visit, authUserId, ctxEstablishmentId } = input;
  const supabase = await createClient();
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(
    supabase,
    authUserId,
  );

  if (visit.target_type === "establishment") {
    const eid = visit.establishment_id;
    if (!eid) {
      return {
        ok: false,
        reason: "no_context",
        message: "Visita sem estabelecimento associado.",
      };
    }
    const ok = await assertEstablishmentOwned(supabase, workspaceOwnerId, eid);
    if (!ok) {
      return {
        ok: false,
        reason: "no_context",
        message: "Estabelecimento inválido.",
      };
    }
    return { ok: true, establishmentId: eid };
  }

  const opts = await loadPatientEstablishmentOptions(
    supabase,
    visit.patient_id as string,
    workspaceOwnerId,
  );
  if (!opts || opts.length === 0) {
    return {
      ok: false,
      reason: "no_context",
      message:
        "Não há estabelecimento para aplicar checklists regulatórios nesta visita. Cadastre um estabelecimento para o cliente ou utilize a área Checklists no menu.",
    };
  }

  if (opts.length === 1) {
    return { ok: true, establishmentId: opts[0].id };
  }

  if (ctxEstablishmentId) {
    const match = opts.find((o) => o.id === ctxEstablishmentId);
    if (match) {
      return { ok: true, establishmentId: match.id };
    }
  }

  return { ok: false, reason: "pick", options: opts };
}

export async function buildVisitChecklistOptions(): Promise<VisitChecklistOption[]> {
  const [
    { templates: official },
    { rows: workspaceRows },
    { rows: customRows },
  ] = await Promise.all([
    loadChecklistCatalog(),
    loadWorkspaceTemplatesForCatalogLight(),
    listCustomTemplatesForOwner(),
  ]);

  return assembleVisitChecklistOptions({
    workspace: workspaceRows.filter((row) => !row.is_draft && !row.is_archived),
    custom: customRows.filter((row) => !row.is_archived),
    official,
  });
}

export async function getLatestFillSessionIdForVisit(
  visitId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("checklist_fill_sessions")
    .select("id")
    .eq("scheduled_visit_id", visitId)
    .is("dossier_approved_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? (data.id as string) : null;
}

/** Última sessão com dossiê aprovado ligada à visita (para PDF/email). */
export async function getLatestApprovedFillSessionIdForVisit(
  visitId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("checklist_fill_sessions")
    .select("id")
    .eq("scheduled_visit_id", visitId)
    .not("dossier_approved_at", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? (data.id as string) : null;
}

/**
 * Sessões de checklist da visita (em andamento e aprovadas), no formato do
 * histórico do cliente — para «Ver dossiê» / PDF na ficha da visita.
 */
export async function loadFillSessionsForVisit(
  visitId: string,
): Promise<{
  rows: ChecklistSessionSummary[];
  latestApprovedSessionId: string | null;
}> {
  const empty = { rows: [] as ChecklistSessionSummary[], latestApprovedSessionId: null };
  const trimmed = visitId.trim();
  if (!trimmed) return empty;

  const { row } = await loadScheduledVisitById(trimmed);
  if (!row) return empty;

  let clientId =
    row.target_type === "establishment"
      ? (row.establishments?.client_id ?? null)
      : (row.patients?.client_id ?? null);

  if (!clientId) {
    const supabase = await createClient();
    const { data: sess } = await supabase
      .from("checklist_fill_sessions")
      .select("establishment_id")
      .eq("scheduled_visit_id", trimmed)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sess?.establishment_id) return empty;
    const { data: est } = await supabase
      .from("establishments")
      .select("client_id")
      .eq("id", sess.establishment_id)
      .maybeSingle();
    clientId = (est?.client_id as string | null) ?? null;
  }

  if (!clientId) return empty;

  const { rows } = await loadChecklistSessionsForClient({
    clientId,
    scheduledVisitId: trimmed,
    limit: 50,
    offset: 0,
  });

  const latestApprovedSessionId =
    rows.find((r) => r.status === "aprovado")?.id ?? null;

  return { rows, latestApprovedSessionId };
}

type StartVisitChecklistFillResult =
  | {
      ok: true;
      firstSessionId: string;
      sessionIds: string[];
      items: ChecklistFillBatchItem[];
    }
  | {
      ok: false;
      error: "missing" | "context" | "session" | "area_required" | "area_invalid";
    };

export async function startVisitChecklistFillAction(input: {
  visitId: string;
  choice: string;
  ctxEstablishmentId: string | null;
  areaIds: string[];
}): Promise<StartVisitChecklistFillResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "session" };

  const visitId = input.visitId.trim();
  const choice = parseVisitChecklistChoice(input.choice);
  if (!visitId || !choice) return { ok: false, error: "missing" };

  const { row } = await loadScheduledVisitById(visitId);
  if (!row) return { ok: false, error: "context" };

  const resolved = await resolveVisitChecklistEstablishmentId({
    visit: row,
    authUserId: user.id,
    ctxEstablishmentId: input.ctxEstablishmentId,
  });
  if (!resolved.ok) return { ok: false, error: "context" };

  const availableAreas = await loadAreasForEstablishment(resolved.establishmentId);
  const areaSelection = resolveVisitSelectedAreaIds({
    availableAreaIds: availableAreas.map((a) => a.id),
    selectedAreaIds: input.areaIds,
  });
  if (!areaSelection.ok) return { ok: false, error: areaSelection.error };

  const batchInput = {
    areaIds: areaSelection.areaIds,
    scheduledVisitId: visitId,
  };

  const started =
    choice.kind === "workspace"
      ? await startWorkspaceTemplateFillBatch({
          workspaceTemplateId: choice.id,
          establishmentId: resolved.establishmentId,
          ...batchInput,
        })
      : choice.kind === "custom"
        ? await startCustomTemplateFillBatch({
            customTemplateId: choice.id,
            establishmentId: resolved.establishmentId,
            ...batchInput,
          })
        : await startChecklistFillBatch({
            templateId: choice.id,
            establishmentId: resolved.establishmentId,
            ...batchInput,
          });

  if (!started.ok) return { ok: false, error: "session" };

  const items: ChecklistFillBatchItem[] = started.sessionIds.map((sessionId, i) => {
    const areaId =
      i < areaSelection.areaIds.length ? (areaSelection.areaIds[i] ?? null) : null;
    const area = areaId
      ? availableAreas.find((a) => a.id === areaId)
      : null;
    return {
      sessionId,
      areaId,
      areaName: area?.name ?? null,
    };
  });

  revalidatePath(`/visitas/${visitId}/iniciar`);
  revalidatePath(`/visitas/${visitId}`);

  return {
    ok: true,
    firstSessionId: started.firstSessionId,
    sessionIds: started.sessionIds,
    items,
  };
}

export async function chooseVisitEstablishmentContextAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const visitId = String(formData.get("visit_id") ?? "").trim();
  const establishmentId = String(formData.get("establishment_id") ?? "").trim();
  if (!visitId || !establishmentId) {
    redirect(`/visitas?err=ctx`);
  }

  const { row } = await loadScheduledVisitById(visitId);
  if (!row) {
    redirect("/visitas");
  }

  const resolved = await resolveVisitChecklistEstablishmentId({
    visit: row,
    authUserId: user.id,
    ctxEstablishmentId: null,
  });

  if (resolved.ok) {
    redirect(`/visitas/${visitId}/iniciar?err=ctx`);
  }
  if (resolved.reason !== "pick") {
    redirect(`/visitas/${visitId}/iniciar?err=ctx`);
  }

  const allowed = resolved.options.some((o) => o.id === establishmentId);
  if (!allowed) {
    redirect(`/visitas/${visitId}/iniciar?err=ctx`);
  }

  redirect(`/visitas/${visitId}/iniciar?ctx_est=${establishmentId}`);
}

export async function createVisitChecklistSessionAction(
  formData: FormData,
): Promise<void> {
  const visitId = String(formData.get("visit_id") ?? "").trim();
  const ctxEst = String(formData.get("ctx_establishment_id") ?? "").trim();
  const areaIds = formData
    .getAll("area_id")
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);

  const result = await startVisitChecklistFillAction({
    visitId,
    choice: String(formData.get("choice") ?? ""),
    ctxEstablishmentId: ctxEst.length > 0 ? ctxEst : null,
    areaIds,
  });

  if (!result.ok) {
    if (!visitId) redirect("/visitas");
    redirect(`/visitas/${visitId}/iniciar?err=${result.error}`);
  }

  redirect(`/visitas/${visitId}/iniciar?session=${result.firstSessionId}`);
}

function countFillProgress(
  template: ChecklistTemplateWithSections,
  responses: FillResponsesMap,
): { done: number; total: number } {
  let total = 0;
  let done = 0;
  for (const sec of template.sections) {
    for (const it of sec.items) {
      total += 1;
      if (responses[it.id]?.outcome != null) done += 1;
    }
  }
  return { done, total };
}

const NC_HISTORY_SESSION_CHUNK = 100;

/** Conta, por item do modelo atual, em quantas sessões anteriores (mesmo estabelecimento, equipa) houve NC. */
async function loadRecurringNcSessionCountByItem(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  establishmentId: string;
  currentSessionId: string;
  template: ChecklistTemplateWithSections;
  itemResponseSource: "global" | "custom" | "workspace";
}): Promise<Record<string, number>> {
  const {
    supabase,
    establishmentId,
    currentSessionId,
    template,
    itemResponseSource,
  } = input;

  const currentIds = new Set<string>();
  for (const sec of template.sections) {
    for (const it of sec.items) {
      currentIds.add(it.id);
    }
  }

  const { data: sessions } = await supabase
    .from("checklist_fill_sessions")
    .select("id")
    .eq("establishment_id", establishmentId)
    .neq("id", currentSessionId);

  const sessionIds = (sessions ?? []).map((s) => s.id as string);
  if (sessionIds.length === 0) return {};

  type NcRow = {
    session_id: string;
    template_item_id: string | null;
    custom_item_id: string | null;
    workspace_item_id: string | null;
  };

  const respRows: NcRow[] = [];
  for (let i = 0; i < sessionIds.length; i += NC_HISTORY_SESSION_CHUNK) {
    const chunk = sessionIds.slice(i, i + NC_HISTORY_SESSION_CHUNK);
    const { data: part } = await supabase
      .from("checklist_fill_item_responses")
      .select("session_id, template_item_id, custom_item_id, workspace_item_id")
      .in("session_id", chunk)
      .eq("outcome", "nc");
    for (const r of part ?? []) {
      respRows.push(r as NcRow);
    }
  }

  const distinctSessionsByItem = new Map<string, Set<string>>();

  for (const r of respRows) {
    const itemId =
      itemResponseSource === "global"
        ? r.template_item_id
        : itemResponseSource === "custom"
          ? r.custom_item_id
          : r.workspace_item_id;
    if (!itemId || !currentIds.has(itemId)) continue;

    let set = distinctSessionsByItem.get(itemId);
    if (!set) {
      set = new Set();
      distinctSessionsByItem.set(itemId, set);
    }
    set.add(r.session_id);
  }

  const out: Record<string, number> = {};
  for (const [itemId, set] of distinctSessionsByItem) {
    out[itemId] = set.size;
  }
  return out;
}

type VisitChecklistWizardModel = {
  visit: ScheduledVisitWithTargets;
  sessionId: string;
  fill: NonNullable<Awaited<ReturnType<typeof loadFillSessionPageData>>>;
  progress: { done: number; total: number };
  /** Por item: nº de sessões anteriores neste estabelecimento com NC (FR21). */
  recurringNcSessionCountByItemId: Record<string, number>;
  establishmentContextLabel: string;
};

/** Valida sessão de preenchimento ligada à visita e devolve dados para o wizard. */
export async function loadVisitChecklistWizardModel(input: {
  visit: ScheduledVisitWithTargets;
  sessionId: string;
}): Promise<VisitChecklistWizardModel | null> {
  const supabase = await createClient();
  const { visit, sessionId } = input;

  const { data: sess } = await supabase
    .from("checklist_fill_sessions")
    .select("id, scheduled_visit_id, user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sess || sess.scheduled_visit_id !== visit.id) return null;

  const fill = await loadFillSessionPageData(sessionId);
  if (!fill) return null;

  const progress = countFillProgress(fill.template, fill.responses);

  const { data: est } = await supabase
    .from("establishments")
    .select("*, clients(legal_name, trade_name, lifecycle_status)")
    .eq("id", fill.session.establishment_id)
    .maybeSingle();

  const establishmentContextLabel = est
    ? `${(est as EstablishmentWithClientNames).name} — ${establishmentClientLabel(est as EstablishmentWithClientNames)}`
    : fill.establishmentLabel;

  const recurringNcSessionCountByItemId = await loadRecurringNcSessionCountByItem({
    supabase,
    establishmentId: fill.session.establishment_id,
    currentSessionId: sessionId,
    template: fill.template,
    itemResponseSource: fill.itemResponseSource,
  });

  return {
    visit,
    sessionId,
    fill,
    progress,
    recurringNcSessionCountByItemId,
    establishmentContextLabel,
  };
}
