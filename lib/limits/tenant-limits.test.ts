import { describe, expect, it } from "vitest";

import {
  buildLimitUiState,
  decideTenantLimit,
  mapPgLimitError,
  remainingSlots,
  tenantLimitMessage,
  type TenantLimits,
} from "./tenant-limits";

const base: TenantLimits = {
  tenant_user_id: "t1",
  clients_limit_enabled: true,
  clients_limit: 25,
  patients_limit_enabled: true,
  patients_limit: 25,
  team_members_enabled: false,
  team_members_unlimited: false,
  team_members_limit: 0,
};
const com = (patch: Partial<TenantLimits>): TenantLimits => ({ ...base, ...patch });

describe("decideTenantLimit — clientes", () => {
  it("desabilitado nunca bloqueia, nem com uso absurdo", () => {
    expect(decideTenantLimit("clients", com({ clients_limit_enabled: false }), 9999).ok).toBe(true);
  });

  it("abaixo do limite permite", () => {
    expect(decideTenantLimit("clients", base, 24).ok).toBe(true);
  });

  it("exatamente no limite bloqueia — o 26º é que não entra", () => {
    const d = decideTenantLimit("clients", base, 25);
    expect(d).toEqual({ ok: false, reason: "reached", used: 25, limit: 25 });
  });

  it("acima do limite (tenant que já excedia) continua bloqueado", () => {
    expect(decideTenantLimit("clients", base, 40).ok).toBe(false);
  });

  it("limite zero bloqueia desde o primeiro", () => {
    expect(decideTenantLimit("clients", com({ clients_limit: 0 }), 0).ok).toBe(false);
  });
});

describe("decideTenantLimit — pacientes", () => {
  it("é independente do limite de clientes", () => {
    const limites = com({
      clients_limit_enabled: true,
      clients_limit: 0,
      patients_limit_enabled: false,
    });
    expect(decideTenantLimit("clients", limites, 0).ok).toBe(false);
    expect(decideTenantLimit("patients", limites, 500).ok).toBe(true);
  });

  it("bloqueia no limite", () => {
    expect(decideTenantLimit("patients", base, 25).ok).toBe(false);
  });
});

describe("decideTenantLimit — equipe", () => {
  it("desabilitada bloqueia com reason=disabled, mesmo com uso zero", () => {
    const d = decideTenantLimit("team_members", com({ team_members_enabled: false }), 0);
    expect(d).toEqual({ ok: false, reason: "disabled", used: 0, limit: 0 });
  });

  it("ilimitada permite qualquer quantidade", () => {
    const limites = com({ team_members_enabled: true, team_members_unlimited: true });
    expect(decideTenantLimit("team_members", limites, 999).ok).toBe(true);
  });

  it("com assentos: permite abaixo, bloqueia no limite", () => {
    const limites = com({ team_members_enabled: true, team_members_limit: 3 });
    expect(decideTenantLimit("team_members", limites, 2).ok).toBe(true);
    expect(decideTenantLimit("team_members", limites, 3).ok).toBe(false);
  });
});

describe("decideTenantLimit — sem linha de limites", () => {
  it("não bloqueia (mesma escolha do trigger: falha aberta)", () => {
    for (const kind of ["clients", "patients", "team_members"] as const) {
      expect(decideTenantLimit(kind, null, 10_000).ok).toBe(true);
    }
  });
});

describe("tenantLimitMessage", () => {
  it("não devolve mensagem quando está tudo certo", () => {
    expect(tenantLimitMessage("clients", { ok: true })).toBeNull();
  });

  it("cita o número do limite, não o uso", () => {
    expect(tenantLimitMessage("clients", { ok: false, reason: "reached", used: 30, limit: 25 }))
      .toContain("25 clientes");
    expect(tenantLimitMessage("patients", { ok: false, reason: "reached", used: 25, limit: 25 }))
      .toContain("25 pacientes");
  });

  it("equipe desabilitada tem mensagem própria, sem número", () => {
    const m = tenantLimitMessage("team_members", { ok: false, reason: "disabled", used: 0, limit: 0 })!;
    expect(m).toContain("não está habilitado");
    expect(m).not.toMatch(/\d/);
  });

  it("equipe no limite fala em assentos", () => {
    expect(tenantLimitMessage("team_members", { ok: false, reason: "reached", used: 3, limit: 3 }))
      .toContain("assentos");
  });

  it("está em pt-BR (regra do projeto)", () => {
    const m = tenantLimitMessage("clients", { ok: false, reason: "reached", used: 25, limit: 25 })!;
    expect(m).toContain("Você");
    expect(m).not.toContain("Utilizador");
  });
});

describe("mapPgLimitError", () => {
  it("traduz cada código levantado pelo trigger", () => {
    expect(mapPgLimitError({ message: "LIMITE_CLIENTES_ATINGIDO" })).toContain("clientes");
    expect(mapPgLimitError({ message: "LIMITE_PACIENTES_ATINGIDO" })).toContain("pacientes");
    expect(mapPgLimitError({ message: "EQUIPE_DESABILITADA" })).toContain("não está habilitado");
    expect(mapPgLimitError({ message: "LIMITE_EQUIPE_ATINGIDO" })).toContain("assentos");
  });

  it("aceita string crua e mensagem embrulhada pelo PostgREST", () => {
    expect(mapPgLimitError("LIMITE_CLIENTES_ATINGIDO")).toBeTruthy();
    expect(
      mapPgLimitError({ message: 'erro ao inserir: LIMITE_PACIENTES_ATINGIDO (limite=25 atual=25)' }),
    ).toBeTruthy();
  });

  it("devolve null para erro que não é de limite", () => {
    expect(mapPgLimitError({ message: "duplicate key value violates unique constraint" })).toBeNull();
    expect(mapPgLimitError(null)).toBeNull();
    expect(mapPgLimitError(undefined)).toBeNull();
    expect(mapPgLimitError({})).toBeNull();
  });
});

describe("remainingSlots", () => {
  it("null quando não há limite aplicável", () => {
    expect(remainingSlots("clients", com({ clients_limit_enabled: false }), 10)).toBeNull();
    expect(remainingSlots("team_members", com({ team_members_enabled: true, team_members_unlimited: true }), 5)).toBeNull();
    expect(remainingSlots("clients", null, 5)).toBeNull();
  });

  it("conta as vagas restantes e nunca fica negativo", () => {
    expect(remainingSlots("clients", base, 20)).toBe(5);
    expect(remainingSlots("clients", base, 25)).toBe(0);
    expect(remainingSlots("clients", base, 40)).toBe(0);
  });

  it("equipe desabilitada tem zero vagas", () => {
    expect(remainingSlots("team_members", com({ team_members_enabled: false }), 0)).toBe(0);
  });
});

describe("buildLimitUiState — o que a UI do tenant mostra", () => {
  it("sem limite aplicável: sem contador e sem bloqueio", () => {
    const s = buildLimitUiState("clients", com({ clients_limit_enabled: false }), 40);
    expect(s.limit).toBeNull();
    expect(s.remaining).toBeNull();
    expect(s.blocked).toBe(false);
    expect(s.message).toBeNull();
  });

  it("abaixo do limite: mostra uso e quanto falta", () => {
    const s = buildLimitUiState("clients", base, 20);
    expect(s).toMatchObject({ used: 20, limit: 25, remaining: 5, blocked: false });
    expect(s.message).toBeNull();
  });

  it("no limite: bloqueia e traz a mensagem do tooltip", () => {
    const s = buildLimitUiState("patients", base, 25);
    expect(s.blocked).toBe(true);
    expect(s.remaining).toBe(0);
    expect(s.message).toContain("25 pacientes");
  });

  it("acima do limite: remaining nunca fica negativo", () => {
    const s = buildLimitUiState("clients", base, 40);
    expect(s.remaining).toBe(0);
    expect(s.blocked).toBe(true);
  });

  it("equipe desabilitada: limite 0, bloqueado, com mensagem própria", () => {
    const s = buildLimitUiState("team_members", com({ team_members_enabled: false }), 0);
    expect(s.limit).toBe(0);
    expect(s.blocked).toBe(true);
    expect(s.message).toContain("não está habilitado");
  });

  it("assentos ilimitados: sem contador e sem bloqueio", () => {
    const s = buildLimitUiState(
      "team_members",
      com({ team_members_enabled: true, team_members_unlimited: true }),
      99,
    );
    expect(s.limit).toBeNull();
    expect(s.blocked).toBe(false);
  });

  it("sem linha de limites: estado neutro", () => {
    const s = buildLimitUiState("clients", null, 500);
    expect(s).toMatchObject({ used: 500, limit: null, remaining: null, blocked: false });
  });
});
