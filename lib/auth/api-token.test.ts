import { describe, expect, it } from "vitest";

import {
  DEFAULT_API_TOKEN_TTL_DAYS,
  defaultApiTokenExpiresAt,
  isApiTokenActive,
} from "./api-token";

describe("isApiTokenActive", () => {
  it("rejeita token revogado", () => {
    expect(
      isApiTokenActive({
        revoked_at: "2026-01-01T00:00:00.000Z",
        expires_at: "2099-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("rejeita token sem expires_at", () => {
    expect(
      isApiTokenActive({
        revoked_at: null,
        expires_at: null,
      }),
    ).toBe(false);
  });

  it("rejeita token expirado", () => {
    expect(
      isApiTokenActive({
        revoked_at: null,
        expires_at: "2020-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("aceita token válido", () => {
    expect(
      isApiTokenActive({
        revoked_at: null,
        expires_at: "2099-01-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });
});

describe("defaultApiTokenExpiresAt", () => {
  it("usa TTL padrão de 365 dias", () => {
    const from = new Date("2026-01-01T12:00:00.000Z");
    const expires = new Date(defaultApiTokenExpiresAt(from));
    const diffDays = Math.round(
      (expires.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
    );
    expect(diffDays).toBe(DEFAULT_API_TOKEN_TTL_DAYS);
  });
});
