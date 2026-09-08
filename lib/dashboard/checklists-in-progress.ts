import { safeNextPath } from "@/lib/auth/safe-next-path";
import { addCalendarDays, isSameCalendarDay, todayKey } from "@/lib/datetime/calendar-tz";
import { localDateTimeInTimeZoneToUtcIso } from "@/lib/datetime/local-datetime-tz";

/** Prévia no dashboard — o suficiente para continuar sem sair do início. */
export const CHECKLISTS_IN_PROGRESS_DASHBOARD_LIMIT = 6;

/** Lista da página — teto duro contra exaustão (CWE-400). */
export const CHECKLISTS_IN_PROGRESS_LIST_LIMIT = 100;

/** Atualização automática enquanto o ecrã está visível. */
export const CHECKLISTS_IN_PROGRESS_REFRESH_MS = 20_000;

export type ChecklistInProgressSessionInput = {
  dossierApprovedAt: string | null;
  updatedAt: string;
};

export type ChecklistInProgressItem = {
  sessionId: string;
  checklistName: string;
  clientName: string;
  establishmentName: string;
  professionalLabel: string;
  updatedAt: string;
  createdAt: string;
  touchedToday: boolean;
};

export type ChecklistsInProgressSummary = {
  inProgressCount: number;
  todayCount: number;
  items: ChecklistInProgressItem[];
  truncated: boolean;
};

export function emptyChecklistsInProgressSummary(): ChecklistsInProgressSummary {
  return {
    inProgressCount: 0,
    todayCount: 0,
    items: [],
    truncated: false,
  };
}

export function isChecklistInProgress(
  dossierApprovedAt: string | null | undefined,
): boolean {
  return dossierApprovedAt == null || dossierApprovedAt.trim() === "";
}

export function isTouchedOnCalendarDay(
  updatedAtIso: string,
  timeZone: string,
  reference: Date = new Date(),
): boolean {
  return isSameCalendarDay(updatedAtIso, timeZone, reference);
}

export function summarizeChecklistsInProgress(
  sessions: ChecklistInProgressSessionInput[],
  timeZone: string,
  reference: Date = new Date(),
): { inProgressCount: number; todayCount: number } {
  let inProgressCount = 0;
  let todayCount = 0;
  for (const session of sessions) {
    if (!isChecklistInProgress(session.dossierApprovedAt)) continue;
    inProgressCount += 1;
    if (isTouchedOnCalendarDay(session.updatedAt, timeZone, reference)) {
      todayCount += 1;
    }
  }
  return { inProgressCount, todayCount };
}

/**
 * Intervalo UTC exclusivo do dia civil no fuso do profissional.
 * Usado na query de «hoje» para não puxar a tabela inteira.
 */
export function calendarDayUtcRange(
  dayKey: string,
  timeZone: string,
): { startIso: string; endExclusiveIso: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  const startIso = localDateTimeInTimeZoneToUtcIso(`${dayKey}T00:00`, timeZone);
  const nextKey = addCalendarDays(dayKey, 1, timeZone);
  const endExclusiveIso = localDateTimeInTimeZoneToUtcIso(
    `${nextKey}T00:00`,
    timeZone,
  );
  if (!startIso || !endExclusiveIso) return null;
  return { startIso, endExclusiveIso };
}

export function calendarDayUtcRangeForNow(
  timeZone: string,
  reference: Date = new Date(),
): { startIso: string; endExclusiveIso: string } | null {
  return calendarDayUtcRange(todayKey(reference, timeZone), timeZone);
}

export function buildInProgressKpiHint(todayCount: number): string {
  if (todayCount <= 0) return "nenhum movimento hoje · ver lista";
  if (todayCount === 1) return "1 com movimento hoje · ver lista";
  return `${todayCount} com movimento hoje · ver lista`;
}

export function buildInProgressAriaLabel(input: {
  inProgressCount: number;
  todayCount: number;
}): string {
  const liveNoun =
    input.inProgressCount === 1 ? "checklist em andamento" : "checklists em andamento";
  const todayNoun =
    input.todayCount === 1 ? "com movimento hoje" : "com movimento hoje";
  return `Ver ${input.inProgressCount} ${liveNoun}. ${input.todayCount} ${todayNoun}.`;
}

export function matchesInProgressSearch(
  item: Pick<
    ChecklistInProgressItem,
    "clientName" | "checklistName" | "establishmentName" | "professionalLabel"
  >,
  rawQuery: string,
): boolean {
  const query = rawQuery.trim().toLocaleLowerCase("pt-BR");
  if (!query) return true;
  const haystack = [
    item.clientName,
    item.checklistName,
    item.establishmentName,
    item.professionalLabel,
  ]
    .join(" ")
    .toLocaleLowerCase("pt-BR");
  return haystack.includes(query);
}

export function filterInProgressItems(
  items: ChecklistInProgressItem[],
  rawQuery: string,
): ChecklistInProgressItem[] {
  return items.filter((item) => matchesInProgressSearch(item, rawQuery));
}

/** Campo só vê o próprio trabalho; gestão vê o workspace (RLS continua a isolar o tenant). */
export function inProgressOwnerFilter(
  isGestor: boolean,
  authUserId: string,
): { onlyUserId: string } | null {
  if (isGestor) return null;
  return { onlyUserId: authUserId };
}

export function clampInProgressLimit(limit: number, max = CHECKLISTS_IN_PROGRESS_LIST_LIMIT): number {
  if (!Number.isFinite(limit)) return max;
  return Math.min(max, Math.max(1, Math.trunc(limit)));
}

const SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Só UUIDs entram no href de continuar — bloqueia path injection. */
export function isChecklistSessionId(value: string): boolean {
  return SESSION_ID_RE.test(value.trim());
}

export function clientDisplayName(
  tradeName: string | null | undefined,
  legalName: string | null | undefined,
): string {
  const trade = (tradeName ?? "").trim();
  const legal = (legalName ?? "").trim();
  return trade || legal || "Cliente";
}

export function buildInProgressContinueHref(
  sessionId: string,
  returnTo: string,
): string | null {
  if (!isChecklistSessionId(sessionId)) return null;
  const safeReturn = safeNextPath(returnTo);
  return `/checklists/preencher/${sessionId}?returnTo=${encodeURIComponent(safeReturn)}`;
}
