import { describe, expect, it } from "vitest";

import {
  WORKSPACE_TEMPLATE_DRAFT_DEFAULT_NAME,
  normalizeDraftTemplateInput,
  normalizeDraftTemplateName,
} from "@/lib/checklists/workspace-template-draft";

describe("normalizeDraftTemplateName", () => {
  it("usa nome padrão quando vazio", () => {
    expect(normalizeDraftTemplateName("")).toBe(
      WORKSPACE_TEMPLATE_DRAFT_DEFAULT_NAME,
    );
    expect(normalizeDraftTemplateName("   ")).toBe(
      WORKSPACE_TEMPLATE_DRAFT_DEFAULT_NAME,
    );
  });

  it("preserva nome informado", () => {
    expect(normalizeDraftTemplateName("La Vieiras Hipica")).toBe(
      "La Vieiras Hipica",
    );
  });
});

describe("normalizeDraftTemplateInput", () => {
  it("garante ao menos uma seção e um item", () => {
    const result = normalizeDraftTemplateInput({ name: "", sections: [] });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.title).toBe("Geral");
    expect(result.sections[0]?.items).toHaveLength(1);
  });

  it("mantém itens com descrição vazia no rascunho", () => {
    const result = normalizeDraftTemplateInput({
      name: "La Vieiras Hipica",
      sections: [
        {
          title: "Cozinha",
          items: [{ description: "", is_required: true }],
        },
      ],
    });
    expect(result.name).toBe("La Vieiras Hipica");
    expect(result.sections[0]?.items[0]?.description).toBe("");
    expect(result.sections[0]?.items[0]?.is_required).toBe(true);
    expect(result.clientId).toBeNull();
  });

  it("preserva o cliente vinculado no rascunho", () => {
    const clientId = "550e8400-e29b-41d4-a716-446655440000";
    const result = normalizeDraftTemplateInput({
      name: "Checklist do hotel",
      clientId,
      sections: [
        {
          title: "Cozinha",
          items: [{ description: "Pia limpa", is_required: true }],
        },
      ],
    });
    expect(result.clientId).toBe(clientId);
  });
});
