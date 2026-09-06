import { beforeEach, describe, expect, it, vi } from "vitest";

const checkAuthRateLimitByIp = vi.fn();
const checkPasswordResetRateLimit = vi.fn();
const resetPasswordForEmail = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      "x-forwarded-for": "203.0.113.10",
    }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkAuthRateLimitByIp: (...args: unknown[]) => checkAuthRateLimitByIp(...args),
  checkPasswordResetRateLimit: (...args: unknown[]) =>
    checkPasswordResetRateLimit(...args),
  getClientIpFromHeaders: (forwarded: string | null) =>
    forwarded?.split(",")[0]?.trim() || "unknown",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { resetPasswordForEmail },
  }),
}));

vi.mock("@/lib/app-origin", () => ({
  getServerAppOrigin: () => "https://app.example.com",
}));

describe("assertAuthRateLimitAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia quando o rate limit de IP falha", async () => {
    checkAuthRateLimitByIp.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfter: 30,
    });

    const { assertAuthRateLimitAction } = await import(
      "@/lib/actions/auth-rate-limit"
    );
    const result = await assertAuthRateLimitAction();

    expect(result).toEqual({
      ok: false,
      error: "Demasiadas tentativas. Tente novamente em 30 segundos.",
    });
    expect(checkAuthRateLimitByIp).toHaveBeenCalledWith("203.0.113.10");
  });

  it("permite quando o rate limit passa", async () => {
    checkAuthRateLimitByIp.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 60_000,
      retryAfter: null,
    });

    const { assertAuthRateLimitAction } = await import(
      "@/lib/actions/auth-rate-limit"
    );
    await expect(assertAuthRateLimitAction()).resolves.toEqual({ ok: true });
  });
});

describe("requestPasswordResetAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkPasswordResetRateLimit.mockResolvedValue({
      success: true,
      remaining: 2,
      reset: Date.now() + 3_600_000,
      retryAfter: null,
    });
    resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it("rejeita email inválido sem consultar o Redis", async () => {
    const { requestPasswordResetAction } = await import(
      "@/lib/actions/auth-rate-limit"
    );
    const result = await requestPasswordResetAction("nao-e-email");

    expect(result.ok).toBe(false);
    expect(checkPasswordResetRateLimit).not.toHaveBeenCalled();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("bloqueia após o limite por email e não chama o GoTrue", async () => {
    checkPasswordResetRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 3_600_000,
      retryAfter: 3600,
    });

    const { requestPasswordResetAction } = await import(
      "@/lib/actions/auth-rate-limit"
    );
    const result = await requestPasswordResetAction("  User@Example.com ");

    expect(result).toEqual({
      ok: false,
      error:
        "Demasiados pedidos de recuperação. Aguarde 60 minutos e tente novamente.",
    });
    expect(checkPasswordResetRateLimit).toHaveBeenCalledWith("user@example.com");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("envia recuperação com redirectTo do servidor após o rate limit", async () => {
    const { requestPasswordResetAction } = await import(
      "@/lib/actions/auth-rate-limit"
    );
    const result = await requestPasswordResetAction("user@example.com");

    expect(result).toEqual({ ok: true });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo:
        "https://app.example.com/auth/callback?next=%2Fauth%2Freset-password",
    });
  });
});
