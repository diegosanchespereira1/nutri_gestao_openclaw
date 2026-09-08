import { describe, expect, it } from "vitest";

import {
  canAccessComingSoonModules,
  isComingSoonPath,
} from "./coming-soon-modules";

describe("canAccessComingSoonModules", () => {
  it("libera os três usuários de preview por id", () => {
    expect(
      canAccessComingSoonModules({
        userId: "633db554-b037-4e40-8c4f-575337dbfded",
      }),
    ).toBe(true);
    expect(
      canAccessComingSoonModules({
        userId: "904a0dd8-09de-44c0-b4c9-053ef0fabb37",
      }),
    ).toBe(true);
    expect(
      canAccessComingSoonModules({
        userId: "07872ebe-b388-4918-8e04-90aed160e1bf",
      }),
    ).toBe(true);
  });

  it("libera por e-mail e por nome", () => {
    expect(
      canAccessComingSoonModules({ email: "diegosanchespereira@gmail.com" }),
    ).toBe(true);
    expect(canAccessComingSoonModules({ email: "adm@sabernutrir.com.br" })).toBe(
      true,
    );
    expect(canAccessComingSoonModules({ fullName: "Vinicius Xavier" })).toBe(
      true,
    );
    expect(canAccessComingSoonModules({ fullName: "Carina Xavier" })).toBe(true);
  });

  it("bloqueia demais usuários", () => {
    expect(
      canAccessComingSoonModules({
        userId: "00000000-0000-0000-0000-000000000001",
        email: "maria@escola.com",
        fullName: "Maria Silva",
      }),
    ).toBe(false);
    expect(canAccessComingSoonModules({})).toBe(false);
  });
});

describe("isComingSoonPath", () => {
  it("reconhece as rotas ainda em validação", () => {
    expect(isComingSoonPath("/pops")).toBe(true);
    expect(isComingSoonPath("/pops/modelos")).toBe(true);
    expect(isComingSoonPath("/ficha-tecnica/nova")).toBe(true);
    expect(isComingSoonPath("/materias-primas")).toBe(true);
    expect(isComingSoonPath("/importar/materias-primas/atualizar-precos")).toBe(
      true,
    );
    expect(isComingSoonPath("/api/ficha-tecnica/abc/pdf")).toBe(true);
  });

  it("não bloqueia rotas vizinhas", () => {
    expect(isComingSoonPath("/checklists")).toBe(false);
    expect(isComingSoonPath("/importar")).toBe(false);
    expect(isComingSoonPath("/importar/avaliacoes-infantis")).toBe(false);
    expect(isComingSoonPath("/clientes")).toBe(false);
  });
});
