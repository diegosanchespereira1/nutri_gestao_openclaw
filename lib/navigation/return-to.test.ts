import { describe, expect, it } from "vitest";

import {
  buildCurrentUrl,
  getReturnToFromFormData,
  getReturnToParam,
  hrefWithOptionalReturnTo,
  resolveBackNavigation,
  trySafeReturnPath,
  withReturnTo,
} from "@/lib/navigation/return-to";
import { APP_DASHBOARD_PATH } from "@/lib/routes";

describe("trySafeReturnPath", () => {
  it("devolve null para ausente/vazio", () => {
    expect(trySafeReturnPath(null)).toBeNull();
    expect(trySafeReturnPath("")).toBeNull();
    expect(trySafeReturnPath("   ")).toBeNull();
  });

  it("aceita path relativo com query", () => {
    expect(trySafeReturnPath("/pacientes")).toBe("/pacientes");
    expect(trySafeReturnPath("/clientes/1/editar?tab=pacientes")).toBe(
      "/clientes/1/editar?tab=pacientes",
    );
  });

  it("normaliza /inicio para dashboard", () => {
    expect(trySafeReturnPath("/inicio")).toBe(APP_DASHBOARD_PATH);
    expect(trySafeReturnPath("/inicio?x=1")).toBe(`${APP_DASHBOARD_PATH}?x=1`);
  });

  it("bloqueia open redirect", () => {
    expect(trySafeReturnPath("https://evil.com")).toBeNull();
    expect(trySafeReturnPath("//evil.com")).toBeNull();
    expect(trySafeReturnPath("/javascript:alert(1)")).toBeNull();
  });
});

describe("getReturnToParam", () => {
  it("lê de URLSearchParams", () => {
    const sp = new URLSearchParams("returnTo=%2Fpacientes&x=1");
    expect(getReturnToParam(sp)).toBe("/pacientes");
  });

  it("lê de record do App Router", () => {
    expect(getReturnToParam({ returnTo: "/clientes", tab: "a" })).toBe(
      "/clientes",
    );
    expect(getReturnToParam({ returnTo: ["/a", "/b"] })).toBe("/a");
  });
});

describe("buildCurrentUrl", () => {
  it("monta path sem query", () => {
    expect(buildCurrentUrl("/pacientes")).toBe("/pacientes");
  });

  it("preserva query existente", () => {
    expect(
      buildCurrentUrl("/clientes/1/editar", { tab: "pacientes" }),
    ).toBe("/clientes/1/editar?tab=pacientes");
  });

  it("aceita URLSearchParams", () => {
    const sp = new URLSearchParams("tab=checklists");
    expect(buildCurrentUrl("/clientes/1/editar", sp)).toBe(
      "/clientes/1/editar?tab=checklists",
    );
  });
});

describe("withReturnTo", () => {
  it("acrescenta returnTo", () => {
    expect(withReturnTo("/pacientes/abc", "/pacientes")).toBe(
      "/pacientes/abc?returnTo=%2Fpacientes",
    );
  });

  it("preserva query do destino e aninha origem com query", () => {
    const href = withReturnTo(
      "/pacientes/abc/editar",
      "/pacientes/abc?returnTo=%2Fpacientes",
    );
    expect(href).toContain("/pacientes/abc/editar?");
    expect(href).toContain("returnTo=");
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("returnTo")).toBe("/pacientes/abc?returnTo=%2Fpacientes");
  });

  it("não altera se origem inválida", () => {
    expect(withReturnTo("/pacientes/1", "https://evil.com")).toBe(
      "/pacientes/1",
    );
  });

  it("não acrescenta se origem e destino têm o mesmo path", () => {
    expect(withReturnTo("/pacientes", "/pacientes?x=1")).toBe("/pacientes");
  });
});

describe("hrefWithOptionalReturnTo", () => {
  it("acrescenta returnTo válido", () => {
    expect(hrefWithOptionalReturnTo("/pacientes/1", "/pacientes")).toBe(
      "/pacientes/1?returnTo=%2Fpacientes",
    );
  });

  it("ignora returnTo inválido", () => {
    expect(hrefWithOptionalReturnTo("/pacientes/1", "https://evil.com")).toBe(
      "/pacientes/1",
    );
  });
});

describe("getReturnToFromFormData", () => {
  it("lê campo returnTo", () => {
    const fd = new FormData();
    fd.set("returnTo", "/clientes");
    expect(getReturnToFromFormData(fd)).toBe("/clientes");
  });
});

describe("resolveBackNavigation", () => {
  const fallback = {
    fallbackHref: "/pacientes",
    fallbackLabel: "Pacientes",
  };

  it("usa fallback sem returnTo", () => {
    expect(resolveBackNavigation({ ...fallback, returnTo: null })).toEqual({
      href: "/pacientes",
      label: "Pacientes",
    });
  });

  it("usa returnTo seguro com label Voltar", () => {
    expect(
      resolveBackNavigation({
        ...fallback,
        returnTo: "/clientes/1/editar?tab=pacientes",
      }),
    ).toEqual({
      href: "/clientes/1/editar?tab=pacientes",
      label: "Voltar",
    });
  });

  it("usa fallback para returnTo malicioso", () => {
    expect(
      resolveBackNavigation({
        ...fallback,
        returnTo: "https://evil.com",
      }),
    ).toEqual({
      href: "/pacientes",
      label: "Pacientes",
    });
  });

  it("usa fallback se returnTo aponta para a página actual", () => {
    expect(
      resolveBackNavigation({
        ...fallback,
        returnTo: "/pacientes/1",
        currentPath: "/pacientes/1",
      }),
    ).toEqual({
      href: "/pacientes",
      label: "Pacientes",
    });
  });
});
