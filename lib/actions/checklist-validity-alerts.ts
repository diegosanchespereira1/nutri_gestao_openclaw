"use server";

import { addCalendarDays, todayKey } from "@/lib/datetime/calendar-tz";
import { calendarDaysUntilDueDate } from "@/lib/datetime/calendar-tz";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistValidityAlert } from "@/lib/types/checklist-validity-alerts";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

type SessionMeta = {
  id: string;
  establishment_id: string;
  template_id: string | null;
  custom_template_id: string | null;
};

type CandidateAlert = ChecklistValidityAlert & {
  scopeKey: string;
};

export async function loadChecklistValidityAlerts(
  timeZone: string,
  options?: { withinDays?: number; limit?: number; clientId?: string | null },
): Promise<ChecklistValidityAlert[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const withinDays = options?.withinDays ?? 7;
  const limit = options?.limit ?? 8;
  const clientFilter = options?.clientId ?? null;

  const tKey = todayKey(new Date(), timeZone);
  const horizon = addCalendarDays(tKey, withinDays, timeZone);
  const pastCap = addCalendarDays(tKey, -365, timeZone);

  const { data: responseRows, error: responseError } = await supabase
    .from("checklist_fill_item_responses")
    .select("id, session_id, valid_until")
    .not("valid_until", "is", null)
    .gte("valid_until", pastCap);

  if (responseError || !responseRows || responseRows.length === 0) return [];

  const uniqueSessionIds = [...new Set(responseRows.map((r) => String(r.session_id)))];
  const { data: sessions, error: sessionError } = await supabase
    .from("checklist_fill_sessions")
    .select("id, establishment_id, template_id, custom_template_id")
    .in("id", uniqueSessionIds);
  if (sessionError || !sessions || sessions.length === 0) return [];

  const sessionMap = new Map<string, SessionMeta>();
  for (const s of sessions) {
    sessionMap.set(String(s.id), {
      id: String(s.id),
      establishment_id: String(s.establishment_id),
      template_id: (s.template_id as string | null) ?? null,
      custom_template_id: (s.custom_template_id as string | null) ?? null,
    });
  }

  const establishmentIds = [...new Set(sessions.map((s) => String(s.establishment_id)))];
  const { data: establishments, error: establishmentError } = await supabase
    .from("establishments")
    .select("id, client_id")
    .in("id", establishmentIds);
  if (establishmentError || !establishments || establishments.length === 0) return [];

  const establishmentToClient = new Map<string, string>();
  for (const est of establishments) {
    establishmentToClient.set(String(est.id), String(est.client_id));
  }

  const clientIds = [...new Set(establishments.map((e) => String(e.client_id)))];
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, owner_user_id, legal_name, trade_name")
    .in("id", clientIds)
    .eq("owner_user_id", workspaceOwnerId);
  if (clientsError || !clients || clients.length === 0) return [];

  const clientNameMap = new Map<string, string>();
  for (const c of clients) {
    const trade = String(c.trade_name ?? "").trim();
    const legal = String(c.legal_name ?? "").trim();
    clientNameMap.set(String(c.id), trade.length > 0 ? trade : legal);
  }

  if (clientFilter && !clientNameMap.has(clientFilter)) return [];

  const templateIds = [...new Set(sessions.map((s) => s.template_id).filter(Boolean))] as string[];
  const customTemplateIds = [...new Set(sessions.map((s) => s.custom_template_id).filter(Boolean))] as string[];

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
    const validUntil = String(row.valid_until ?? "").slice(0, 10);
    if (!validUntil) continue;

    const session = sessionMap.get(String(row.session_id));
    if (!session) continue;

    const clientId = establishmentToClient.get(session.establishment_id);
    if (!clientId) continue;

    const clientName = clientNameMap.get(clientId);
    if (!clientName) continue;
    if (clientFilter && clientId !== clientFilter) continue;

    const checklistName =
      (session.template_id ? templateNameMap.get(session.template_id) : null) ??
      (session.custom_template_id
        ? customTemplateNameMap.get(session.custom_template_id)
        : null) ??
      "Checklist";

    const daysToExpire = calendarDaysUntilDueDate(validUntil, timeZone, new Date());
    const status = daysToExpire < 0 ? "vencido" : "proximo";
    const templateScope = session.template_id
      ? `template:${session.template_id}`
      : session.custom_template_id
        ? `custom:${session.custom_template_id}`
        : `session:${session.id}`;
    const scopeKey = `${clientId}|${session.establishment_id}|${templateScope}`;

    candidates.push({
      responseId: String(row.id),
      sessionId: String(row.session_id),
      clientId,
      clientName,
      checklistName,
      validUntil,
      status,
      daysToExpire,
      scopeKey,
    });
  }

  // Regra de vigência: para cada checklist (cliente + estabelecimento + template),
  // mantemos apenas a validade mais recente entre todas as execuções.
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

  return alerts.slice(0, Math.max(1, limit));
}
