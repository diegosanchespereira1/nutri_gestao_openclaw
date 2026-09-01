import { describe, expect, it } from "vitest";

import {
  limitsBelowUsageWarnings,
  parseTenantLimitsForm,
  type TenantLimitsInput,
} from "./tenant-limits-form";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

const validos = {
  clients_limit_enabled: "on",
  clients_limit: "25",
  patients_limit_enabled: "on",
  patients_limit: "25",
  team_members_enabled: "on",
  team_members_limit: "3",
};

describe("parseTenantLimitsForm", () => {
  it("lê um formulário completo", () => {
    const r = parseTenantLimitsForm(fd(validos));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      clients_limit_enabled: true,
      clients_limit: 25,
      patients_limit_enabled: true,
      patients_limit: 25,
      team_members_enabled: true,
      team_members_unlimited: false,
      team_members_limit: 3,
      notes: null,
    });
  });

  it("checkbox ausente é falso — é assim que o HTML envia", () => {
    const r = parseTenantLimitsForm(fd({ clients_limit: "25", patients_limit: "10" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.clients_limit_enabled).toBe(false);
    expect(r.value.team_members_enabled).toBe(false);
  });

  it("aceita as várias formas de checkbox marcado", () => {
    for (const v of ["on", "true", "1"]) {
      const r = parseTenantLimitsForm(fd({ ...validos, clients_limit_enabled: v }));
      expect(r.ok && r.value.clients_limit_enabled).toBe(true);
    }
  });

  it("recusa valor não numérico", () => {
    const r = parseTenantLimitsForm(fd({ ...validos, clients_limit: "vinte" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("número inteiro");
  });

  it("recusa negativo (o sinal não é dígito)", () => {
    expect(parseTenantLimitsForm(fd({ ...validos, patients_limit: "-5" })).ok).toBe(false);
  });

  it("recusa valor acima do teto", () => {
    const r = parseTenantLimitsForm(fd({ ...validos, clients_limit: "100001" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("máximo");
  });

  it("campo vazio vira zero", () => {
    const r = parseTenantLimitsForm(fd({ clients_limit: "", patients_limit: "" }));
    expect(r.ok && r.value.clients_limit).toBe(0);
  });

  it("limite ligado com zero é recusado — bloquearia tudo por engano", () => {
    const r = parseTenantLimitsForm(fd({ ...validos, clients_limit: "0" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("suspensão");
  });

  it("equipe habilitada com 0 assentos e sem ilimitado é recusada", () => {
    const r = parseTenantLimitsForm(
      fd({ ...validos, team_members_limit: "0" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("ilimitados");
  });

  it("ilimitado só vale com a equipe habilitada", () => {
    const comEquipe = parseTenantLimitsForm(
      fd({ ...validos, team_members_unlimited: "on" }),
    );
    expect(comEquipe.ok && comEquipe.value.team_members_unlimited).toBe(true);

    const semEquipe = parseTenantLimitsForm(
      fd({ clients_limit: "25", patients_limit: "25", team_members_unlimited: "on" }),
    );
    expect(semEquipe.ok && semEquipe.value.team_members_unlimited).toBe(false);
  });

  it("ilimitado dispensa a quantidade de assentos", () => {
    const r = parseTenantLimitsForm(
      fd({ ...validos, team_members_unlimited: "on", team_members_limit: "0" }),
    );
    expect(r.ok).toBe(true);
  });

  it("corta a nota em 500 caracteres", () => {
    const r = parseTenantLimitsForm(fd({ ...validos, notes: "x".repeat(900) }));
    expect(r.ok && r.value.notes?.length).toBe(500);
  });
});

describe("limitsBelowUsageWarnings", () => {
  const base: TenantLimitsInput = {
    clients_limit_enabled: true,
    clients_limit: 25,
    patients_limit_enabled: true,
    patients_limit: 25,
    team_members_enabled: true,
    team_members_unlimited: false,
    team_members_limit: 3,
    notes: null,
  };

  it("silencia quando o uso cabe no limite", () => {
    expect(limitsBelowUsageWarnings(base, { clients: 10, patients: 10, teamMembers: 2 })).toEqual([]);
  });

  it("avisa quando o uso já passou, sem bloquear", () => {
    const avisos = limitsBelowUsageWarnings(base, { clients: 40, patients: 30, teamMembers: 5 });
    expect(avisos).toHaveLength(3);
    expect(avisos[0]).toContain("40 clientes");
    expect(avisos[0]).toContain("continuam");
  });

  it("não avisa sobre limite desligado", () => {
    const semLimite = { ...base, clients_limit_enabled: false, patients_limit_enabled: false };
    expect(limitsBelowUsageWarnings(semLimite, { clients: 999, patients: 999, teamMembers: 2 })).toEqual([]);
  });

  it("assentos ilimitados nunca geram aviso", () => {
    const ilimitado = { ...base, team_members_unlimited: true };
    const avisos = limitsBelowUsageWarnings(ilimitado, { clients: 1, patients: 1, teamMembers: 99 });
    expect(avisos).toEqual([]);
  });
});
