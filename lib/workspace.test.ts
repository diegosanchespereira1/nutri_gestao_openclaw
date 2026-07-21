import { describe, expect, it } from "vitest";

import {
  canDeleteWorkspaceMasterData,
  canManageTeamMembers,
  canToggleTeamMemberActive,
  isTeamMember,
  isWorkspaceGestaoMember,
} from "@/lib/workspace";

type MaybeSingleResult = { data: { id?: string; role?: string; job_role?: string } | null };

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
            data: opts.gestaoRow
              ? { ...opts.gestaoRow, job_role: "gestao" }
              : null,
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

function mockTeamMemberThenProfile(opts: {
  teamRow: { id: string; job_role: string } | null;
  profileRole: string | null;
}) {
  return {
    from: (table: string) => {
      if (table === "team_members") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data: opts.teamRow }),
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

  it("consulta inclui filtro is_active=true", async () => {
    const eqs: Array<[string, unknown]> = [];
    const supabase = {
      from: (table: string) => {
        if (table !== "team_members") throw new Error(`unexpected ${table}`);
        const chain = {
          select: () => chain,
          eq: (col: string, val: unknown) => {
            eqs.push([col, val]);
            return chain;
          },
          maybeSingle: async () => ({ data: { id: "tm-1" } }),
        };
        return chain;
      },
    } as never;

    await expect(
      isWorkspaceGestaoMember(supabase, "member-1", "owner-1"),
    ).resolves.toBe(true);
    expect(eqs).toContainEqual(["is_active", true]);
    expect(eqs).toContainEqual(["job_role", "gestao"]);
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

  it("administrativo pode gerir equipe mas não apagar dados mestres", async () => {
    const manageClient = mockTeamMemberThenProfile({
      teamRow: { id: "tm-adm", job_role: "administrativo" },
      profileRole: "user",
    });
    await expect(
      canManageTeamMembers(manageClient, "adm-1", "owner-1"),
    ).resolves.toBe(true);

    const deleteClient = mockGestaoThenProfile({
      gestaoRow: null,
      profileRole: "user",
    });
    await expect(
      canDeleteWorkspaceMasterData(deleteClient, "adm-1", "owner-1"),
    ).resolves.toBe(false);
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

describe("canToggleTeamMemberActive", () => {
  it("titular pode ativar/desativar", async () => {
    const supabase = mockTeamMemberThenProfile({
      teamRow: null,
      profileRole: null,
    });
    await expect(
      canToggleTeamMemberActive(supabase, "owner-1", "owner-1"),
    ).resolves.toBe(true);
  });

  it("administrativo ativo pode ativar/desativar (mesmo que canManage)", async () => {
    const supabase = mockTeamMemberThenProfile({
      teamRow: { id: "tm-adm", job_role: "administrativo" },
      profileRole: "user",
    });
    await expect(
      canToggleTeamMemberActive(supabase, "adm-1", "owner-1"),
    ).resolves.toBe(true);
    await expect(
      canManageTeamMembers(supabase, "adm-1", "owner-1"),
    ).resolves.toBe(true);
  });

  it("gestao ativo pode ativar/desativar", async () => {
    const supabase = mockTeamMemberThenProfile({
      teamRow: { id: "tm-g", job_role: "gestao" },
      profileRole: "user",
    });
    await expect(
      canToggleTeamMemberActive(supabase, "gestao-1", "owner-1"),
    ).resolves.toBe(true);
  });

  it("nutricionista não pode ativar/desativar", async () => {
    const supabase = mockTeamMemberThenProfile({
      teamRow: { id: "tm-n", job_role: "nutricionista" },
      profileRole: "user",
    });
    await expect(
      canToggleTeamMemberActive(supabase, "nutri-1", "owner-1"),
    ).resolves.toBe(false);
  });
});
