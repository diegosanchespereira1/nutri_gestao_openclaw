import type { FinancialChargeStatus } from "@/lib/types/financial-charges";

/** Comparação lexicográfica válida para chaves `YYYY-MM-DD`. */
export function isCalendarDayKeyBefore(a: string, b: string): boolean {
  return a < b;
}

export function isOpenOverdue(
  dueDateKey: string,
  todayKeyStr: string,
  status: FinancialChargeStatus,
): boolean {
  return status === "open" && isCalendarDayKeyBefore(dueDateKey, todayKeyStr);
}

export function summarizeOverdueCharges(
  rows: Array<{
    due_date: string;
    amount_cents: number;
    status: FinancialChargeStatus;
  }>,
  todayKeyStr: string,
): { overdueCount: number; overdueTotalCents: number } {
  let overdueCount = 0;
  let overdueTotalCents = 0;
  for (const r of rows) {
    if (isOpenOverdue(r.due_date, todayKeyStr, r.status)) {
      overdueCount += 1;
      overdueTotalCents += r.amount_cents;
    }
  }
  return { overdueCount, overdueTotalCents };
}

export function formatBRLFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
