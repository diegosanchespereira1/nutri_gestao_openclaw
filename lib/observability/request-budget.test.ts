import { describe, expect, it, vi } from "vitest";

import {
  getRequestBudgetPerUserPerHour,
  logBudgetEvent,
} from "@/lib/observability/request-budget";

describe("getRequestBudgetPerUserPerHour", () => {
  it("usa fallback quando env não existe", () => {
    expect(getRequestBudgetPerUserPerHour("auth")).toBe(250);
    expect(getRequestBudgetPerUserPerHour("database")).toBe(1200);
    expect(getRequestBudgetPerUserPerHour("storage")).toBe(1500);
  });
});

describe("logBudgetEvent", () => {
  it("loga payload estruturado com count default", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logBudgetEvent({
      service: "auth",
      endpoint: "/auth/v1/user",
      source: "middleware",
      userId: "u1",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const [, payload] = spy.mock.calls[0] ?? [];
    expect(payload).toMatchObject({
      type: "supabase_request_budget_event",
      service: "auth",
      endpoint: "/auth/v1/user",
      count: 1,
      userId: "u1",
    });
    spy.mockRestore();
  });
});
