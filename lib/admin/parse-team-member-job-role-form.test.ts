import { describe, expect, it } from "vitest";

import { parseTeamMemberJobRoleForm } from "./parse-team-member-job-role-form";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

const validos = {
  member_id: "11111111-1111-1111-1111-111111111111",
  profile_id: "22222222-2222-2222-2222-222222222222",
  job_role: "gestao",
};

describe("parseTeamMemberJobRoleForm", () => {
  it("lê um formulário válido", () => {
    const r = parseTeamMemberJobRoleForm(fd(validos));
    expect(r).toEqual({
      ok: true,
      memberId: validos.member_id,
      profileId: validos.profile_id,
      jobRole: "gestao",
    });
  });

  it.each([
    "nutricionista",
    "nutricionista_estagiario",
    "tecnico_nutricao",
    "auxiliar",
    "administrativo",
    "gestao",
    "outro",
  ] as const)("aceita o cargo %s", (job_role) => {
    const r = parseTeamMemberJobRoleForm(fd({ ...validos, job_role }));
    expect(r.ok && r.jobRole).toBe(job_role);
  });

  it("recusa cargo desconhecido", () => {
    expect(
      parseTeamMemberJobRoleForm(fd({ ...validos, job_role: "admin" })).ok,
    ).toBe(false);
    expect(
      parseTeamMemberJobRoleForm(fd({ ...validos, job_role: "super_admin" }))
        .ok,
    ).toBe(false);
  });

  it("recusa campos vazios", () => {
    expect(parseTeamMemberJobRoleForm(fd({ ...validos, member_id: "" })).ok).toBe(
      false,
    );
    expect(
      parseTeamMemberJobRoleForm(fd({ ...validos, profile_id: "  " })).ok,
    ).toBe(false);
    expect(parseTeamMemberJobRoleForm(fd({ ...validos, job_role: "" })).ok).toBe(
      false,
    );
  });
});
