import { describe, expect, it } from "vitest";

import {
  compareScheduledVisitsForDashboard,
  sortScheduledVisitsForDashboard,
} from "@/lib/visits/sort-scheduled-visits-dashboard";

function visit(
  partial: Partial<Parameters<typeof compareScheduledVisitsForDashboard>[0]>,
): Parameters<typeof compareScheduledVisitsForDashboard>[0] {
  return {
    priority: "normal",
    visit_kind: "other",
    scheduled_start: "2026-06-20T10:00:00Z",
    ...partial,
  } as Parameters<typeof compareScheduledVisitsForDashboard>[0];
}

describe("compareScheduledVisitsForDashboard", () => {
  it("urgente antes de normal", () => {
    expect(
      compareScheduledVisitsForDashboard(
        visit({ priority: "urgent" }),
        visit({ priority: "normal" }),
      ),
    ).toBeLessThan(0);
  });

  it("audit antes de patient_care", () => {
    expect(
      compareScheduledVisitsForDashboard(
        visit({ visit_kind: "audit" }),
        visit({ visit_kind: "patient_care" }),
      ),
    ).toBeLessThan(0);
  });

  it("ordena por hora se prioridade e tipo iguais", () => {
    expect(
      compareScheduledVisitsForDashboard(
        visit({ scheduled_start: "2026-06-20T09:00:00Z" }),
        visit({ scheduled_start: "2026-06-20T11:00:00Z" }),
      ),
    ).toBeLessThan(0);
  });
});

describe("sortScheduledVisitsForDashboard", () => {
  it("não muta original", () => {
    const list = [
      visit({ priority: "low" }),
      visit({ priority: "urgent" }),
    ];
    const sorted = sortScheduledVisitsForDashboard(list);
    expect(sorted[0]?.priority).toBe("urgent");
    expect(list[0]?.priority).toBe("low");
  });
});
