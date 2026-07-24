import { describe, expect, it, vi } from "vitest";

import {
  canCancelScheduledVisit,
  canManageScheduledVisit,
  canViewAllWorkspaceVisits,
  resolveAssignedTeamMemberIdOnCreate,
  resolveTeamMemberIdForAuthUser,
} from "@/lib/visits/agenda-access";

describe("canViewAllWorkspaceVisits", () => {
  it("titular vê tudo", () => {
    expect(canViewAllWorkspaceVisits("u1", "u1", "member")).toBe(true);
  });

  it("admin vê tudo", () => {
    expect(canViewAllWorkspaceVisits("u2", "u1", "admin")).toBe(true);
  });

  it("membro comum não vê tudo", () => {
    expect(canViewAllWorkspaceVisits("u2", "u1", "member")).toBe(false);
  });

  it("gestao vê tudo", () => {
    expect(canViewAllWorkspaceVisits("u2", "u1", "user", true)).toBe(true);
  });
});

describe("canCancelScheduledVisit", () => {
  it("criador pode cancelar", () => {
    expect(
      canCancelScheduledVisit("u1", "owner", "member", { user_id: "u1" }),
    ).toBe(true);
  });

  it("titular pode cancelar", () => {
    expect(
      canCancelScheduledVisit("owner", "owner", "member", { user_id: "u2" }),
    ).toBe(true);
  });

  it("gestao pode cancelar", () => {
    expect(
      canCancelScheduledVisit("g1", "owner", "user", { user_id: "u2" }, true),
    ).toBe(true);
  });
});

describe("resolveTeamMemberIdForAuthUser", () => {
  it("devolve id do membro", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "tm-1" } }),
            }),
          }),
        }),
      }),
    } as never;
    await expect(
      resolveTeamMemberIdForAuthUser(supabase, "u1", "owner"),
    ).resolves.toBe("tm-1");
  });
});

describe("resolveAssignedTeamMemberIdOnCreate", () => {
  it("usa valor explícito", async () => {
    const supabase = {} as never;
    await expect(
      resolveAssignedTeamMemberIdOnCreate(supabase, "u1", "o", " tm-9 "),
    ).resolves.toBe("tm-9");
  });

  it("resolve membro quando vazio", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "tm-auto" } }),
            }),
          }),
        }),
      }),
    } as never;
    await expect(
      resolveAssignedTeamMemberIdOnCreate(supabase, "u1", "o", ""),
    ).resolves.toBe("tm-auto");
  });
});

describe("canManageScheduledVisit", () => {
  function mockTeamMemberQueries(results: Array<{ id: string } | null>) {
    let i = 0;
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => {
        const data = results[i] ?? null;
        i += 1;
        return { data };
      },
    };
    return { from: () => chain } as never;
  }

  it("admin gere qualquer visita", async () => {
    const supabase = {} as never;
    await expect(
      canManageScheduledVisit({
        supabase,
        authUserId: "admin",
        workspaceOwnerId: "owner",
        role: "admin",
        visit: { user_id: "other", assigned_team_member_id: null },
      }),
    ).resolves.toBe(true);
  });

  it("membro atribuído gere visita", async () => {
    const supabase = mockTeamMemberQueries([null, { id: "tm-1" }]);
    await expect(
      canManageScheduledVisit({
        supabase,
        authUserId: "u2",
        workspaceOwnerId: "owner",
        role: "user",
        visit: { user_id: "other", assigned_team_member_id: "tm-1" },
      }),
    ).resolves.toBe(true);
  });

  it("nega membro não atribuído", async () => {
    const supabase = mockTeamMemberQueries([null, { id: "tm-2" }]);
    await expect(
      canManageScheduledVisit({
        supabase,
        authUserId: "u2",
        workspaceOwnerId: "owner",
        role: "user",
        visit: { user_id: "other", assigned_team_member_id: "tm-1" },
      }),
    ).resolves.toBe(false);
  });

  it("gestao gere qualquer visita", async () => {
    const supabase = mockTeamMemberQueries([{ id: "tm-g" }]);
    await expect(
      canManageScheduledVisit({
        supabase,
        authUserId: "gestao-1",
        workspaceOwnerId: "owner",
        role: "user",
        visit: { user_id: "other", assigned_team_member_id: null },
      }),
    ).resolves.toBe(true);
  });
});
