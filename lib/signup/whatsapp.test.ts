import { describe, expect, it } from "vitest";

import {
  buildWhatsAppWebUrl,
  normalizeWhatsAppPhone,
} from "@/lib/signup/whatsapp";

describe("normalizeWhatsAppPhone", () => {
  it("aceita vazio como null", () => {
    expect(normalizeWhatsAppPhone("")).toEqual({ ok: true, value: null });
  });

  it("adiciona DDI 55 em número BR", () => {
    expect(normalizeWhatsAppPhone("(11) 99999-8888")).toEqual({
      ok: true,
      value: "5511999998888",
    });
  });

  it("mantém DDI já informado", () => {
    expect(normalizeWhatsAppPhone("5511987654321")).toEqual({
      ok: true,
      value: "5511987654321",
    });
  });

  it("recusa número curto", () => {
    expect(normalizeWhatsAppPhone("119999").ok).toBe(false);
  });
});

describe("buildWhatsAppWebUrl", () => {
  it("monta wa.me com mensagem", () => {
    const url = buildWhatsAppWebUrl({
      phoneDigits: "5511999998888",
      message: "Olá Enterprise",
    });
    expect(url).toBe(
      "https://wa.me/5511999998888?text=" + encodeURIComponent("Olá Enterprise"),
    );
  });

  it("sem mensagem fica só o número", () => {
    expect(buildWhatsAppWebUrl({ phoneDigits: "5511999998888" })).toBe(
      "https://wa.me/5511999998888",
    );
  });
});
