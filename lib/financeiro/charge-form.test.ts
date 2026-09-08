import { describe, expect, it } from "vitest";

import {
  chargeFormErrorMessage,
  chargeMutationPath,
  parseChargeMutationSource,
  resolveDefaultChargeClientId,
} from "./charge-form";

describe("parseChargeMutationSource", () => {
  it("trata origem do cadastro do cliente", () => {
    expect(parseChargeMutationSource("client")).toBe("client");
  });

  it("cai no módulo financeiro por omissão", () => {
    expect(parseChargeMutationSource(undefined)).toBe("financeiro");
    expect(parseChargeMutationSource("")).toBe("financeiro");
    expect(parseChargeMutationSource("operacoes")).toBe("financeiro");
  });
});

describe("resolveDefaultChargeClientId", () => {
  const ids = ["aaa", "bbb"];

  it("pré-seleciona quando o id existe", () => {
    expect(resolveDefaultChargeClientId("aaa", ids)).toBe("aaa");
  });

  it("ignora id fora da lista ou vazio", () => {
    expect(resolveDefaultChargeClientId("zzz", ids)).toBe("");
    expect(resolveDefaultChargeClientId(null, ids)).toBe("");
    expect(resolveDefaultChargeClientId(undefined, ids)).toBe("");
  });
});

describe("chargeFormErrorMessage", () => {
  it("traduz códigos conhecidos", () => {
    expect(chargeFormErrorMessage("invalid")).toMatch(/categoria/i);
    expect(chargeFormErrorMessage("nope")).toBeNull();
    expect(chargeFormErrorMessage(undefined)).toBeNull();
  });
});

describe("chargeMutationPath", () => {
  const clientId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  it("volta à ficha do cliente na aba financeiro", () => {
    expect(chargeMutationPath("client", clientId)).toBe(
      `/clientes/${clientId}/editar?tab=financeiro`,
    );
    expect(chargeMutationPath("client", clientId, "invalid")).toBe(
      `/clientes/${clientId}/editar?tab=financeiro&chargeErr=invalid`,
    );
  });

  it("volta ao módulo financeiro nas operações", () => {
    expect(chargeMutationPath("financeiro", clientId)).toBe(
      "/financeiro?tab=operacoes",
    );
    expect(chargeMutationPath("financeiro", null, "save")).toBe(
      "/financeiro?tab=operacoes&err=save",
    );
  });
});
