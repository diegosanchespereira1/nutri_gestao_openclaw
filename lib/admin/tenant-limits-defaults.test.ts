import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_TENANT_LIMITS, MAX_TENANT_LIMIT } from "./tenant-limits-defaults";

/**
 * Estes defaults existem em dois lugares — aqui e nos DEFAULT da migration
 * 20261001121000_tenant_limits.sql. Se um mudar sem o outro, o wizard mostra
 * um valor e o banco grava outro. O teste lê o SQL e compara.
 */
const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261001121000_tenant_limits.sql"),
  "utf8",
);

function defaultDaMigration(coluna: string): string {
  const m = new RegExp(`${coluna}\\s+(?:boolean|integer)\\s+not null default (\\S+)`).exec(migration);
  if (!m) throw new Error(`default de ${coluna} não encontrado na migration`);
  return m[1]!.replace(/,$/, "");
}

describe("defaults de tenant novo", () => {
  it("tenant novo nasce com 25 clientes, 25 pacientes e equipe desabilitada", () => {
    expect(DEFAULT_NEW_TENANT_LIMITS).toEqual({
      clients_limit_enabled: true,
      clients_limit: 25,
      patients_limit_enabled: true,
      patients_limit: 25,
      team_members_enabled: false,
      team_members_unlimited: false,
      team_members_limit: 0,
    });
  });

  it("batem com os DEFAULT da migration — não podem divergir", () => {
    expect(defaultDaMigration("clients_limit_enabled")).toBe("true");
    expect(defaultDaMigration("clients_limit")).toBe("25");
    expect(defaultDaMigration("patients_limit_enabled")).toBe("true");
    expect(defaultDaMigration("patients_limit")).toBe("25");
    expect(defaultDaMigration("team_members_enabled")).toBe("false");
    expect(defaultDaMigration("team_members_unlimited")).toBe("false");
    expect(defaultDaMigration("team_members_limit")).toBe("0");
  });

  it("o teto é o mesmo usado na validação do formulário", () => {
    expect(MAX_TENANT_LIMIT).toBe(100_000);
  });
});
