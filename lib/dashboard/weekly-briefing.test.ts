import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildWeeklyBriefing } from "@/lib/dashboard/weekly-briefing";

const TZ = "America/Sao_Paulo";

describe("buildWeeklyBriefing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filtra visitas na janela de 7 dias", () => {
    const briefing = buildWeeklyBriefing(
      [
        {
          id: "v1",
          status: "scheduled",
          scheduled_start: "2026-06-21T10:00:00Z",
          target_type: "patient",
          patients: { full_name: "Ana" },
        } as never,
        {
          id: "v2",
          status: "cancelled",
          scheduled_start: "2026-06-21T10:00:00Z",
        } as never,
      ],
      [],
      TZ,
    );
    expect(briefing.totalVisitsInWindow).toBe(1);
    expect(briefing.visits[0]?.title).toBe("Ana");
    expect(briefing.rangeLabel).toContain(" a ");
  });

  it("limita alertas e visitas", () => {
    const visits = Array.from({ length: 15 }, (_, i) => ({
      id: `v${i}`,
      status: "scheduled",
      scheduled_start: "2026-06-20T14:00:00Z",
      target_type: "establishment",
      establishments: { name: `E${i}` },
    })) as never[];
    const alerts = Array.from({ length: 15 }, (_, i) => ({
      due_date: "2026-06-22",
      id: `a${i}`,
    })) as never[];
    const b = buildWeeklyBriefing(visits, alerts, TZ);
    expect(b.visits).toHaveLength(10);
    expect(b.alerts).toHaveLength(10);
    expect(b.totalVisitsInWindow).toBe(15);
  });
});
