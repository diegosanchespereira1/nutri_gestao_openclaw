import { describe, expect, it, vi } from "vitest";

import {
  checkSignupAvailability,
  EMAIL_TAKEN_MESSAGE,
  type SignupAvailabilityDeps,
} from "@/lib/signup/signup-availability";
import { TENANT_DOCUMENT_TAKEN_MESSAGE } from "@/lib/tenant/tenant-document";

function deps(over: Partial<SignupAvailabilityDeps> = {}): SignupAvailabilityDeps {
  return {
    findProfileIdByDocument: vi.fn(async () => null),
    findAuthUserIdByEmail: vi.fn(async () => null),
    ...over,
  };
}

describe("checkSignupAvailability", () => {
  it("libera quando e-mail e documento estão livres", async () => {
    const r = await checkSignupAvailability(deps(), {
      email: "novo@exemplo.com",
      documentId: "71626999015",
    });
    expect(r).toEqual({ available: true });
  });

  it("barra CPF já usado — o caso que cobrava sem criar conta", async () => {
    const r = await checkSignupAvailability(
      deps({ findProfileIdByDocument: vi.fn(async () => "user-existente") }),
      { email: "novo@exemplo.com", documentId: "71626999015" },
    );
    expect(r).toEqual({
      available: false,
      field: "document",
      error: TENANT_DOCUMENT_TAKEN_MESSAGE,
    });
  });

  it("barra e-mail já usado", async () => {
    const r = await checkSignupAvailability(
      deps({ findAuthUserIdByEmail: vi.fn(async () => "user-existente") }),
      { email: "repetido@exemplo.com", documentId: "71626999015" },
    );
    expect(r).toEqual({
      available: false,
      field: "email",
      error: EMAIL_TAKEN_MESSAGE,
    });
  });

  it("normaliza o e-mail antes de procurar", async () => {
    const find = vi.fn(async () => null);
    await checkSignupAvailability(deps({ findAuthUserIdByEmail: find }), {
      email: "  Pessoa@Exemplo.COM  ",
      documentId: null,
    });
    expect(find).toHaveBeenCalledWith("pessoa@exemplo.com");
  });

  it("não consulta documento quando ele não foi informado", async () => {
    const find = vi.fn(async () => null);
    const r = await checkSignupAvailability(
      deps({ findProfileIdByDocument: find }),
      { email: "novo@exemplo.com", documentId: null },
    );
    expect(find).not.toHaveBeenCalled();
    expect(r).toEqual({ available: true });
  });

  it("reporta o e-mail primeiro quando os dois estão ocupados", async () => {
    const r = await checkSignupAvailability(
      deps({
        findAuthUserIdByEmail: vi.fn(async () => "u1"),
        findProfileIdByDocument: vi.fn(async () => "u2"),
      }),
      { email: "repetido@exemplo.com", documentId: "71626999015" },
    );
    expect(r).toMatchObject({ available: false, field: "email" });
  });
});
