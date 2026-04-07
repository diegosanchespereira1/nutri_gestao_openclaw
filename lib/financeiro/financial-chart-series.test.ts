import { describe, expect, it } from "vitest";

import type { FinancialChargeListRow } from "@/lib/types/financial-charges";

import {
  buildFinancialIssuedVsPaidSeries,
  buildFinancialReceivedByMonthSeries,
  buildTopClientsByOverdueAmount,
  expandMonthKeysInclusive,
} from "./financial-chart-series";

const tz = "Europe/Lisbon";

function ch(
  partial: Partial<FinancialChargeListRow> & {
    id: string;
    client_id: string;
    amount_cents: number;
    due_date: string;
    status: "open" | "paid";
    created_at: string;
    paid_at: string | null;
  },
): FinancialChargeListRow {
  return {
    description: "",
    clients: {
      legal_name: "Cliente X",
      trade_name: null,
    },
    ...partial,
  };
}

describe("buildFinancialReceivedByMonthSeries", () => {
  it("soma pagamentos pelo mês de paid_at", () => {
    const ref = new Date("2026-04-15T12:00:00.000Z");
    const charges: FinancialChargeListRow[] = [
      ch({
        id: "1",
        client_id: "c1",
        amount_cents: 10_000,
        due_date: "2026-03-01",
        status: "paid",
        created_at: "2026-03-01T10:00:00.000Z",
        paid_at: "2026-04-02T14:00:00.000Z",
      }),
    ];
    const s = buildFinancialReceivedByMonthSeries(charges, tz, { mode: "months", months: 6 }, ref);
    const april = s.find((b) => b.monthKey === "2026-04");
    expect(april?.receivedCents).toBe(10_000);
  });
});

describe("buildFinancialIssuedVsPaidSeries", () => {
  it("separa criado vs pago por mês", () => {
    const ref = new Date("2026-04-15T12:00:00.000Z");
    const charges: FinancialChargeListRow[] = [
      ch({
        id: "1",
        client_id: "c1",
        amount_cents: 5000,
        due_date: "2026-04-20",
        status: "open",
        created_at: "2026-04-01T10:00:00.000Z",
        paid_at: null,
      }),
      ch({
        id: "2",
        client_id: "c1",
        amount_cents: 3000,
        due_date: "2026-03-01",
        status: "paid",
        created_at: "2026-03-01T10:00:00.000Z",
        paid_at: "2026-04-10T12:00:00.000Z",
      }),
    ];
    const s = buildFinancialIssuedVsPaidSeries(charges, tz, { mode: "months", months: 6 }, ref);
    const april = s.find((b) => b.monthKey === "2026-04");
    expect(april?.issuedCents).toBe(5000);
    expect(april?.paidCents).toBe(3000);
  });
});

describe("buildTopClientsByOverdueAmount", () => {
  it("ordena por valor em atraso", () => {
    const today = "2026-04-06";
    const charges: FinancialChargeListRow[] = [
      ch({
        id: "1",
        client_id: "a",
        amount_cents: 100,
        due_date: "2026-01-01",
        status: "open",
        created_at: "2026-01-01T10:00:00.000Z",
        paid_at: null,
        clients: { legal_name: "A", trade_name: null },
      }),
      ch({
        id: "2",
        client_id: "b",
        amount_cents: 500,
        due_date: "2026-01-01",
        status: "open",
        created_at: "2026-01-01T10:00:00.000Z",
        paid_at: null,
        clients: { legal_name: "B", trade_name: null },
      }),
    ];
    const top = buildTopClientsByOverdueAmount(charges, today, 5);
    expect(top[0].clientId).toBe("b");
    expect(top[0].overdueCents).toBe(500);
  });

  it("exclui atraso com vencimento antes de minDueDateKey", () => {
    const today = "2026-04-06";
    const charges: FinancialChargeListRow[] = [
      ch({
        id: "1",
        client_id: "old",
        amount_cents: 900,
        due_date: "2020-01-01",
        status: "open",
        created_at: "2020-01-01T10:00:00.000Z",
        paid_at: null,
        clients: { legal_name: "Velho", trade_name: null },
      }),
      ch({
        id: "2",
        client_id: "new",
        amount_cents: 100,
        due_date: "2026-03-01",
        status: "open",
        created_at: "2026-02-01T10:00:00.000Z",
        paid_at: null,
        clients: { legal_name: "Recente", trade_name: null },
      }),
    ];
    const top = buildTopClientsByOverdueAmount(charges, today, 5, {
      minDueDateKey: "2026-02-01",
    });
    expect(top).toHaveLength(1);
    expect(top[0].clientId).toBe("new");
  });

  it("exclui atraso com vencimento depois de maxDueDateKey", () => {
    const today = "2026-04-06";
    const charges: FinancialChargeListRow[] = [
      ch({
        id: "1",
        client_id: "afterMax",
        amount_cents: 900,
        due_date: "2026-04-05",
        status: "open",
        created_at: "2026-01-01T10:00:00.000Z",
        paid_at: null,
        clients: { legal_name: "Fora do teto", trade_name: null },
      }),
      ch({
        id: "2",
        client_id: "ok",
        amount_cents: 100,
        due_date: "2026-03-01",
        status: "open",
        created_at: "2026-02-01T10:00:00.000Z",
        paid_at: null,
        clients: { legal_name: "Dentro", trade_name: null },
      }),
    ];
    const top = buildTopClientsByOverdueAmount(charges, today, 5, {
      maxDueDateKey: "2026-04-01",
    });
    expect(top).toHaveLength(1);
    expect(top[0].clientId).toBe("ok");
  });
});

describe("expandMonthKeysInclusive", () => {
  it("lista meses entre dois YYYY-MM", () => {
    expect(expandMonthKeysInclusive("2026-01", "2026-03")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
  });
});

describe("buildFinancialReceivedByMonthSeries (total)", () => {
  it("inclui desde o primeiro pagamento até ao mês actual", () => {
    const ref = new Date("2026-04-15T12:00:00.000Z");
    const charges: FinancialChargeListRow[] = [
      ch({
        id: "1",
        client_id: "c1",
        amount_cents: 1000,
        due_date: "2025-01-01",
        status: "paid",
        created_at: "2025-01-01T10:00:00.000Z",
        paid_at: "2025-02-01T10:00:00.000Z",
      }),
    ];
    const s = buildFinancialReceivedByMonthSeries(
      charges,
      tz,
      { mode: "total" },
      ref,
    );
    expect(s.length).toBeGreaterThan(0);
    expect(s[0]?.monthKey).toBe("2025-02");
    expect(s.some((b) => b.monthKey === "2026-04")).toBe(true);
    expect(s.at(-1)?.monthKey).toBe("2026-04");
  });
});
