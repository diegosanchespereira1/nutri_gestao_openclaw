import { describe, expect, it } from "vitest";

import {
  filterWorkspaceTemplatesForEstablishmentClient,
  normalizeWorkspaceTemplateClientId,
  workspaceTemplateAllowedForFill,
  workspaceTemplateClientLabel,
  workspaceTemplateVisibleForEstablishmentClient,
} from "@/lib/checklists/workspace-template-client-scope";

describe("normalizeWorkspaceTemplateClientId", () => {
  it("trata vazio como todos os clientes", () => {
    expect(normalizeWorkspaceTemplateClientId(null)).toEqual({
      ok: true,
      clientId: null,
    });
    expect(normalizeWorkspaceTemplateClientId("")).toEqual({
      ok: true,
      clientId: null,
    });
    expect(normalizeWorkspaceTemplateClientId("   ")).toEqual({
      ok: true,
      clientId: null,
    });
  });

  it("aceita UUID válido", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(normalizeWorkspaceTemplateClientId(id)).toEqual({
      ok: true,
      clientId: id,
    });
  });

  it("rejeita valor que não é UUID", () => {
    const result = normalizeWorkspaceTemplateClientId("cliente-x");
    expect(result.ok).toBe(false);
  });
});

describe("workspaceTemplateVisibleForEstablishmentClient", () => {
  const clientA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const clientB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  it("modelo global aparece para qualquer estabelecimento", () => {
    expect(
      workspaceTemplateVisibleForEstablishmentClient(null, clientA),
    ).toBe(true);
  });

  it("sem estabelecimento selecionado, mostra também os vinculados", () => {
    expect(
      workspaceTemplateVisibleForEstablishmentClient(clientA, null),
    ).toBe(true);
  });

  it("modelo vinculado só aparece no cliente correspondente", () => {
    expect(
      workspaceTemplateVisibleForEstablishmentClient(clientA, clientA),
    ).toBe(true);
    expect(
      workspaceTemplateVisibleForEstablishmentClient(clientA, clientB),
    ).toBe(false);
  });
});

describe("filterWorkspaceTemplatesForEstablishmentClient", () => {
  const clientA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const clientB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const list = [
    { id: "g", client_id: null },
    { id: "a", client_id: clientA },
    { id: "b", client_id: clientB },
  ];

  it("sem cliente do estabelecimento, devolve a lista inteira", () => {
    expect(filterWorkspaceTemplatesForEstablishmentClient(list, null)).toHaveLength(
      3,
    );
  });

  it("com cliente, devolve globais + do mesmo cliente", () => {
    const out = filterWorkspaceTemplatesForEstablishmentClient(list, clientA);
    expect(out.map((t) => t.id)).toEqual(["g", "a"]);
  });
});

describe("workspaceTemplateAllowedForFill", () => {
  const clientA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const clientB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  it("permite preencher modelo global em qualquer cliente", () => {
    expect(workspaceTemplateAllowedForFill(null, clientA)).toBe(true);
  });

  it("bloqueia preenchimento em cliente diferente do vinculado", () => {
    expect(workspaceTemplateAllowedForFill(clientA, clientB)).toBe(false);
    expect(workspaceTemplateAllowedForFill(clientA, clientA)).toBe(true);
  });
});

describe("workspaceTemplateClientLabel", () => {
  it("prioriza nome fantasia", () => {
    expect(
      workspaceTemplateClientLabel({
        legal_name: "Razão Social Ltda",
        trade_name: "Fantasia",
      }),
    ).toBe("Fantasia");
  });

  it("cai na razão social se não houver fantasia", () => {
    expect(
      workspaceTemplateClientLabel({
        legal_name: "Razão Social Ltda",
        trade_name: null,
      }),
    ).toBe("Razão Social Ltda");
  });
});
