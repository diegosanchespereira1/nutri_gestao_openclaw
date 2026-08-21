import { describe, expect, it } from "vitest";

import { isSamePathnameNavigation } from "@/lib/navigation/same-pathname-query";

const origin = "https://app.example.com";

describe("isSamePathnameNavigation", () => {
  it("reconhece busca e filtros no mesmo pathname", () => {
    expect(
      isSamePathnameNavigation(
        "/checklists?q=rdc",
        `${origin}/checklists`,
      ),
    ).toBe(true);
    expect(
      isSamePathnameNavigation(
        "/clientes",
        `${origin}/clientes?q=escola&page=2`,
      ),
    ).toBe(true);
    expect(
      isSamePathnameNavigation(
        "?q=ana",
        `${origin}/pacientes?situacao=all`,
      ),
    ).toBe(true);
  });

  it("não trata troca de página como busca", () => {
    expect(
      isSamePathnameNavigation(
        "/checklists/preencher/abc",
        `${origin}/checklists`,
      ),
    ).toBe(false);
    expect(
      isSamePathnameNavigation(
        "/clientes/111/editar",
        `${origin}/clientes`,
      ),
    ).toBe(false);
  });

  it("ignora href inválido", () => {
    expect(isSamePathnameNavigation("https://%", `${origin}/checklists`)).toBe(
      false,
    );
  });
});
