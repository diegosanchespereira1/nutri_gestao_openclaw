import { describe, expect, it } from "vitest";

import {
  canDeleteWorkspaceMasterData,
  canManageTeamMembers,
  isTeamMember,
  isWorkspaceGestaoMember,
} from "@/lib/workspace";

type MaybeSingleResult = { data: { id?: string; role?: string } | null };

function mockTeamMemberLookup(result: MaybeSingleResult) {
  return {
    from: (table: string) => {
      if (table !== "team_members") {
        throw new Error(`unexpected table ${table}`);
      }
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => result,
      };
      return chain;
    },
  } as never;
}

function mockGestaoThenProfile(opts: {
  gestaoRow: { id: string } | null;
  profileRole: string | null;
}) {
  return {
    from: (table: string) => {
      if (table === "team_members") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({
            data: opts.gestaoRow,
          }),
        };
        return chain;
      }
      if (table === "profiles") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({
            data: opts.profileRole ? { role: opts.profileRole } : null,
          }),
        };
        return chain;
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as never;
}

describe("isTeamMember", () => {
  it("titular não é membro da equipa", () => {
    expect(isTeamMember("owner-1", "owner-1")).toBe(false);
  });

  it("auth diferente do titular é membro", () => {
    expect(isTeamMember("member-1", "owner-1")).toBe(true);
  });
});

describe("isWorkspaceGestaoMember", () => {
  it("titular nunca conta como gestao via team_members", async () => {
    const supabase = mockTeamMemberLookup({ data: { id: "tm-x" } });
    await expect(
      isWorkspaceGestaoMember(supabase, "owner-1", "owner-1"),
    ).resolves.toBe(false);
  });

  it("membro com job_role gestao", async () => {
    const supabase = mockTeamMemberLookup({ data: { id: "tm-gestao" } });
    await expect(
      isWorkspaceGestaoMember(supabase, "member-1", "owner-1"),
    ).resolves.toBe(true);
  });

  it("membro sem linha gestao", async () => {
    const supabase = mockTeamMemberLookup({ data: null });
    await expect(
      isWorkspaceGestaoMember(supabase, "member-1", "owner-1"),
    ).resolves.toBe(false);
  });
});

describe("canManageTeamMembers / canDeleteWorkspaceMasterData", () => {
  it("titular pode gerir e apagar", async () => {
    const supabase = mockGestaoThenProfile({
      gestaoRow: null,
      profileRole: null,
    });
    await expect(
      canManageTeamMembers(supabase, "owner-1", "owner-1"),
    ).resolves.toBe(true);
    await expect(
      canDeleteWorkspaceMasterData(supabase, "owner-1", "owner-1"),
    ).resolves.toBe(true);
  });

  it("membro gestao pode gerir e apagar", async () => {
    const supabase = mockGestaoThenProfile({
      gestaoRow: { id: "tm-g" },
      profileRole: null,
    });
    await expect(
      canManageTeamMembers(supabase, "member-1", "owner-1"),
    ).resolves.toBe(true);
    await expect(
      canDeleteWorkspaceMasterData(supabase, "member-1", "owner-1"),
    ).resolves.toBe(true);
  });

  it("admin de plataforma pode gerir e apagar", async () => {
    const supabase = mockGestaoThenProfile({
      gestaoRow: null,
      profileRole: "admin",
    });
    await expect(
      canManageTeamMembers(supabase, "admin-1", "owner-1"),
    ).resolves.toBe(true);
    await expect(
      canDeleteWorkspaceMasterData(supabase, "admin-1", "owner-1"),
    ).resolves.toBe(true);
  });

  it("super_admin de plataforma pode gerir e apagar", async () => {
    const supabase = mockGestaoThenProfile({
      gestaoRow: null,
      profileRole: "super_admin",
    });
    await expect(
      canDeleteWorkspaceMasterData(supabase, "sa-1", "owner-1"),
    ).resolves.toBe(true);
  });

  it("nutricionista não pode gerir nem apagar", async () => {
    const supabase = mockGestaoThenProfile({
      gestaoRow: null,
      profileRole: "user",
    });
    await expect(
      canManageTeamMembers(supabase, "nutri-1", "owner-1"),
    ).resolves.toBe(false);
    await expect(
      canDeleteWorkspaceMasterData(supabase, "nutri-1", "owner-1"),
    ).resolves.toBe(false);
  });
});
