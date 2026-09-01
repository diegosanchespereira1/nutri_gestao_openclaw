import { describe, expect, it } from "vitest";

import { readLimitsSummary } from "./build-create-tenant-summary";

/**
 * `readLimitsSummary` só usa `form.querySelector`. O ambiente do vitest é node
 * (sem DOM), então um stub mínimo cobre a lógica — que é o texto mostrado no
 * diálogo de confirmação, a última coisa que o admin lê antes de criar a conta.
 */
function formStub(campos: Record<string, { checked?: boolean; value?: string }>) {
  return {
    querySelector(sel: string) {
      const m = /name="([^"]+)"/.exec(sel);
      if (!m) return null;
      const campo = campos[m[1]!];
      if (!campo) return null;
      if (sel.includes('type="checkbox"')) {
        return campo.checked === undefined ? null : { checked: campo.checked };
      }
      return { value: campo.value ?? "" };
    },
  } as unknown as HTMLFormElement;
}

describe("readLimitsSummary", () => {
  it("descreve os limites ligados com o número", () => {
    const r = readLimitsSummary(
      formStub({
        clients_limit_enabled: { checked: true },
        clients_limit: { value: "25" },
        patients_limit_enabled: { checked: true },
        patients_limit: { value: "50" },
        team_members_enabled: { checked: true },
        team_members_unlimited: { checked: false },
        team_members_limit: { value: "3" },
      }),
    );
    expect(r.clients).toBe("Até 25 clientes");
    expect(r.patients).toBe("Até 50 pacientes");
    expect(r.teamMembers).toBe("Equipe habilitada — 3 assentos");
  });

  it("descreve limites desligados sem número", () => {
    const r = readLimitsSummary(
      formStub({
        clients_limit_enabled: { checked: false },
        clients_limit: { value: "25" },
        patients_limit_enabled: { checked: false },
        patients_limit: { value: "25" },
        team_members_enabled: { checked: false },
      }),
    );
    expect(r.clients).toBe("Sem limite de clientes");
    expect(r.patients).toBe("Sem limite de pacientes");
    expect(r.teamMembers).toBe("Cadastro de equipe desabilitado");
  });

  it("assentos ilimitados não mostram quantidade", () => {
    const r = readLimitsSummary(
      formStub({
        clients_limit_enabled: { checked: true },
        clients_limit: { value: "25" },
        patients_limit_enabled: { checked: true },
        patients_limit: { value: "25" },
        team_members_enabled: { checked: true },
        team_members_unlimited: { checked: true },
        team_members_limit: { value: "3" },
      }),
    );
    expect(r.teamMembers).toBe("Equipe habilitada — assentos ilimitados");
    expect(r.teamMembers).not.toContain("3");
  });

  it("valor não numérico vira zero em vez de NaN no diálogo", () => {
    const r = readLimitsSummary(
      formStub({
        clients_limit_enabled: { checked: true },
        clients_limit: { value: "abc" },
        patients_limit_enabled: { checked: false },
        team_members_enabled: { checked: false },
      }),
    );
    expect(r.clients).toBe("Até 0 clientes");
    expect(r.clients).not.toContain("NaN");
  });
});
