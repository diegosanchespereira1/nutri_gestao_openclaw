import { describe, expect, it } from "vitest";

import { balanceValidityAlerts } from "@/lib/checklists/validity-alerts-balance";
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
