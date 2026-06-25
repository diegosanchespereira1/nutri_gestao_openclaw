import { describe, expect, it } from "vitest";

import {
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from "@/lib/validators/br-document";

describe("onlyDigits", () => {
  it("remove caracteres não numéricos", () => {
    expect(onlyDigits("529.982.247-25")).toBe("52998224725");
  });
});

describe("isValidCpf", () => {
  it("aceita CPF válido", () => {
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejeita tamanho incorrecto", () => {
    expect(isValidCpf("123")).toBe(false);
  });

  it("rejeita dígitos repetidos", () => {
    expect(isValidCpf("11111111111")).toBe(false);
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCpf("52998224700")).toBe(false);
  });
});

describe("isValidCnpj", () => {
  it("aceita CNPJ válido", () => {
    expect(isValidCnpj("11222333000181")).toBe(true);
  });

  it("rejeita tamanho incorrecto", () => {
    expect(isValidCnpj("123")).toBe(false);
  });

  it("rejeita dígitos repetidos", () => {
    expect(isValidCnpj("11111111111111")).toBe(false);
  });
});
