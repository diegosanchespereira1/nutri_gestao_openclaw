import { describe, expect, it } from "vitest";

import {
  isLgpdClosurePending,
  isProfileLgpdActivelyBlocked,
} from "@/lib/lgpd-block";

describe("lgpd-block", () => {
  it("detecta bloqueio ativo", () => {
    expect(
      isProfileLgpdActivelyBlocked({
        lgpd_blocked_at: "2026-01-01T00:00:00Z",
        lgpd_unblocked_at: null,
        lgpd_cancel_token_hash: null,
        lgpd_cancel_token_expires_at: null,
      }),
    ).toBe(true);
  });

  it("não considera bloqueado após desbloqueio", () => {
    expect(
      isProfileLgpdActivelyBlocked({
        lgpd_blocked_at: "2026-01-01T00:00:00Z",
        lgpd_unblocked_at: "2026-01-02T00:00:00Z",
        lgpd_cancel_token_hash: null,
        lgpd_cancel_token_expires_at: null,
      }),
    ).toBe(false);
  });

  it("detecta pedido pendente com token válido", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    expect(
      isLgpdClosurePending({
        lgpd_blocked_at: null,
        lgpd_unblocked_at: null,
        lgpd_cancel_token_hash: "abc",
        lgpd_cancel_token_expires_at: future,
      }),
    ).toBe(true);
  });

  it("não considera pendente com token expirado", () => {
    expect(
      isLgpdClosurePending({
        lgpd_blocked_at: null,
        lgpd_unblocked_at: null,
        lgpd_cancel_token_hash: "abc",
        lgpd_cancel_token_expires_at: "2020-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });
});
