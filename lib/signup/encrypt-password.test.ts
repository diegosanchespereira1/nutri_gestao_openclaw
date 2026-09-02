import { describe, expect, it } from "vitest";

import {
  decryptSignupPassword,
  encryptSignupPassword,
} from "@/lib/signup/encrypt-password";

describe("encryptSignupPassword", () => {
  it("cifra e recupera", () => {
    const secret = "unit-test-secret-value";
    const cipher = encryptSignupPassword("SenhaForte!123", secret);
    expect(cipher.startsWith("v1:")).toBe(true);
    expect(cipher).not.toContain("SenhaForte!123");
    expect(decryptSignupPassword(cipher, secret)).toBe("SenhaForte!123");
  });

  it("rejeita payload inválido", () => {
    expect(() => decryptSignupPassword("nao-e-cifra", "secret")).toThrow(
      /inválida/,
    );
  });
});
