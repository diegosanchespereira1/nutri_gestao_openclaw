import { describe, expect, it } from "vitest";

import {
  formatBrazilPhoneInput,
  normalizeBrazilPhone,
} from "@/lib/validators/br-phone";

describe("formatBrazilPhoneInput", () => {
  it("formata celular com 11 dígitos", () => {
    expect(formatBrazilPhoneInput("11987654321")).toBe("(11) 98765-4321");
  });

  it("formata fixo com 10 dígitos", () => {
    expect(formatBrazilPhoneInput("1133334444")).toBe("(11) 3333-4444");
  });

  it("remove prefixo 55", () => {
    expect(formatBrazilPhoneInput("5511987654321")).toBe("(11) 98765-4321");
  });

  it("devolve vazio para entrada vazia", () => {
    expect(formatBrazilPhoneInput("")).toBe("");
  });
});

describe("normalizeBrazilPhone", () => {
  it("aceita vazio como null", () => {
    expect(normalizeBrazilPhone("")).toEqual({ ok: true, value: null });
  });

  it("aceita celular válido", () => {
    const r = normalizeBrazilPhone("11987654321");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("(11) 98765-4321");
  });

  it("rejeita DDD inválido", () => {
    const r = normalizeBrazilPhone("09987654321");
    expect(r.ok).toBe(false);
  });

  it("rejeita tamanho inválido", () => {
    const r = normalizeBrazilPhone("12345");
    expect(r.ok).toBe(false);
  });
});
