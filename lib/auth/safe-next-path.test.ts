import { describe, expect, it } from "vitest";

import { buildLoginRedirectPath, safeNextPath } from "@/lib/auth/safe-next-path";

describe("safeNextPath", () => {
  it("devolve default para null", () => {
    expect(safeNextPath(null)).toBe("/inicio");
  });

  it("aceita path relativo", () => {
    expect(safeNextPath("/pacientes")).toBe("/pacientes");
  });

  it("aceita path com query", () => {
    expect(safeNextPath("/visitas?x=1")).toBe("/visitas?x=1");
  });

  it("bloqueia URL absoluta", () => {
    expect(safeNextPath("https://evil.com")).toBe("/inicio");
  });

  it("bloqueia protocol-relative", () => {
    expect(safeNextPath("//evil.com")).toBe("/inicio");
  });

  it("bloqueia javascript:", () => {
    expect(safeNextPath("/javascript:alert(1)")).toBe("/inicio");
  });
});

describe("buildLoginRedirectPath", () => {
  it("inclui next e reason", () => {
    const url = buildLoginRedirectPath("/perfil", {
      reason: "session_expired",
    });
    expect(url).toContain("next=%2Fperfil");
    expect(url).toContain("reason=session_expired");
  });
});
