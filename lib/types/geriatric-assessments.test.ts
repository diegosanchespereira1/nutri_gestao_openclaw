import { describe, expect, it } from "vitest";

import {
  defaultAnthropometricReference,
  parseAnthropometricReference,
  parsePatientGroup,
} from "./geriatric-assessments";

describe("parsePatientGroup", () => {
  it("aceita os quatro grupos", () => {
    expect(parsePatientGroup("homem_branco")).toBe("homem_branco");
    expect(parsePatientGroup("mulher_negra")).toBe("mulher_negra");
  });

  it("rejeita vazio e lixo", () => {
    expect(parsePatientGroup("")).toBeNull();
    expect(parsePatientGroup("masculino")).toBeNull();
    expect(parsePatientGroup(null)).toBeNull();
  });
});

describe("parseAnthropometricReference", () => {
  it("aceita os valores gravados", () => {
    expect(parseAnthropometricReference("frisancho")).toBe("frisancho");
    expect(parseAnthropometricReference("nhanes")).toBe("nhanes");
  });

  it("rejeita vazio e lixo", () => {
    expect(parseAnthropometricReference("")).toBeNull();
    expect(parseAnthropometricReference("oms")).toBeNull();
    expect(parseAnthropometricReference(null)).toBeNull();
  });
});

describe("defaultAnthropometricReference", () => {
  it("primeira avaliação fica vazia", () => {
    expect(defaultAnthropometricReference(null, false, "frisancho")).toBe("");
  });

  it("repete o método da última avaliação", () => {
    expect(defaultAnthropometricReference("nhanes", true, "frisancho")).toBe(
      "nhanes",
    );
  });

  it("legado usa o fallback do tipo de formulário", () => {
    expect(defaultAnthropometricReference(null, true, "frisancho")).toBe(
      "frisancho",
    );
    expect(defaultAnthropometricReference(null, true, "nhanes")).toBe("nhanes");
  });
});
