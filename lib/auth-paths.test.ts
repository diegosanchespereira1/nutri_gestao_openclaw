import { describe, expect, it } from "vitest";

import {
  isAdminPath,
  isAuthPublicPath,
  isPathAllowedWhenLgpdBlocked,
  isProtectedPath,
} from "@/lib/auth-paths";
import { APP_DASHBOARD_PATH } from "@/lib/routes";

describe("auth-paths", () => {
  it("login é público", () => {
    expect(isAuthPublicPath("/login")).toBe(true);
    expect(isAuthPublicPath("/auth/callback")).toBe(true);
  });

  it("dashboard é protegido", () => {
    expect(isProtectedPath(APP_DASHBOARD_PATH)).toBe(true);
    expect(isProtectedPath("/pacientes/1")).toBe(true);
  });

  it("admin path", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/users")).toBe(true);
  });

  it("LGPD bloqueado permite conta-bloqueada", () => {
    expect(isPathAllowedWhenLgpdBlocked("/conta-bloqueada")).toBe(true);
    expect(isPathAllowedWhenLgpdBlocked(APP_DASHBOARD_PATH)).toBe(false);
  });

  it("raiz é pública", () => {
    expect(isAuthPublicPath("/")).toBe(true);
  });
});
