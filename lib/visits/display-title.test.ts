import { describe, expect, it } from "vitest";

import {
  enrichVisitWithProfessional,
  visitDisplayTitle,
  visitProfessionalLabel,
  visitProfessionalName,
  visitTargetName,
} from "@/lib/visits/display-title";

describe("visitTargetName", () => {
  it("nome do estabelecimento", () => {
    expect(
      visitTargetName({
        target_type: "establishment",
        establishments: { name: "  Escola X  " },
      } as Parameters<typeof visitTargetName>[0]),
    ).toBe("Escola X");
  });

  it("nome do paciente", () => {
    expect(
      visitTargetName({
        target_type: "patient",
        patients: { full_name: "Maria" },
      } as Parameters<typeof visitTargetName>[0]),
    ).toBe("Maria");
  });
});

describe("visitDisplayTitle", () => {
  it("fallback estabelecimento", () => {
    expect(
      visitDisplayTitle({
        target_type: "establishment",
        establishments: null,
      } as Parameters<typeof visitDisplayTitle>[0]),
    ).toBe("Estabelecimento");
  });
});

describe("visitProfessionalLabel", () => {
  it("membro atribuído com função", () => {
    const label = visitProfessionalLabel({
      team_members: { full_name: "Ana", job_role: "nutritionist" },
    } as Parameters<typeof visitProfessionalLabel>[0]);
    expect(label).toContain("Ana");
  });

  it("fallback criador", () => {
    expect(
      visitProfessionalLabel({} as Parameters<typeof visitProfessionalLabel>[0], "João"),
    ).toBe("João");
  });
});

describe("visitProfessionalName", () => {
  it("usa o nome do membro atribuído", () => {
    expect(
      visitProfessionalName({
        team_members: { full_name: "Ana Lima", job_role: "nutricionista" },
      } as Parameters<typeof visitProfessionalName>[0]),
    ).toBe("Ana Lima");
  });

  it("cai no criador quando não há membro", () => {
    expect(
      visitProfessionalName(
        {} as Parameters<typeof visitProfessionalName>[0],
        "João",
      ),
    ).toBe("João");
  });
});

describe("enrichVisitWithProfessional", () => {
  const ana = {
    id: "tm-ana",
    full_name: "Ana Lima",
    job_role: "nutricionista" as const,
    member_user_id: "user-ana",
  };

  it("resolve pelo membro atribuído na equipe", () => {
    const visit = enrichVisitWithProfessional(
      {
        assigned_team_member_id: "tm-ana",
        user_id: "user-gestor",
        team_members: null,
      } as Parameters<typeof enrichVisitWithProfessional>[0],
      [ana],
    );
    expect(visit.team_members?.full_name).toBe("Ana Lima");
    expect(visitProfessionalLabel(visit)).toContain("Ana Lima");
  });

  it("resolve pelo user_id da nutricionista que criou a visita", () => {
    const visit = enrichVisitWithProfessional(
      {
        assigned_team_member_id: null,
        user_id: "user-ana",
        team_members: null,
      } as Parameters<typeof enrichVisitWithProfessional>[0],
      [ana],
    );
    expect(visit.team_members?.full_name).toBe("Ana Lima");
  });
});
