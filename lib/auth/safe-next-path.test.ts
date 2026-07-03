import { describe, expect, it } from "vitest";

import { buildLoginRedirectPath, safeNextPath } from "@/lib/auth/safe-next-path";
import { APP_DASHBOARD_PATH } from "@/lib/routes";

describe("safeNextPath", () => {
  it("devolve default para null", () => {
    expect(safeNextPath(null)).toBe(APP_DASHBOARD_PATH);
  });

  it("aceita path relativo", () => {
    expect(safeNextPath("/pacientes")).toBe("/pacientes");
  });

  it("aceita path com query", () => {
    expect(safeNextPath("/visitas?x=1")).toBe("/visitas?x=1");
  });

  it("normaliza rota legada /inicio para dashboard", () => {
    expect(safeNextPath("/inicio")).toBe(APP_DASHBOARD_PATH);
    expect(safeNextPath("/inicio?bemvindo=1")).toBe(
      `${APP_DASHBOARD_PATH}?bemvindo=1`,
    );
  });

  it("bloqueia URL absoluta", () => {
    expect(safeNextPath("https://evil.com")).toBe(APP_DASHBOARD_PATH);
  });

  it("bloqueia protocol-relative", () => {
    expect(safeNextPath("//evil.com")).toBe(APP_DASHBOARD_PATH);
  });

  it("bloqueia javascript:", () => {
    expect(safeNextPath("/javascript:alert(1)")).toBe(APP_DASHBOARD_PATH);
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
