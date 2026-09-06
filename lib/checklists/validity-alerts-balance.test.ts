import { describe, expect, it } from "vitest";

import {
  balanceValidityAlerts,
  countValidityAlertsByStatus,
  filterValidityAlertsByStatus,
  resolveValidityAlertWindow,
  VALIDITY_ALERTS_PAST_DAYS,
  VALIDITY_ALERTS_UPCOMING_DAYS_DEFAULT,
} from "@/lib/checklists/validity-alerts-balance";
import type { ChecklistValidityAlert } from "@/lib/types/checklist-validity-alerts";

function alert(
  partial: Partial<ChecklistValidityAlert> & Pick<ChecklistValidityAlert, "responseId" | "status" | "validUntil">,
): ChecklistValidityAlert {
  return {
    sessionId: "s1",
    clientId: "c1",
    clientName: "Cliente",
    checklistName: "Checklist",
    daysToExpire: partial.status === "vencido" ? -1 : 5,
    ...partial,
  };
}

describe("balanceValidityAlerts", () => {
  it("mantém lista curta sem alterações", () => {
    const list = [
      alert({ responseId: "1", status: "proximo", validUntil: "2026-08-01" }),
    ];
    expect(balanceValidityAlerts(list, 8)).toEqual(list);
  });

  it("inclui itens a vencer quando vencidos preencheriam o limite", () => {
    const vencidos = Array.from({ length: 10 }, (_, i) =>
      alert({
        responseId: `v${i}`,
        status: "vencido",
        validUntil: `2026-06-${String(i + 1).padStart(2, "0")}`,
      }),
    );
    const proximos = [
      alert({ responseId: "p1", status: "proximo", validUntil: "2026-08-15" }),
      alert({ responseId: "p2", status: "proximo", validUntil: "2026-09-01" }),
    ];
    const balanced = balanceValidityAlerts([...vencidos, ...proximos], 8);
    expect(balanced.some((a) => a.status === "proximo")).toBe(true);
    expect(balanced.some((a) => a.status === "vencido")).toBe(true);
    expect(balanced).toHaveLength(8);
  });
});

describe("resolveValidityAlertWindow", () => {
  it("mantém a janela mista do dashboard", () => {
    expect(resolveValidityAlertWindow()).toEqual({
      withinDays: VALIDITY_ALERTS_UPCOMING_DAYS_DEFAULT,
      pastDays: VALIDITY_ALERTS_PAST_DAYS,
    });
  });

  it("restringe vencidos ao último ano até hoje", () => {
    expect(resolveValidityAlertWindow({ status: "vencido" })).toEqual({
      withinDays: 0,
      pastDays: VALIDITY_ALERTS_PAST_DAYS,
    });
  });

  it("restringe a vencer a hoje até 90 dias", () => {
    expect(resolveValidityAlertWindow({ status: "proximo" })).toEqual({
      withinDays: VALIDITY_ALERTS_UPCOMING_DAYS_DEFAULT,
      pastDays: 0,
    });
  });
});

describe("filterValidityAlertsByStatus / countValidityAlertsByStatus", () => {
  const mixed = [
    alert({ responseId: "v1", status: "vencido", validUntil: "2026-08-01" }),
    alert({ responseId: "p1", status: "proximo", validUntil: "2026-09-10" }),
    alert({ responseId: "v2", status: "vencido", validUntil: "2026-07-01" }),
  ];

  it("filtra um único estado", () => {
    expect(filterValidityAlertsByStatus(mixed, "vencido")).toHaveLength(2);
    expect(filterValidityAlertsByStatus(mixed, "proximo")).toHaveLength(1);
  });

  it("conta vencidos e próximos", () => {
    expect(countValidityAlertsByStatus(mixed)).toEqual({
      vencidos: 2,
      proximos: 1,
    });
  });
});
