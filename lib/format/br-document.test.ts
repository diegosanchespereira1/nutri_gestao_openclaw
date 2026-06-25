import { describe, expect, it } from "vitest";

import { formatCnpjDisplay, formatCpfDisplay } from "@/lib/format/br-document";

describe("formatCpfDisplay", () => {
  it("formata 11 dígitos", () => {
    expect(formatCpfDisplay("52998224725")).toBe("529.982.247-25");
  });

  it("devolve original se tamanho inválido", () => {
    expect(formatCpfDisplay("123")).toBe("123");
  });
});

describe("formatCnpjDisplay", () => {
  it("formata 14 dígitos", () => {
    expect(formatCnpjDisplay("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("devolve original se tamanho inválido", () => {
    expect(formatCnpjDisplay("abc")).toBe("abc");
  });
});
