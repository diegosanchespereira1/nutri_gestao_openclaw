import { isOpenOverdue } from "@/lib/dashboard/financial-pending";
import type { FinancialChargeListRow } from "@/lib/types/financial-charges";

export type FinancialChargeFilterStatus = "all" | "open" | "paid" | "overdue";

export function parseChargeFilterStatus(
  raw: string | undefined,
): FinancialChargeFilterStatus {
  if (raw === "open" || raw === "paid" || raw === "overdue") return raw;
  return "all";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseChargeFilterClientId(
  raw: string | undefined,
): string | null {
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw;
}

export function applyFinancialChargeFilters(
  rows: FinancialChargeListRow[],
  filter: {
    status: FinancialChargeFilterStatus;
    clientId: string | null;
  },
  todayKey: string,
): FinancialChargeListRow[] {
  let out = rows;
  if (filter.clientId) {
    out = out.filter((r) => r.client_id === filter.clientId);
  }
  switch (filter.status) {
    case "open":
      out = out.filter((r) => r.status === "open");
      break;
    case "paid":
      out = out.filter((r) => r.status === "paid");
      break;
    case "overdue":
      out = out.filter((r) =>
        isOpenOverdue(r.due_date, todayKey, r.status),
      );
      break;
    default:
      break;
  }
  return out;
}
