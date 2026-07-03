import { describe, expect, it } from "vitest";

import {
  buildVisibleNavGroups,
  isNavItemActive,
  mobileBottomNavHrefs,
  splitMobileNavItems,
} from "@/lib/app-nav";
import { APP_DASHBOARD_PATH } from "@/lib/routes";

describe("mobile bottom nav", () => {
  it("expõe as rotas primárias na ordem esperada", () => {
    expect(mobileBottomNavHrefs).toEqual([
      APP_DASHBOARD_PATH,
      "/visitas",
      "/checklists",
      "/perfil",
    ]);
  });

  it("separa itens primários e overflow", () => {
    const groups = buildVisibleNavGroups(false);
    const { primary, overflow } = splitMobileNavItems(groups);

    expect(primary.map(({ item }) => item.href)).toEqual([
      APP_DASHBOARD_PATH,
      "/visitas",
      "/checklists",
      "/perfil",
    ]);
    expect(overflow.some(({ item }) => item.href === "/clientes")).toBe(true);
    expect(overflow.some(({ item }) => item.href === "/perfil")).toBe(false);
  });

  it("detecta rota ativa com subcaminhos", () => {
    expect(isNavItemActive("/pacientes/abc", "/pacientes")).toBe(true);
    expect(isNavItemActive(APP_DASHBOARD_PATH, APP_DASHBOARD_PATH)).toBe(true);
    expect(isNavItemActive("/dashboard/extra", APP_DASHBOARD_PATH)).toBe(false);
  });
});
