type SupabaseService = "auth" | "database" | "storage";

type BudgetEvent = {
  service: SupabaseService;
  endpoint: string;
  userId?: string | null;
  source: string;
  count?: number;
};

function parseBudgetLimit(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRequestBudgetPerUserPerHour(service: SupabaseService): number {
  if (service === "auth") {
    return parseBudgetLimit(process.env.BUDGET_AUTH_PER_USER_HOUR, 250);
  }
  if (service === "database") {
    return parseBudgetLimit(process.env.BUDGET_DATABASE_PER_USER_HOUR, 1200);
  }
  return parseBudgetLimit(process.env.BUDGET_STORAGE_PER_USER_HOUR, 1500);
}

export function logBudgetEvent(event: BudgetEvent): void {
  const payload = {
    type: "supabase_request_budget_event",
    ...event,
    count: event.count ?? 1,
    budgetPerUserHour: getRequestBudgetPerUserPerHour(event.service),
  };
  console.info("[budget]", payload);
}
