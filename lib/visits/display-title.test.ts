import { describe, expect, it } from "vitest";

import {
  visitDisplayTitle,
  visitProfessionalLabel,
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
