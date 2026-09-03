import { describe, expect, it } from "vitest";

import {
  resolveSignupOutcome,
  SIGNUP_OUTCOME_MESSAGE,
  SUPPORT_EMAIL,
} from "@/lib/signup/signup-outcome";

describe("resolveSignupOutcome", () => {
  it("conta criada quando há created_user_id", () => {
    expect(
      resolveSignupOutcome({ status: "conta_criada", createdUserId: "u1" }),
    ).toBe("criada");
  });

  it("confia no created_user_id mesmo com status atrasado", () => {
    expect(resolveSignupOutcome({ status: "pago", createdUserId: "u1" })).toBe(
      "criada",
    );
  });

  it("pago sem utilizador é falha terminal — foi o caso do CPF repetido", () => {
    expect(resolveSignupOutcome({ status: "pago", createdUserId: null })).toBe(
      "falhou",
    );
  });

  it("checkout ainda é processamento: o webhook pode não ter chegado", () => {
    expect(
      resolveSignupOutcome({ status: "checkout", createdUserId: null }),
    ).toBe("processando");
  });

  it("status desconhecido ou ausente não vira falha", () => {
    expect(resolveSignupOutcome({ status: null, createdUserId: null })).toBe(
      "processando",
    );
    expect(
      resolveSignupOutcome({ status: "qualquer_coisa", createdUserId: null }),
    ).toBe("processando");
  });
});

describe("mensagens", () => {
  it("a de falha confirma o pagamento e dá o contato do suporte", () => {
    const msg = SIGNUP_OUTCOME_MESSAGE.falhou;
    expect(msg).toContain("pagamento foi confirmado");
    expect(msg).toContain(SUPPORT_EMAIL);
  });

  it("nenhuma mensagem promete e-mail já entregue quando ainda processa", () => {
    expect(SIGNUP_OUTCOME_MESSAGE.processando).toContain("em instantes");
  });
});
