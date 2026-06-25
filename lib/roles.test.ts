import { describe, expect, it } from "vitest";

import {
  canAccessAdminArea,
  isProfileRole,
  profileRoleLabel,
} from "@/lib/roles";

describe("isProfileRole", () => {
  it("aceita roles válidos", () => {
    expect(isProfileRole("user")).toBe(true);
    expect(isProfileRole("admin")).toBe(true);
    expect(isProfileRole("super_admin")).toBe(true);
  });

  it("rejeita valores inválidos", () => {
    expect(isProfileRole("guest")).toBe(false);
    expect(isProfileRole(null)).toBe(false);
  });
});

describe("canAccessAdminArea", () => {
  it("permite admin e super_admin", () => {
    expect(canAccessAdminArea("admin")).toBe(true);
    expect(canAccessAdminArea("super_admin")).toBe(true);
  });

  it("nega user", () => {
    expect(canAccessAdminArea("user")).toBe(false);
    expect(canAccessAdminArea(undefined)).toBe(false);
  });
});

describe("profileRoleLabel", () => {
  it("traduz roles conhecidos", () => {
    expect(profileRoleLabel("admin")).toBe("Administrador");
    expect(profileRoleLabel("super_admin")).toBe("Super administrador");
  });

  it("fallback para desconhecido", () => {
    expect(profileRoleLabel("x")).toBe("—");
  });
});
