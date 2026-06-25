import { describe, expect, it } from "vitest";

import {
  isAdminPath,
  isAuthPublicPath,
  isPathAllowedWhenLgpdBlocked,
  isProtectedPath,
} from "@/lib/auth-paths";

describe("auth-paths", () => {
  it("login é público", () => {
    expect(isAuthPublicPath("/login")).toBe(true);
    expect(isAuthPublicPath("/auth/callback")).toBe(true);
  });

  it("inicio é protegido", () => {
    expect(isProtectedPath("/inicio")).toBe(true);
    expect(isProtectedPath("/pacientes/1")).toBe(true);
  });

  it("admin path", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/users")).toBe(true);
  });

  it("LGPD bloqueado permite conta-bloqueada", () => {
    expect(isPathAllowedWhenLgpdBlocked("/conta-bloqueada")).toBe(true);
    expect(isPathAllowedWhenLgpdBlocked("/inicio")).toBe(false);
  });

  it("raiz é pública", () => {
    expect(isAuthPublicPath("/")).toBe(true);
  });
});
