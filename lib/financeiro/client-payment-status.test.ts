import { describe, expect, it } from "vitest";

import {
  buildClientPaymentStatusRows,
  metricsFromClientCharges,
} from "./client-payment-status";
import type { FinancialChargeListRow } from "@/lib/types/financial-charges";

const today = "2026-04-06";

function ch(
  partial: Partial<FinancialChargeListRow> & {
    id: string;
    client_id: string;
    due_date: string;
    status: "open" | "paid";
  },
): FinancialChargeListRow {
  return {
    description: "",
    amount_cents: 10000,
    paid_at: null,
    created_at: "2026-01-10T12:00:00.000Z",
    clients: null,
    ...partial,
  };
}

describe("buildClientPaymentStatusRows", () => {
  it("prioriza clientes com inadimplência", () => {
    const clients = [
      { id: "a", legal_name: "Alfa", trade_name: null },
      { id: "b", legal_name: "Beta", trade_name: null },
    ];
    const charges: FinancialChargeListRow[] = [
      ch({
        id: "1",
        client_id: "b",
        due_date: "2026-05-01",
        status: "open",
      }),
      ch({
        id: "2",
        client_id: "a",
        due_date: "2026-01-01",
        status: "open",
      }),
    ];
    const rows = buildClientPaymentStatusRows(clients, charges, today);
    expect(rows[0].clientId).toBe("a");
    expect(rows[0].hasDelinquency).toBe(true);
    expect(rows[1].hasDelinquency).toBe(false);
  });
});

describe("metricsFromClientCharges", () => {
  it("agrega aberto e atraso", () => {
    const charges: FinancialChargeListRow[] = [
      ch({
        id: "1",
        client_id: "x",
        due_date: "2026-01-01",
        status: "open",
        amount_cents: 500,
      }),
      ch({
        id: "2",
        client_id: "x",
        due_date: "2026-12-01",
        status: "open",
        amount_cents: 300,
      }),
    ];
    const m = metricsFromClientCharges(charges, today);
    expect(m.overdueCount).toBe(1);
    expect(m.openCount).toBe(2);
    expect(m.overdueTotalCents).toBe(500);
    expect(m.openTotalCents).toBe(800);
  });
});
