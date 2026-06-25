import { describe, expect, it } from "vitest";

import {
  mapSupabaseLoginError,
  mapSupabaseRecoverPasswordError,
} from "@/lib/map-supabase-auth-error";

describe("mapSupabaseLoginError", () => {
  it("mapeia email não confirmado por código", () => {
    expect(
      mapSupabaseLoginError({
        message: "x",
        code: "email_not_confirmed",
      }),
    ).toContain("Confirme o email");
  });

  it("mapeia credenciais inválidas por código", () => {
    expect(
      mapSupabaseLoginError({
        message: "x",
        code: "invalid_credentials",
      }),
    ).toBe("Email ou senha incorretos.");
  });

  it("mapeia credenciais inválidas por mensagem", () => {
    expect(
      mapSupabaseLoginError({
        message: "Invalid login credentials",
      }),
    ).toBe("Email ou senha incorretos.");
  });

  it("mapeia provider_email_needs_verification", () => {
    expect(
      mapSupabaseLoginError({
        message: "x",
        code: "provider_email_needs_verification",
      }),
    ).toContain("Confirme o email");
  });

  it("mapeia rate limit", () => {
    expect(
      mapSupabaseLoginError({
        message: "too many requests",
      }),
    ).toContain("Demasiadas tentativas");
  });

  it("devolve mensagem original se desconhecida", () => {
    expect(
      mapSupabaseLoginError({ message: "Erro customizado" }),
    ).toBe("Erro customizado");
  });
});

describe("mapSupabaseRecoverPasswordError", () => {
  it("mapeia HTTP 429", () => {
    expect(
      mapSupabaseRecoverPasswordError({ message: "x", status: 429 }),
    ).toContain("Limite temporário");
  });

  it("mapeia rate limit por código", () => {
    expect(
      mapSupabaseRecoverPasswordError({
        message: "x",
        code: "over_email_send_rate_limit",
      }),
    ).toContain("Limite temporário");
  });

  it("mapeia email rate limit na mensagem", () => {
    expect(
      mapSupabaseRecoverPasswordError({
        message: "Email rate limit exceeded",
      }),
    ).toContain("SMTP");
  });

  it("fallback genérico", () => {
    expect(
      mapSupabaseRecoverPasswordError({ message: "unknown" }),
    ).toContain("Não foi possível concluir");
  });
});
