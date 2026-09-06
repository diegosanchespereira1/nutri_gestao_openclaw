import { describe, expect, it } from "vitest";

import {
  formatAuthRateLimitError,
  formatPasswordResetRateLimitError,
} from "@/lib/auth/rate-limit-messages";

describe("formatAuthRateLimitError", () => {
  it("usa 60s quando retryAfter é nulo ou inválido", () => {
    expect(formatAuthRateLimitError(null)).toBe(
      "Demasiadas tentativas. Tente novamente em 60 segundos.",
    );
    expect(formatAuthRateLimitError(0)).toBe(
      "Demasiadas tentativas. Tente novamente em 60 segundos.",
    );
  });

  it("respeita o retryAfter positivo", () => {
    expect(formatAuthRateLimitError(12)).toBe(
      "Demasiadas tentativas. Tente novamente em 12 segundos.",
    );
  });
});

describe("formatPasswordResetRateLimitError", () => {
  it("converte horas em minutos", () => {
    expect(formatPasswordResetRateLimitError(3600)).toBe(
      "Demasiados pedidos de recuperação. Aguarde 60 minutos e tente novamente.",
    );
  });

  it("usa singular para 1 minuto", () => {
    expect(formatPasswordResetRateLimitError(60)).toBe(
      "Demasiados pedidos de recuperação. Aguarde 1 minuto e tente novamente.",
    );
  });

  it("mantém segundos abaixo de 1 minuto", () => {
    expect(formatPasswordResetRateLimitError(45)).toBe(
      "Demasiados pedidos de recuperação. Tente novamente em 45 segundos.",
    );
  });

  it("usa 1 hora quando retryAfter é nulo", () => {
    expect(formatPasswordResetRateLimitError(null)).toBe(
      "Demasiados pedidos de recuperação. Aguarde 60 minutos e tente novamente.",
    );
  });
});
