import { describe, expect, it } from "vitest";

import type { TenantLimits } from "@/lib/limits/tenant-limits";

import { buildLimitsSummary, formatLimitChip } from "./tenant-limits-summary";

const limites = (patch: Partial<TenantLimits> = {}): TenantLimits => ({
  tenant_user_id: "t1",
  clients_limit_enabled: true,
  clients_limit: 25,
  patients_limit_enabled: true,
  patients_limit: 25,
  team_members_enabled: true,
  team_members_unlimited: false,
  team_members_limit: 3,
  ...patch,
});

describe("buildLimitsSummary", () => {
  it("sem linha de limites, tudo é ilimitado e nada está no limite", () => {
    const r = buildLimitsSummary(null, { clients: 900, patients: 900, teamMembers: 9 });
    expect(r.clients.limit).toBeNull();
    expect(r.patients.limit).toBeNull();
    expect(r.teamMembers.enabled).toBe(false);
    expect(r.atLimit).toBe(false);
  });

  it("limite desligado vira null, mesmo com valor gravado", () => {
    const r = buildLimitsSummary(limites({ clients_limit_enabled: false }), {
      clients: 40,
      patients: 1,
      teamMembers: 0,
    });
    expect(r.clients.limit).toBeNull();
    expect(r.clients.used).toBe(40);
  });

  it("marca atLimit quando qualquer dimensão chega ao teto", () => {
    expect(buildLimitsSummary(limites(), { clients: 25, patients: 1, teamMembers: 0 }).atLimit).toBe(true);
    expect(buildLimitsSummary(limites(), { clients: 1, patients: 25, teamMembers: 0 }).atLimit).toBe(true);
    expect(buildLimitsSummary(limites(), { clients: 1, patients: 1, teamMembers: 3 }).atLimit).toBe(true);
    expect(buildLimitsSummary(limites(), { clients: 24, patients: 24, teamMembers: 2 }).atLimit).toBe(false);
  });

  it("acima do teto continua marcado", () => {
    expect(buildLimitsSummary(limites(), { clients: 99, patients: 1, teamMembers: 0 }).atLimit).toBe(true);
  });

  it("assentos ilimitados nunca marcam atLimit", () => {
    const r = buildLimitsSummary(limites({ team_members_unlimited: true }), {
      clients: 1,
      patients: 1,
      teamMembers: 500,
    });
    expect(r.teamMembers.limit).toBeNull();
    expect(r.atLimit).toBe(false);
  });

  it("equipe desabilitada não conta como no limite", () => {
    const r = buildLimitsSummary(limites({ team_members_enabled: false }), {
      clients: 1,
      patients: 1,
      teamMembers: 0,
    });
    expect(r.teamMembers.enabled).toBe(false);
    expect(r.atLimit).toBe(false);
  });
});

describe("formatLimitChip", () => {
  it("mostra uso/limite", () => {
    expect(formatLimitChip({ used: 18, limit: 25 })).toBe("18/25");
  });

  it("usa ∞ quando não há limite", () => {
    expect(formatLimitChip({ used: 40, limit: null })).toBe("40/∞");
  });

  it("equipe desabilitada vira travessão", () => {
    expect(formatLimitChip({ used: 0, limit: null, enabled: false })).toBe("—");
  });
});
