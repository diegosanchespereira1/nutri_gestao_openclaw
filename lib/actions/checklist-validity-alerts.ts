"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { addCalendarDays, calendarDaysUntilDueDate, todayKey } from "@/lib/datetime/calendar-tz";
import {
  balanceValidityAlerts,
  VALIDITY_ALERTS_LIMIT_DEFAULT,
  VALIDITY_ALERTS_PAST_DAYS,
  VALIDITY_ALERTS_UPCOMING_DAYS_DEFAULT,
} from "@/lib/checklists/validity-alerts-balance";
import { getServerContext } from "@/lib/supabase/get-server-user";
import type { ChecklistValidityAlert } from "@/lib/types/checklist-validity-alerts";

type RpcAlertRow = {
  response_id: string;
  session_id: string;
  client_id: string;
  client_name: string;
  checklist_name: string;
  valid_until: string;
};

type SessionMeta = {
  id: string;
  establishment_id: string;
  template_id: string | null;
  custom_template_id: string | null;
};

type CandidateAlert = ChecklistValidityAlert & {
  scopeKey: string;
};

const IN_CHUNK_SIZE = 150;

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function mapRpcRows(
  rows: RpcAlertRow[],
  timeZone: string,
): ChecklistValidityAlert[] {
  return rows.map((row) => {
    const validUntil =
      typeof row.valid_until === "string"
        ? row.valid_until.slice(0, 10)
        : String(row.valid_until);
    const daysToExpire = calendarDaysUntilDueDate(
      validUntil,
      timeZone,
      new Date(),
    );
    return {
      responseId: String(row.response_id),
      sessionId: String(row.session_id),
      clientId: String(row.client_id),
      clientName: String(row.client_name),
      checklistName: String(row.checklist_name),
      validUntil,
      status: daysToExpire < 0 ? "vencido" : "proximo",
      daysToExpire,
    };
  });
}

function isRpcUnavailable(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return (
    msg.includes("could not find the function") ||
    msg.includes("schema cache") ||
    (msg.includes("function") && msg.includes("does not exist"))
  );
}

/** RPC ausente ou Supabase/CDN fora — usa fallback legado sem poluir o console. */
function isExpectedRpcFailure(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  if (isRpcUnavailable(errorMessage)) return true;
  return (
    msg.includes("<!doctype") ||
    msg.includes("<html") ||
    msg.includes("bad gateway") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("econnrefused") ||
    msg.includes("fetch failed") ||
    msg.includes("network error")
  );
}

function summarizeSupabaseError(errorMessage: string): string {
  const trimmed = errorMessage.trim();
  if (trimmed.length <= 180) return trimmed;
  const lower = trimmed.toLowerCase();
  if (lower.includes("bad gateway") || lower.includes("502")) {
    return "Supabase indisponível (502 Bad Gateway)";
  }
  if (lower.includes("<!doctype") || lower.includes("<html")) {
    return "Resposta HTML inesperada do Supabase (proxy/CDN ou host fora)";
  }
  return `${trimmed.slice(0, 180)}…`;
}

function isRpcSignatureOrParamError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return (
    isRpcUnavailable(errorMessage) ||
    msg.includes("p_today") ||
    msg.includes("permission denied for function") ||
    msg.includes("could not choose a best candidate function")
  );
}

async function loadChecklistValidityAlertsViaRpc(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  timeZone: string,
  options?: { withinDays?: number; limit?: number; clientId?: string | null },
): Promise<ChecklistValidityAlert[] | null> {
  const withinDays = options?.withinDays ?? VALIDITY_ALERTS_UPCOMING_DAYS_DEFAULT;
  const limit = options?.limit ?? VALIDITY_ALERTS_LIMIT_DEFAULT;
  const clientFilter = options?.clientId ?? null;

  const tKey = todayKey(new Date(), timeZone);
  const horizon = addCalendarDays(tKey, withinDays, timeZone);
  const pastCap = addCalendarDays(tKey, -VALIDITY_ALERTS_PAST_DAYS, timeZone);

  const baseArgs = {
    p_owner_user_id: workspaceOwnerId,
    p_horizon: horizon,
    p_past_cap: pastCap,
    p_limit: Math.max(1, limit),
    p_client_id: clientFilter,
  };

  let { data, error } = await supabase.rpc("get_checklist_validity_alerts", {
    ...baseArgs,
    p_today: tKey,
  });

  if (error && isRpcSignatureOrParamError(error.message)) {
    ({ data, error } = await supabase.rpc("get_checklist_validity_alerts", baseArgs));
  }

  if (error) {
    if (!isExpectedRpcFailure(error.message) && !isRpcSignatureOrParamError(error.message)) {
      console.error(
        "[loadChecklistValidityAlerts] RPC",
        summarizeSupabaseError(error.message),
      );
    }
    return null;
  }

  const mapped = mapRpcRows((data ?? []) as RpcAlertRow[], timeZone);
  return balanceValidityAlerts(mapped, limit);
}

async function loadChecklistValidityAlertsResolved(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  timeZone: string,
  options?: { withinDays?: number; limit?: number; clientId?: string | null },
): Promise<ChecklistValidityAlert[]> {
  const viaRpc = await loadChecklistValidityAlertsViaRpc(
    supabase,
    workspaceOwnerId,
    timeZone,
    options,
  );
  if (viaRpc && viaRpc.length > 0) return viaRpc;

  const legacy = await loadChecklistValidityAlertsLegacy(
    supabase,
    workspaceOwnerId,
    timeZone,
    options,
  );
  if (legacy.length > 0) return legacy;

  return viaRpc ?? legacy;
}

/** Fallback até a migração `20260805150000_perf_navigation_queries.sql` estar aplicada. */
async function loadChecklistValidityAlertsLegacy(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
  timeZone: string,
  options?: { withinDays?: number; limit?: number; clientId?: string | null },
): Promise<ChecklistValidityAlert[]> {
  const withinDays = options?.withinDays ?? VALIDITY_ALERTS_UPCOMING_DAYS_DEFAULT;
  const limit = options?.limit ?? VALIDITY_ALERTS_LIMIT_DEFAULT;
  const clientFilter = options?.clientId ?? null;

  const tKey = todayKey(new Date(), timeZone);
  const horizon = addCalendarDays(tKey, withinDays, timeZone);
  const pastCap = addCalendarDays(tKey, -VALIDITY_ALERTS_PAST_DAYS, timeZone);

  let clientsQuery = supabase
    .from("clients")
    .select("id, legal_name, trade_name")
    .eq("owner_user_id", workspaceOwnerId);
  if (clientFilter) {
    clientsQuery = clientsQuery.eq("id", clientFilter);
  }
  const { data: clients, error: clientsError } = await clientsQuery;
  if (clientsError || !clients || clients.length === 0) return [];

  const clientNameMap = new Map<string, string>();
  for (const c of clients) {
    const trade = String(c.trade_name ?? "").trim();
    const legal = String(c.legal_name ?? "").trim();
    clientNameMap.set(String(c.id), trade.length > 0 ? trade : legal);
  }

  const clientIds = [...clientNameMap.keys()];
  const { data: establishments, error: establishmentError } = await supabase
    .from("establishments")
    .select("id, client_id")
    .in("client_id", clientIds);
  if (establishmentError || !establishments || establishments.length === 0) {
    return [];
  }

  const establishmentToClient = new Map<string, string>();
  for (const est of establishments) {
    establishmentToClient.set(String(est.id), String(est.client_id));
  }

  const establishmentIds = establishments.map((e) => String(e.id));
  const sessionMap = new Map<string, SessionMeta>();
  for (const ids of chunk(establishmentIds, IN_CHUNK_SIZE)) {
    const { data: sessions, error: sessionError } = await supabase
      .from("checklist_fill_sessions")
      .select("id, establishment_id, template_id, custom_template_id")
      .in("establishment_id", ids)
      .not("dossier_approved_at", "is", null);
    if (sessionError || !sessions) continue;
    for (const s of sessions) {
      sessionMap.set(String(s.id), {
        id: String(s.id),
        establishment_id: String(s.establishment_id),
        template_id: (s.template_id as string | null) ?? null,
        custom_template_id: (s.custom_template_id as string | null) ?? null,
      });
    }
  }
  if (sessionMap.size === 0) return [];

  const sessionIds = [...sessionMap.keys()];
  const responseRows: Array<{
    id: string;
    session_id: string;
    valid_until: string;
  }> = [];
  for (const ids of chunk(sessionIds, IN_CHUNK_SIZE)) {
    const { data: rows, error: responseError } = await supabase
      .from("checklist_fill_item_responses")
      .select("id, session_id, valid_until")
      .in("session_id", ids)
      .not("valid_until", "is", null)
      .gte("valid_until", pastCap)
      .lte("valid_until", horizon);
    if (responseError || !rows) continue;
    for (const row of rows) {
      responseRows.push({
        id: String(row.id),
        session_id: String(row.session_id),
        valid_until: String(row.valid_until),
      });
    }
  }
  if (responseRows.length === 0) return [];

  const templateIds = [
    ...new Set(
      [...sessionMap.values()].map((s) => s.template_id).filter(Boolean),
    ),
  ] as string[];
  const customTemplateIds = [
    ...new Set(
      [...sessionMap.values()].map((s) => s.custom_template_id).filter(Boolean),
    ),
  ] as string[];

  const templateNameMap = new Map<string, string>();
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("checklist_templates")
      .select("id, name")
      .in("id", templateIds);
    for (const t of templates ?? []) {
      templateNameMap.set(String(t.id), String(t.name));
    }
  }

  const customTemplateNameMap = new Map<string, string>();
  if (customTemplateIds.length > 0) {
    const { data: customTemplates } = await supabase
      .from("checklist_custom_templates")
      .select("id, name")
      .in("id", customTemplateIds);
    for (const t of customTemplates ?? []) {
      customTemplateNameMap.set(String(t.id), String(t.name));
    }
  }

  const candidates: CandidateAlert[] = [];
  for (const row of responseRows) {
    const validUntil = row.valid_until.slice(0, 10);
    if (!validUntil) continue;

    const session = sessionMap.get(row.session_id);
    if (!session) continue;

    const clientId = establishmentToClient.get(session.establishment_id);
    if (!clientId) continue;

    const clientName = clientNameMap.get(clientId);
    if (!clientName) continue;

    const checklistName =
      (session.template_id ? templateNameMap.get(session.template_id) : null) ??
      (session.custom_template_id
        ? customTemplateNameMap.get(session.custom_template_id)
        : null) ??
      "Checklist";

    const daysToExpire = calendarDaysUntilDueDate(
      validUntil,
      timeZone,
      new Date(),
    );
    const status = daysToExpire < 0 ? "vencido" : "proximo";
    const templateScope = session.template_id
      ? `template:${session.template_id}`
      : session.custom_template_id
        ? `custom:${session.custom_template_id}`
        : `session:${session.id}`;
    const scopeKey = `${clientId}|${session.establishment_id}|${templateScope}`;

    candidates.push({
      responseId: row.id,
      sessionId: row.session_id,
      clientId,
      clientName,
      checklistName,
      validUntil,
      status,
      daysToExpire,
      scopeKey,
    });
  }

  const latestByScope = new Map<string, CandidateAlert>();
  for (const candidate of candidates) {
    const prev = latestByScope.get(candidate.scopeKey);
    if (!prev || candidate.validUntil > prev.validUntil) {
      latestByScope.set(candidate.scopeKey, candidate);
    }
  }

  const alerts = [...latestByScope.values()]
    .filter((alert) => alert.validUntil <= horizon)
    .map((alert) => {
      const { scopeKey, ...rest } = alert;
      void scopeKey;
      return rest;
    });

  alerts.sort((a, b) => {
    if (a.status !== b.status) return a.status === "vencido" ? -1 : 1;
    const aTime = new Date(`${a.validUntil}T12:00:00Z`).getTime();
    const bTime = new Date(`${b.validUntil}T12:00:00Z`).getTime();
    return aTime - bTime;
  });

  return balanceValidityAlerts(alerts, Math.max(1, limit));
}

export async function loadChecklistValidityAlerts(
  timeZone: string,
  options?: { withinDays?: number; limit?: number; clientId?: string | null },
): Promise<ChecklistValidityAlert[]> {
  const { supabase, workspaceOwnerId } = await getServerContext();
  if (!workspaceOwnerId) return [];

  return loadChecklistValidityAlertsResolved(
    supabase,
    workspaceOwnerId,
    timeZone,
    options,
  );
}
