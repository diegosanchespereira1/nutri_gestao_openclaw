import { describe, expect, it } from "vitest";

import {
  applyFinancialChargeFilters,
  parseChargeFilterClientId,
  parseChargeFilterStatus,
} from "./charge-filters";
import type { FinancialChargeListRow } from "@/lib/types/financial-charges";

function row(
  partial: Partial<FinancialChargeListRow> & {
    id: string;
    client_id: string;
    due_date: string;
    status: "open" | "paid";
  },
): FinancialChargeListRow {
  return {
    description: "",
    amount_cents: 1000,
    paid_at: null,
    created_at: "2026-01-10T12:00:00.000Z",
    clients: null,
    ...partial,
  };
}

describe("parseChargeFilterStatus", () => {
  it("default all", () => {
    expect(parseChargeFilterStatus(undefined)).toBe("all");
    expect(parseChargeFilterStatus("")).toBe("all");
    expect(parseChargeFilterStatus("nope")).toBe("all");
  });
  it("accepts known", () => {
    expect(parseChargeFilterStatus("overdue")).toBe("overdue");
  });
});

describe("parseChargeFilterClientId", () => {
  it("rejects invalid", () => {
    expect(parseChargeFilterClientId(undefined)).toBeNull();
    expect(parseChargeFilterClientId("not-uuid")).toBeNull();
  });
  it("accepts uuid", () => {
    const id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    expect(parseChargeFilterClientId(id)).toBe(id);
  });
});

describe("applyFinancialChargeFilters", () => {
  const today = "2026-04-06";
  const rows: FinancialChargeListRow[] = [
    row({
      id: "1",
      client_id: "c1",
      due_date: "2026-04-01",
      status: "open",
    }),
    row({
      id: "2",
      client_id: "c1",
      due_date: "2026-05-01",
      status: "open",
    }),
    row({
      id: "3",
      client_id: "c2",
      due_date: "2026-03-01",
      status: "paid",
      paid_at: "2026-03-02T12:00:00Z",
    }),
  ];

  it("filters overdue", () => {
    const f = applyFinancialChargeFilters(
      rows,
      { status: "overdue", clientId: null },
      today,
    );
    expect(f.map((r) => r.id)).toEqual(["1"]);
  });

  it("filters client and open", () => {
    const f = applyFinancialChargeFilters(
      rows,
      { status: "open", clientId: "c1" },
      today,
    );
    expect(f.map((r) => r.id)).toEqual(["1", "2"]);
  });
});
