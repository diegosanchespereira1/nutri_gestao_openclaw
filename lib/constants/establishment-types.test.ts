import { describe, expect, it } from "vitest";

import {
  badgeClassForEstablishmentType,
  categoryFromType,
  CUSTOM_ESTABLISHMENT_TYPE_BADGE_CLASS,
  isBuiltinEstablishmentType,
  labelForEstablishmentType,
  slugifyEstablishmentCustomTypeLabel,
} from "./establishment-types";

describe("establishment custom type helpers", () => {
  it("identifica tipos built-in", () => {
    expect(isBuiltinEstablishmentType("clinica")).toBe(true);
    expect(isBuiltinEstablishmentType("custom_cantina")).toBe(false);
  });

  it("deriva categoria de built-in e custom", () => {
    expect(categoryFromType("clinica")).toBe("atendimento_nutricional");
    expect(categoryFromType("restaurante")).toBe("assessoria_alimentacao");
    expect(
      categoryFromType("custom_cantina", [
        {
          slug: "custom_cantina",
          category: "assessoria_alimentacao",
        },
      ]),
    ).toBe("assessoria_alimentacao");
    expect(categoryFromType("custom_desconhecido")).toBeNull();
  });

  it("resolve label e badge para custom", () => {
    expect(labelForEstablishmentType("hotel")).toBe("Hotel");
    expect(
      labelForEstablishmentType("custom_cantina", [
        { slug: "custom_cantina", label: "Cantina" },
      ]),
    ).toBe("Cantina");
    expect(badgeClassForEstablishmentType("custom_x")).toBe(
      CUSTOM_ESTABLISHMENT_TYPE_BADGE_CLASS,
    );
  });

  it("gera slug com prefixo custom_", () => {
    expect(slugifyEstablishmentCustomTypeLabel("Cantina Escolar")).toBe(
      "custom_cantina_escolar",
    );
    expect(slugifyEstablishmentCustomTypeLabel("  ")).toBe("custom_tipo");
  });
});
