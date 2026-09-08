import { visitKindLabel } from "@/lib/constants/visit-kinds";
import { visitPriorityLabel } from "@/lib/constants/visit-priorities";
import { visitStatusLabel } from "@/lib/constants/visit-status";
import { visitDayKey } from "@/lib/datetime/calendar-tz";
import type {
  ScheduledVisitWithTargets,
  VisitKind,
  VisitPriority,
  VisitStatus,
} from "@/lib/types/visits";
import {
  enrichVisitWithProfessional,
  visitDisplayTitle,
  visitProfessionalLabel,
  visitProfessionalName,
} from "@/lib/visits/display-title";
import {
  ALL_PROFESSIONALS,
  visitMatchesProfessionalFilter,
  visitProfessionalFilterKey,
} from "@/lib/visits/visit-professional-filter";
import type { TeamMemberRow } from "@/lib/types/team-members";

export const ALL_REPORT_FILTER = "all";

export const VISIT_REPORT_GROUPS = [
  "nutri",
  "client",
  "date",
  "kind",
] as const;

export type VisitReportGroup = (typeof VISIT_REPORT_GROUPS)[number];

export type VisitReportRow = {
  id: string;
  user_id: string;
  assigned_team_member_id: string | null;
  scheduled_start: string;
  dayKey: string;
  clientKey: string;
  clientLabel: string;
  targetName: string;
  targetType: "establishment" | "patient";
  kind: VisitKind;
  kindLabel: string;
  professionalKey: string;
  professionalLabel: string;
  professionalName: string;
  status: VisitStatus;
  statusLabel: string;
  priority: VisitPriority;
  priorityLabel: string;
  notes: string | null;
  dossierStatusLabel: string;
};

export type VisitReportFilters = {
  fromDay: string;
  toDay: string;
  clientKey: string;
  professionalKey: string;
  kind: string;
};

export type VisitReportGroupBucket = {
  key: string;
  label: string;
  visits: number;
  clients: number;
  kinds: number;
};

export type VisitReportKpis = {
  completed: number;
  professionals: number;
  clients: number;
  kinds: number;
};

function normalizeEmbed<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function clientDisplayName(
  clients:
    | { trade_name?: string | null; legal_name?: string | null }
    | null
    | undefined,
): string | null {
  if (!clients) return null;
  const trade = clients.trade_name?.trim();
  if (trade) return trade;
  const legal = clients.legal_name?.trim();
  return legal || null;
}

export function visitClientRef(visit: ScheduledVisitWithTargets): {
  key: string;
  label: string;
} {
  if (visit.target_type === "establishment") {
    const est = normalizeEmbed(visit.establishments);
    const clientId = est?.client_id;
    const label =
      clientDisplayName(est?.clients ?? null) ??
      est?.name?.trim() ??
      "Cliente não indicado";
    return {
      key: clientId ? `client:${clientId}` : `establishment:${est?.id ?? visit.id}`,
      label,
    };
  }

  const patient = normalizeEmbed(visit.patients);
  const clientId = patient?.client_id;
  const fromClient = clientDisplayName(patient?.clients ?? null);
  if (clientId || fromClient) {
    return {
      key: clientId ? `client:${clientId}` : `patient-client:${patient?.id ?? visit.id}`,
      label: fromClient ?? "Cliente não indicado",
    };
  }

  return {
    key: `patient:${patient?.id ?? visit.id}`,
    label: patient?.full_name?.trim() || "Paciente sem cliente",
  };
}

function dossierStatusLabel(visit: ScheduledVisitWithTargets): string {
  if (visit.dossier_email_send_status === "sent") return "Dossiê enviado";
  if (visit.dossier_email_send_status === "failed") return "Falha no envio";
  return "Sem envio";
}

export function startOfMonthDayKey(dayKey: string): string {
  return `${dayKey.slice(0, 7)}-01`;
}

export function toVisitReportRow(
  visit: ScheduledVisitWithTargets,
  timeZone: string,
): VisitReportRow {
  const client = visitClientRef(visit);
  return {
    id: visit.id,
    user_id: visit.user_id,
    assigned_team_member_id: visit.assigned_team_member_id,
    scheduled_start: visit.scheduled_start,
    dayKey: visitDayKey(visit.scheduled_start, timeZone),
    clientKey: client.key,
    clientLabel: client.label,
    targetName: visitDisplayTitle(visit),
    targetType: visit.target_type,
    kind: visit.visit_kind,
    kindLabel: visitKindLabel[visit.visit_kind],
    professionalKey: visitProfessionalFilterKey(visit),
    professionalLabel: visitProfessionalLabel(visit, visit.creator_full_name),
    professionalName: visitProfessionalName(visit, visit.creator_full_name),
    status: visit.status,
    statusLabel: visitStatusLabel[visit.status],
    priority: visit.priority,
    priorityLabel: visitPriorityLabel[visit.priority],
    notes: visit.notes,
    dossierStatusLabel: dossierStatusLabel(visit),
  };
}

export function buildVisitReportRows(
  visits: ScheduledVisitWithTargets[],
  teamMembers: readonly Pick<
    TeamMemberRow,
    "id" | "full_name" | "job_role" | "member_user_id"
  >[],
  timeZone: string,
): VisitReportRow[] {
  return visits
    .filter((visit) => visit.status === "completed")
    .map((visit) =>
      toVisitReportRow(enrichVisitWithProfessional(visit, teamMembers), timeZone),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_start).getTime() -
        new Date(b.scheduled_start).getTime(),
    );
}

export function filterVisitReportRows(
  rows: VisitReportRow[],
  filters: VisitReportFilters,
  memberUserIdByTeamMemberId: ReadonlyMap<string, string | null>,
): VisitReportRow[] {
  return rows.filter((row) => {
    if (row.dayKey < filters.fromDay || row.dayKey > filters.toDay) return false;
    if (
      filters.clientKey !== ALL_REPORT_FILTER &&
      row.clientKey !== filters.clientKey
    ) {
      return false;
    }
    if (filters.kind !== ALL_REPORT_FILTER && row.kind !== filters.kind) {
      return false;
    }
    if (filters.professionalKey === ALL_PROFESSIONALS) return true;
    return visitMatchesProfessionalFilter(
      {
        assigned_team_member_id: row.assigned_team_member_id,
        user_id: row.user_id,
      },
      filters.professionalKey,
      memberUserIdByTeamMemberId,
    );
  });
}

export function visitReportKpis(rows: VisitReportRow[]): VisitReportKpis {
  return {
    completed: rows.length,
    professionals: new Set(rows.map((row) => row.professionalKey)).size,
    clients: new Set(rows.map((row) => row.clientKey)).size,
    kinds: new Set(rows.map((row) => row.kind)).size,
  };
}

export function groupVisitReportRows(
  rows: VisitReportRow[],
  groupBy: VisitReportGroup,
): VisitReportGroupBucket[] {
  const buckets = new Map<string, VisitReportRow[]>();
  for (const row of rows) {
    const key =
      groupBy === "client"
        ? row.clientKey
        : groupBy === "date"
          ? row.dayKey
          : groupBy === "kind"
            ? row.kind
            : row.professionalKey;
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }

  return [...buckets.entries()]
    .map(([key, list]) => ({
      key,
      label:
        groupBy === "client"
          ? (list[0]?.clientLabel ?? key)
          : groupBy === "date"
            ? key.split("-").reverse().join("/")
            : groupBy === "kind"
              ? (list[0]?.kindLabel ?? key)
              : (list[0]?.professionalName ?? key),
      visits: list.length,
      clients: new Set(list.map((row) => row.clientKey)).size,
      kinds: new Set(list.map((row) => row.kind)).size,
    }))
    .sort((a, b) => b.visits - a.visits || a.label.localeCompare(b.label, "pt-BR"));
}

export function buildVisitReportClientOptions(
  rows: VisitReportRow[],
): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (!seen.has(row.clientKey)) seen.set(row.clientKey, row.clientLabel);
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function parseVisitReportGroup(raw: string | null | undefined): VisitReportGroup {
  if (raw && VISIT_REPORT_GROUPS.includes(raw as VisitReportGroup)) {
    return raw as VisitReportGroup;
  }
  return "nutri";
}
