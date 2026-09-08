import { describe, expect, it } from "vitest";

import {
  matchChildKey,
  normalizeNameForFuzzyMatch,
  resolveChildRowMatchStatus,
  type ChildPatientMatchCandidate,
} from "./child-assessment-match";

const maria: ChildPatientMatchCandidate = {
  id: "p1",
  full_name: "María Da Silva",
  birth_date: "2018-03-12",
  client_id: "client-a",
  establishment_id: "est-a",
};

describe("normalizeNameForFuzzyMatch", () => {
  it("remove acentuação, caixa e espaços extras", () => {
    expect(normalizeNameForFuzzyMatch("María  Da Silva")).toBe(
      normalizeNameForFuzzyMatch("Maria da Silva"),
    );
  });
});

describe("resolveChildRowMatchStatus", () => {
  const patients = [maria];
  const index = new Map([[matchChildKey(maria.full_name, maria.birth_date), maria]]);

  it("linha sem paciente parecido → novo", () => {
    const status = resolveChildRowMatchStatus(
      { full_name: "Outra Criança", birth_date: "2019-01-01" },
      patients,
      index,
      null,
    );
    expect(status.kind).toBe("new");
  });

  it("nome e nascimento exatos, mesmo cliente → matched", () => {
    const status = resolveChildRowMatchStatus(
      { full_name: "María Da Silva", birth_date: "2018-03-12" },
      patients,
      index,
      { clientId: "client-a", establishmentId: "est-a" },
    );
    expect(status.kind).toBe("matched");
    if (status.kind === "matched") expect(status.patient.id).toBe("p1");
  });

  it("nome exato mas cliente do lote diferente do paciente → cross_link", () => {
    const status = resolveChildRowMatchStatus(
      { full_name: "María Da Silva", birth_date: "2018-03-12" },
      patients,
      index,
      { clientId: "client-b", establishmentId: null },
    );
    expect(status.kind).toBe("cross_link");
  });

  it("mesma data de nascimento, nome sem acento igual mas grafia diferente → near_duplicate", () => {
    const status = resolveChildRowMatchStatus(
      { full_name: "Maria da Silva", birth_date: "2018-03-12" },
      patients,
      index,
      null,
    );
    expect(status.kind).toBe("near_duplicate");
    if (status.kind === "near_duplicate") expect(status.candidate.id).toBe("p1");
  });

  it("nome parecido mas data de nascimento diferente → novo (não avisa)", () => {
    const status = resolveChildRowMatchStatus(
      { full_name: "Maria da Silva", birth_date: "2019-05-05" },
      patients,
      index,
      null,
    );
    expect(status.kind).toBe("new");
  });
});
