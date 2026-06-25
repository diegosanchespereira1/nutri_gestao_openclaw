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
      canManageScheduledVisit({
        supabase,
        authUserId: "u2",
        workspaceOwnerId: "owner",
        role: "member",
        visit: { user_id: "other", assigned_team_member_id: "tm-1" },
      }),
    ).resolves.toBe(true);
  });

  it("nega membro não atribuído", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "tm-2" } }),
            }),
          }),
        }),
      }),
    } as never;
    await expect(
      canManageScheduledVisit({
        supabase,
        authUserId: "u2",
        workspaceOwnerId: "owner",
        role: "member",
        visit: { user_id: "other", assigned_team_member_id: "tm-1" },
      }),
    ).resolves.toBe(false);
  });
});
