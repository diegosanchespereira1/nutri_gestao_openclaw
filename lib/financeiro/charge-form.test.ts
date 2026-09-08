import { describe, expect, it } from "vitest";

import {
  chargeFormErrorMessage,
  chargeMutationPath,
  chargeRecurrenceLabel,
  parseChargeDueDate,
  parseChargeMutationSource,
  parseChargeRecurring,
  resolveChargeRecurrence,
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
    expect(chargeFormErrorMessage("recurrence")).toMatch(/término/i);
    expect(chargeFormErrorMessage("nope")).toBeNull();
    expect(chargeFormErrorMessage(undefined)).toBeNull();
  });
});

describe("parseChargeDueDate", () => {
  it("aceita data ISO e rejeita inválida", () => {
    expect(parseChargeDueDate("2026-09-08")).toBe("2026-09-08");
    expect(parseChargeDueDate("08/09/2026")).toBeNull();
    expect(parseChargeDueDate("")).toBeNull();
  });
});

describe("parseChargeRecurring", () => {
  it("reconhece valores afirmativos", () => {
    expect(parseChargeRecurring("1")).toBe(true);
    expect(parseChargeRecurring("true")).toBe(true);
    expect(parseChargeRecurring("sim")).toBe(true);
  });

  it("trata omissão como não recorrente", () => {
    expect(parseChargeRecurring("0")).toBe(false);
    expect(parseChargeRecurring("nao")).toBe(false);
    expect(parseChargeRecurring(undefined)).toBe(false);
  });
});

describe("resolveChargeRecurrence", () => {
  it("ignora término quando não é recorrente", () => {
    expect(
      resolveChargeRecurrence({
        dueDate: "2026-09-08",
        isRecurring: false,
        endsOnRaw: "2026-12-01",
      }),
    ).toEqual({ ok: true, isRecurring: false, endsOn: null });
  });

  it("permite recorrente sem data de término", () => {
    expect(
      resolveChargeRecurrence({
        dueDate: "2026-09-08",
        isRecurring: true,
        endsOnRaw: "",
      }),
    ).toEqual({ ok: true, isRecurring: true, endsOn: null });
  });

  it("aceita término igual ou depois do vencimento", () => {
    expect(
      resolveChargeRecurrence({
        dueDate: "2026-09-08",
        isRecurring: true,
        endsOnRaw: "2026-09-08",
      }),
    ).toEqual({ ok: true, isRecurring: true, endsOn: "2026-09-08" });
  });

  it("rejeita término anterior ao vencimento", () => {
    expect(
      resolveChargeRecurrence({
        dueDate: "2026-09-08",
        isRecurring: true,
        endsOnRaw: "2026-09-01",
      }),
    ).toEqual({ ok: false });
  });
});

describe("chargeRecurrenceLabel", () => {
  it("formata o rótulo da lista", () => {
    expect(chargeRecurrenceLabel({ isRecurring: false, endsOn: null })).toBeNull();
    expect(chargeRecurrenceLabel({ isRecurring: true, endsOn: null })).toBe(
      "Recorrente",
    );
    expect(
      chargeRecurrenceLabel({ isRecurring: true, endsOn: "2026-12-01" }),
    ).toBe("Recorrente até 01/12/2026");
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
