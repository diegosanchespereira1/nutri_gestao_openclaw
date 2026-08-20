import { describe, expect, it, vi } from "vitest";

import {
  persistWorkspaceTemplateMetadata,
  persistWorkspaceTemplateStructure,
} from "@/lib/checklists/workspace-template-persist";

type Row = Record<string, unknown>;

type MockResult = {
  data?: Row | Row[] | null;
  error?: { message: string } | null;
  count?: number | null;
};

/**
 * Mock encadeável do client Supabase usado pelo persist.
 * Cada chamada a `.from(table)` consome o próximo resultado da fila daquela tabela.
 */
function createQueuedSupabase(queues: Record<string, MockResult[]>) {
  const take = (table: string): MockResult => {
    const q = queues[table];
    if (!q || q.length === 0) {
      throw new Error(`Sem resultado mock para from("${table}")`);
    }
    return q.shift()!;
  };

  const supabase = {
    from(table: string) {
      const result = take(table);
      const builder: Record<string, unknown> = {};
      const api = {
        select: () => api,
        insert: () => api,
        update: () => api,
        delete: () => api,
        eq: () => api,
        in: () => api,
        is: () => api,
        single: async () => ({
          data: (Array.isArray(result.data) ? result.data[0] : result.data) ?? null,
          error: result.error ?? null,
        }),
        maybeSingle: async () => ({
          data: (Array.isArray(result.data) ? result.data[0] : result.data) ?? null,
          error: result.error ?? null,
        }),
        then(onFulfilled: (value: MockResult) => unknown) {
          return Promise.resolve({
            data: result.data ?? null,
            error: result.error ?? null,
            count: result.count ?? null,
          }).then(onFulfilled);
        },
      };
      Object.assign(builder, api);
      return api;
    },
  };

  return supabase as unknown as Parameters<
    typeof persistWorkspaceTemplateStructure
  >[0];
}

describe("persistWorkspaceTemplateStructure", () => {
  it("não retorna sucesso se o soft-delete de itens removidos afetar 0 linhas", async () => {
    const templateId = "tpl-1";
    const sectionId = "sec-1";
    const keepId = "item-keep";
    const removeId = "item-remove";

    const supabase = createQueuedSupabase({
      checklist_fill_sessions: [
        // open sessions check
        { count: 0, data: null, error: null },
      ],
      checklist_workspace_templates: [
        // name update
        { data: [{ id: templateId }], error: null },
      ],
      checklist_workspace_sections: [
        // old sections
        { data: [{ id: sectionId }], error: null },
        // section update
        { data: [{ id: sectionId }], error: null },
        // verify sections
        { data: [{ id: sectionId }], error: null },
      ],
      checklist_workspace_items: [
        // old active items
        { data: [{ id: keepId }, { id: removeId }], error: null },
        // update kept item
        { data: [{ id: keepId }], error: null },
        // soft-delete removable — 0 rows (bug histórico / RLS)
        { data: [], error: null },
      ],
    });

    const result = await persistWorkspaceTemplateStructure(
      supabase,
      templateId,
      "owner-1",
      {
        name: "Checklist Meire",
        sections: [
          {
            id: sectionId,
            title: "Geral",
            items: [
              { id: keepId, description: "Item mantido", is_required: true },
            ],
          },
        ],
      },
      { isDraft: false, bumpVersionIfUsed: false },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.toLowerCase()).toMatch(/não|arquiv|permissão|removid/);
    }
  });

  it("não retorna sucesso se update de item afetar 0 linhas", async () => {
    const templateId = "tpl-1";
    const sectionId = "sec-1";
    const itemId = "item-1";

    const supabase = createQueuedSupabase({
      checklist_fill_sessions: [{ count: 0, data: null, error: null }],
      checklist_workspace_templates: [
        { data: [{ id: templateId }], error: null },
      ],
      checklist_workspace_sections: [
        { data: [{ id: sectionId }], error: null },
        { data: [{ id: sectionId }], error: null },
      ],
      checklist_workspace_items: [
        { data: [{ id: itemId }], error: null },
        // update item → 0 rows
        { data: [], error: null },
      ],
    });

    const result = await persistWorkspaceTemplateStructure(
      supabase,
      templateId,
      "owner-1",
      {
        name: "Checklist",
        sections: [
          {
            id: sectionId,
            title: "Geral",
            items: [
              { id: itemId, description: "Texto alterado", is_required: false },
            ],
          },
        ],
      },
      { isDraft: false, bumpVersionIfUsed: false },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/item|permissão/i);
    }
  });

  it("bloqueia edição quando há rascunhos em aberto (antes de mutar)", async () => {
    const supabase = createQueuedSupabase({
      checklist_fill_sessions: [{ count: 2, data: null, error: null }],
    });

    const fromSpy = vi.spyOn(supabase, "from");

    const result = await persistWorkspaceTemplateStructure(
      supabase,
      "tpl-1",
      "owner-1",
      {
        name: "X",
        sections: [
          {
            title: "Geral",
            items: [{ description: "A", is_required: true }],
          },
        ],
      },
      { isDraft: false, bumpVersionIfUsed: false },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/rascunhos em aberto/i);
    }
    // Só consultou fill_sessions — não tentou gravar template ainda.
    expect(fromSpy.mock.calls.map((c) => c[0])).toEqual([
      "checklist_fill_sessions",
    ]);
  });

  it("retorna ok quando remoção e verificação final batem", async () => {
    const templateId = "tpl-1";
    const sectionId = "sec-1";
    const keepId = "item-keep";
    const removeId = "item-remove";

    const supabase = createQueuedSupabase({
      checklist_fill_sessions: [{ count: 0, data: null, error: null }],
      checklist_workspace_templates: [
        { data: [{ id: templateId }], error: null },
      ],
      checklist_workspace_sections: [
        { data: [{ id: sectionId }], error: null },
        { data: [{ id: sectionId }], error: null },
        { data: [{ id: sectionId }], error: null },
      ],
      checklist_workspace_items: [
        { data: [{ id: keepId }, { id: removeId }], error: null },
        { data: [{ id: keepId }], error: null },
        { data: [{ id: removeId }], error: null },
        // verify active items
        { data: [{ id: keepId }], error: null },
      ],
    });

    const result = await persistWorkspaceTemplateStructure(
      supabase,
      templateId,
      "owner-1",
      {
        name: "Checklist Meire",
        sections: [
          {
            id: sectionId,
            title: "Geral",
            items: [
              { id: keepId, description: "Item mantido", is_required: true },
            ],
          },
        ],
      },
      { isDraft: false, bumpVersionIfUsed: false },
    );

    expect(result).toEqual({
      ok: true,
      sections: [
        {
          id: sectionId,
          title: "Geral",
          items: [
            { id: keepId, description: "Item mantido", is_required: true },
          ],
        },
      ],
    });
  });
});

describe("persistWorkspaceTemplateMetadata", () => {
  it("grava o vínculo com o cliente sem consultar preenchimentos em aberto", async () => {
    const supabase = createQueuedSupabase({
      checklist_workspace_templates: [
        { data: [{ id: "tpl-1" }], error: null },
      ],
    });
    const fromSpy = vi.spyOn(supabase, "from");

    const result = await persistWorkspaceTemplateMetadata(
      supabase,
      "tpl-1",
      "owner-1",
      { name: "Checklist de teste", clientId: "client-pj-1" },
    );

    expect(result).toEqual({ ok: true });
    expect(fromSpy.mock.calls.map((c) => c[0])).toEqual([
      "checklist_workspace_templates",
    ]);
  });

  it("falha se o update não afetar nenhuma linha", async () => {
    const supabase = createQueuedSupabase({
      checklist_workspace_templates: [{ data: [], error: null }],
    });

    const result = await persistWorkspaceTemplateMetadata(
      supabase,
      "tpl-1",
      "owner-1",
      { clientId: null },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/permissão|não foi encontrado/i);
    }
  });
});
