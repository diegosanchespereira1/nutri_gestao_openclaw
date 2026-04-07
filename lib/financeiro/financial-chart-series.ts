import { visitDayKey } from "@/lib/datetime/calendar-tz";
import { isOpenOverdue } from "@/lib/dashboard/financial-pending";
import {
  compareMonthKeys,
  dayKeyToMonthKey,
  type ResolvedChartWindow,
} from "@/lib/financeiro/chart-window";
import type { FinancialChargeListRow } from "@/lib/types/financial-charges";

function lastNMonthKeys(
  n: number,
  timeZone: string,
  reference: Date,
): string[] {
  const todayK = visitDayKey(reference.toISOString(), timeZone);
  let y = Number.parseInt(todayK.slice(0, 4), 10);
  let m = Number.parseInt(todayK.slice(5, 7), 10);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

function currentMonthKey(reference: Date, timeZone: string): string {
  return visitDayKey(reference.toISOString(), timeZone).slice(0, 7);
}

/** Meses civis consecutivos de `startMonthKey` a `endMonthKey` (YYYY-MM), inclusive. */
export function expandMonthKeysInclusive(
  startMonthKey: string,
  endMonthKey: string,
): string[] {
  let start = startMonthKey;
  let end = endMonthKey;
  if (compareMonthKeys(start, end) > 0) {
    const t = start;
    start = end;
    end = t;
  }
  const out: string[] = [];
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function minMonthKeyPaid(charges: FinancialChargeListRow[], timeZone: string): string | null {
  let min: string | null = null;
  for (const c of charges) {
    if (c.status !== "paid" || !c.paid_at) continue;
    const mk = isoToMonthKey(c.paid_at, timeZone);
    if (min === null || mk < min) min = mk;
  }
  return min;
}

function minMonthKeyIssuedOrPaid(
  charges: FinancialChargeListRow[],
  timeZone: string,
): string | null {
  let min: string | null = null;
  for (const c of charges) {
    const ck = isoToMonthKey(c.created_at, timeZone);
    if (min === null || ck < min) min = ck;
    if (c.status === "paid" && c.paid_at) {
      const pk = isoToMonthKey(c.paid_at, timeZone);
      if (min === null || pk < min) min = pk;
    }
  }
  return min;
}

function monthKeysForWindow(
  window: ResolvedChartWindow,
  timeZone: string,
  reference: Date,
  kind: "received" | "issued_paid",
  charges: FinancialChargeListRow[],
): string[] {
  const capMk = currentMonthKey(reference, timeZone);
  if (window.mode === "months") {
    return lastNMonthKeys(window.months, timeZone, reference);
  }
  if (window.mode === "total") {
    const minMk =
      kind === "received"
        ? minMonthKeyPaid(charges, timeZone)
        : minMonthKeyIssuedOrPaid(charges, timeZone);
    if (minMk === null) return [];
    return expandMonthKeysInclusive(minMk, capMk);
  }
  const startMk = dayKeyToMonthKey(window.fromDayKey);
  let endMk = dayKeyToMonthKey(window.toDayKey);
  if (compareMonthKeys(endMk, capMk) > 0) endMk = capMk;
  return expandMonthKeysInclusive(startMk, endMk);
}

/** Primeiro dia (YYYY-MM-DD) do mês mais antigo numa janela de `monthCount` meses civis. */
export function oldestMonthFirstDayKeyInWindow(
  monthCount: number,
  timeZone: string,
  reference: Date = new Date(),
): string {
  const keys = lastNMonthKeys(monthCount, timeZone, reference);
  const first = keys[0];
  return `${first}-01`;
}

/** Limites de `due_date` para o ranking de inadimplência segundo a janela escolhida. */
export function topOverdueDateBounds(
  window: ResolvedChartWindow,
  timeZone: string,
  reference: Date = new Date(),
): { minDueDateKey: string | null; maxDueDateKey: string | null } {
  if (window.mode === "months") {
    return {
      minDueDateKey: oldestMonthFirstDayKeyInWindow(
        window.months,
        timeZone,
        reference,
      ),
      maxDueDateKey: null,
    };
  }
  if (window.mode === "total") {
    return { minDueDateKey: null, maxDueDateKey: null };
  }
  return {
    minDueDateKey: window.fromDayKey,
    maxDueDateKey: window.toDayKey,
  };
}

function formatMonthYearShort(monthKey: string, timeZone: string): string {
  const [ys, ms] = monthKey.split("-");
  const y = Number.parseInt(ys, 10);
  const mo = Number.parseInt(ms, 10);
  const base = new Date(Date.UTC(y, mo - 1, 15, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    month: "short",
    year: "numeric",
  }).format(base);
}

function isoToMonthKey(iso: string, timeZone: string): string {
  return visitDayKey(iso, timeZone).slice(0, 7);
}

export type FinancialReceivedMonthBucket = {
  monthKey: string;
  label: string;
  receivedCents: number;
};

/** Valores efetivamente recebidos por mês civil (data de `paid_at`). */
export function buildFinancialReceivedByMonthSeries(
  charges: FinancialChargeListRow[],
  timeZone: string,
  window: ResolvedChartWindow,
  reference: Date = new Date(),
): FinancialReceivedMonthBucket[] {
  const keys = monthKeysForWindow(window, timeZone, reference, "received", charges);
  const sums = new Map<string, number>();
  for (const k of keys) sums.set(k, 0);

  for (const c of charges) {
    if (c.status !== "paid" || !c.paid_at) continue;
    const mk = isoToMonthKey(c.paid_at, timeZone);
    if (sums.has(mk)) {
      sums.set(mk, (sums.get(mk) ?? 0) + c.amount_cents);
    }
  }

  return keys.map((monthKey) => ({
    monthKey,
    label: formatMonthYearShort(monthKey, timeZone),
    receivedCents: sums.get(monthKey) ?? 0,
  }));
}

export type FinancialIssuedPaidMonthBucket = {
  monthKey: string;
  label: string;
  issuedCents: number;
  paidCents: number;
};

/**
 * Por mês: soma de cobranças **criadas** (`created_at`) vs **liquidadas** (`paid_at` no mês).
 */
export function buildFinancialIssuedVsPaidSeries(
  charges: FinancialChargeListRow[],
  timeZone: string,
  window: ResolvedChartWindow,
  reference: Date = new Date(),
): FinancialIssuedPaidMonthBucket[] {
  const keys = monthKeysForWindow(window, timeZone, reference, "issued_paid", charges);
  const issued = new Map<string, number>();
  const paid = new Map<string, number>();
  for (const k of keys) {
    issued.set(k, 0);
    paid.set(k, 0);
  }

  for (const c of charges) {
    const createdMk = isoToMonthKey(c.created_at, timeZone);
    if (issued.has(createdMk)) {
      issued.set(createdMk, (issued.get(createdMk) ?? 0) + c.amount_cents);
    }
    if (c.status === "paid" && c.paid_at) {
      const paidMk = isoToMonthKey(c.paid_at, timeZone);
      if (paid.has(paidMk)) {
        paid.set(paidMk, (paid.get(paidMk) ?? 0) + c.amount_cents);
      }
    }
  }

  return keys.map((monthKey) => ({
    monthKey,
    label: formatMonthYearShort(monthKey, timeZone),
    issuedCents: issued.get(monthKey) ?? 0,
    paidCents: paid.get(monthKey) ?? 0,
  }));
}

export type FinancialTopOverdueRow = {
  clientId: string;
  label: string;
  overdueCents: number;
};

function chargeDisplayName(row: FinancialChargeListRow): string {
  const c = row.clients;
  if (!c) return "Cliente";
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

export type TopOverdueOptions = {
  /**
   * Só contabiliza atraso com `due_date` ≥ esta chave (YYYY-MM-DD).
   * Útil para limitar a análise aos vencimentos mais recentes.
   */
  minDueDateKey?: string | null;
  /** Inclusive: ignora cobranças com `due_date` > esta chave (YYYY-MM-DD). */
  maxDueDateKey?: string | null;
};

/** Top N clientes por valor em cobranças abertas vencidas (snapshot actual). */
export function buildTopClientsByOverdueAmount(
  charges: FinancialChargeListRow[],
  todayKeyStr: string,
  limit = 5,
  options?: TopOverdueOptions | null,
): FinancialTopOverdueRow[] {
  const byClient = new Map<string, { cents: number; label: string }>();
  const minDue = options?.minDueDateKey?.trim() ?? null;
  const maxDue = options?.maxDueDateKey?.trim() ?? null;

  for (const c of charges) {
    if (!isOpenOverdue(c.due_date, todayKeyStr, c.status)) continue;
    if (minDue !== null && minDue.length > 0 && c.due_date < minDue) continue;
    if (maxDue !== null && maxDue.length > 0 && c.due_date > maxDue) continue;
    const prev = byClient.get(c.client_id);
    const label = chargeDisplayName(c);
    if (prev) {
      byClient.set(c.client_id, {
        cents: prev.cents + c.amount_cents,
        label: prev.label,
      });
    } else {
      byClient.set(c.client_id, { cents: c.amount_cents, label });
    }
  }

  return [...byClient.entries()]
    .map(([clientId, v]) => ({
      clientId,
      label: v.label,
      overdueCents: v.cents,
    }))
    .sort((a, b) => b.overdueCents - a.overdueCents)
    .slice(0, limit);
}

export function financialReceivedSeriesHasData(
  buckets: FinancialReceivedMonthBucket[],
): boolean {
  return buckets.some((b) => b.receivedCents > 0);
}

export function financialIssuedPaidSeriesHasData(
  buckets: FinancialIssuedPaidMonthBucket[],
): boolean {
  return buckets.some((b) => b.issuedCents > 0 || b.paidCents > 0);
}
