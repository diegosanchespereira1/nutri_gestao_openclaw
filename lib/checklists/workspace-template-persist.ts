import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  WorkspaceEditSection,
} from "@/lib/actions/checklist-workspace";

export type PersistWorkspaceTemplateOptions = {
  isDraft: boolean;
  bumpVersionIfUsed: boolean;
};

export type PersistWorkspaceTemplateResult =
  | { ok: true; sections: WorkspaceEditSection[] }
  | { ok: false; error: string };

function asIdList(rows: Array<{ id: string }> | null | undefined): string[] {
  return (rows ?? []).map((row) => String(row.id));
}

/**
 * Persiste nome + seções + itens de um modelo da equipe.
 * `clientId` opcional: quando informado, grava o vínculo com o cliente PJ
 * (`null` = todos os clientes).
 *
 * Regra crítica: nunca devolve `ok: true` se remoções/atualizações não
 * afetaram as linhas esperadas (PostgREST/RLS costumam retornar sucesso com 0 rows).
 */
export async function persistWorkspaceTemplateStructure(
  supabase: SupabaseClient,
  templateId: string,
  workspaceOwnerId: string,
  input: {
    name: string;
    sections: WorkspaceEditSection[];
    clientId?: string | null;
  },
  options: PersistWorkspaceTemplateOptions,
): Promise<PersistWorkspaceTemplateResult> {
  // Bloqueios antes de qualquer mutação — evita "salvou o nome e ignorou o resto".
  if (!options.isDraft) {
    const { count: openSessionsCount, error: openErr } = await supabase
      .from("checklist_fill_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_template_id", templateId)
      .is("dossier_approved_at", null);

    if (openErr) {
      return {
        ok: false,
        error:
          "Não foi possível verificar se há preenchimentos em aberto. Tente novamente.",
      };
    }

    if ((openSessionsCount ?? 0) > 0) {
      return {
        ok: false,
        error:
          "Existem rascunhos em aberto usando este modelo. Aprove-os ou exclua-os antes de editar.",
      };
    }
  }

  const templatePatch: { name: string; client_id?: string | null } = {
    name: input.name,
  };
  if (input.clientId !== undefined) {
    templatePatch.client_id = input.clientId;
  }

  const { data: nameRows, error: nameErr } = await supabase
    .from("checklist_workspace_templates")
    .update(templatePatch)
    .eq("id", templateId)
    .eq("owner_user_id", workspaceOwnerId)
    .select("id");
  if (nameErr) {
    return { ok: false, error: "Não foi possível salvar o modelo." };
  }
  if (!nameRows || nameRows.length === 0) {
    return {
      ok: false,
      error:
        "Sem permissão para alterar este modelo, ou ele não foi encontrado.",
    };
  }

  const { data: oldSections, error: oldSecErr } = await supabase
    .from("checklist_workspace_sections")
    .select("id")
    .eq("workspace_template_id", templateId);
  if (oldSecErr) {
    return {
      ok: false,
      error: "Não foi possível carregar as seções atuais do modelo.",
    };
  }

  const oldSectionIds = asIdList(oldSections);
  const { data: oldItems, error: oldItemsErr } =
    oldSectionIds.length > 0
      ? await supabase
          .from("checklist_workspace_items")
          .select("id")
          .in("workspace_section_id", oldSectionIds)
          .is("archived_at", null)
      : { data: [] as { id: string }[], error: null };
  if (oldItemsErr) {
    return {
      ok: false,
      error: "Não foi possível carregar os itens atuais do modelo.",
    };
  }

  const oldItemIds = asIdList(oldItems);

  const payloadSectionIds = new Set(
    input.sections.map((sec) => sec.id).filter((id): id is string => Boolean(id)),
  );
  const payloadItemIds = new Set(
    input.sections
      .flatMap((sec) => sec.items.map((it) => it.id))
      .filter((id): id is string => Boolean(id)),
  );

  const persistedSections: WorkspaceEditSection[] = [];
  let sectionPos = 0;

  for (const sec of input.sections) {
    let sectionId: string;

    if (sec.id && payloadSectionIds.has(sec.id)) {
      const { data: secRows, error: secErr } = await supabase
        .from("checklist_workspace_sections")
        .update({ title: sec.title, position: sectionPos })
        .eq("id", sec.id)
        .eq("workspace_template_id", templateId)
        .select("id");
      if (secErr) {
        return { ok: false, error: "Não foi possível salvar as seções." };
      }
      if (!secRows || secRows.length === 0) {
        return {
          ok: false,
          error:
            "Não foi possível salvar uma seção (sem permissão ou seção inválida).",
        };
      }
      sectionId = sec.id;
    } else {
      const { data: secRow, error: secErr } = await supabase
        .from("checklist_workspace_sections")
        .insert({
          workspace_template_id: templateId,
          title: sec.title,
          position: sectionPos,
        })
        .select("id")
        .single();
      if (secErr || !secRow) {
        return { ok: false, error: "Não foi possível salvar as seções." };
      }
      sectionId = String(secRow.id);
    }

    const persistedItems: WorkspaceEditSection["items"] = [];
    let itemPos = 0;

    for (const it of sec.items) {
      if (it.id && payloadItemIds.has(it.id)) {
        const { data: itemRows, error: itemErr } = await supabase
          .from("checklist_workspace_items")
          .update({
            workspace_section_id: sectionId,
            description: it.description,
            is_required: it.is_required,
            position: itemPos,
            archived_at: null,
          })
          .eq("id", it.id)
          .select("id");
        if (itemErr) {
          return { ok: false, error: "Não foi possível salvar os itens." };
        }
        if (!itemRows || itemRows.length === 0) {
          return {
            ok: false,
            error:
              "Não foi possível salvar um item (sem permissão ou item inválido).",
          };
        }
        persistedItems.push({
          id: it.id,
          description: it.description,
          is_required: it.is_required,
        });
      } else {
        const { data: itemRow, error: itemErr } = await supabase
          .from("checklist_workspace_items")
          .insert({
            workspace_section_id: sectionId,
            description: it.description,
            is_required: it.is_required,
            position: itemPos,
          })
          .select("id")
          .single();
        if (itemErr || !itemRow) {
          return { ok: false, error: "Não foi possível salvar os itens." };
        }
        persistedItems.push({
          id: String(itemRow.id),
          description: it.description,
          is_required: it.is_required,
        });
      }
      itemPos += 1;
    }

    persistedSections.push({
      id: sectionId,
      title: sec.title,
      items: persistedItems,
    });
    sectionPos += 1;
  }

  const removableItemIds = oldItemIds.filter((id) => !payloadItemIds.has(id));
  if (removableItemIds.length > 0) {
    // Soft-delete: preserva histórico se o item já foi usado em fills.
    const { data: archivedRows, error: archiveErr } = await supabase
      .from("checklist_workspace_items")
      .update({ archived_at: new Date().toISOString() })
      .in("id", removableItemIds)
      .is("archived_at", null)
      .select("id");

    if (archiveErr) {
      return {
        ok: false,
        error:
          "Não foi possível remover os itens excluídos. Nenhuma alteração de remoção foi confirmada.",
      };
    }

    const archivedIds = new Set(asIdList(archivedRows));
    const missing = removableItemIds.filter((id) => !archivedIds.has(id));
    if (missing.length > 0) {
      return {
        ok: false,
        error:
          "Alguns itens removidos não puderam ser arquivados (sem permissão ou falha no servidor). As alterações NÃO foram salvas por completo — tente novamente.",
      };
    }
  }

  for (const sectionId of oldSectionIds) {
    if (payloadSectionIds.has(sectionId)) continue;
    const { count: activeItemCount, error: activeErr } = await supabase
      .from("checklist_workspace_items")
      .select("id", { count: "exact", head: true })
      .eq("workspace_section_id", sectionId)
      .is("archived_at", null);
    if (activeErr) {
      return {
        ok: false,
        error: "Não foi possível validar seções removidas.",
      };
    }
    if ((activeItemCount ?? 0) > 0) continue;

    const { count: anyItemCount, error: anyErr } = await supabase
      .from("checklist_workspace_items")
      .select("id", { count: "exact", head: true })
      .eq("workspace_section_id", sectionId);
    if (anyErr) {
      return {
        ok: false,
        error: "Não foi possível validar seções removidas.",
      };
    }
    if ((anyItemCount ?? 0) === 0) {
      const { error: delSecErr } = await supabase
        .from("checklist_workspace_sections")
        .delete()
        .eq("id", sectionId)
        .eq("workspace_template_id", templateId);
      if (delSecErr) {
        return {
          ok: false,
          error: "Não foi possível remover uma seção vazia.",
        };
      }
    }
  }

  // Verificação final: itens ativos no banco devem bater com o payload persistido.
  const expectedActiveIds = new Set(
    persistedSections.flatMap((sec) =>
      sec.items.map((it) => it.id).filter((id): id is string => Boolean(id)),
    ),
  );
  const { data: verifySections, error: verifySecErr } = await supabase
    .from("checklist_workspace_sections")
    .select("id")
    .eq("workspace_template_id", templateId);
  if (verifySecErr) {
    return {
      ok: false,
      error: "Não foi possível confirmar o salvamento. Tente novamente.",
    };
  }
  const verifySectionIds = asIdList(verifySections);
  if (verifySectionIds.length > 0) {
    const { data: verifyItems, error: verifyItemsErr } = await supabase
      .from("checklist_workspace_items")
      .select("id")
      .in("workspace_section_id", verifySectionIds)
      .is("archived_at", null);
    if (verifyItemsErr) {
      return {
        ok: false,
        error: "Não foi possível confirmar o salvamento. Tente novamente.",
      };
    }
    const actualActiveIds = new Set(asIdList(verifyItems));
    if (actualActiveIds.size !== expectedActiveIds.size) {
      return {
        ok: false,
        error:
          "O salvamento não refletiu todas as alterações (itens ativos divergem do que foi enviado). Nada foi confirmado como concluído — tente novamente.",
      };
    }
    for (const id of expectedActiveIds) {
      if (!actualActiveIds.has(id)) {
        return {
          ok: false,
          error:
            "O salvamento não refletiu todas as alterações. Tente novamente.",
        };
      }
    }
  } else if (expectedActiveIds.size > 0) {
    return {
      ok: false,
      error: "O salvamento não refletiu as seções enviadas. Tente novamente.",
    };
  }

  if (options.bumpVersionIfUsed) {
    const { count, error: usedErr } = await supabase
      .from("checklist_fill_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_template_id", templateId);

    if (usedErr) {
      return {
        ok: false,
        error:
          "Alterações salvas, mas não foi possível atualizar a versão do modelo. Recarregue e confira os itens.",
      };
    }

    if (count && count > 0) {
      const { data: template, error: tplErr } = await supabase
        .from("checklist_workspace_templates")
        .select("version")
        .eq("id", templateId)
        .maybeSingle();
      if (tplErr) {
        return {
          ok: false,
          error:
            "Alterações salvas, mas não foi possível atualizar a versão do modelo. Recarregue e confira os itens.",
        };
      }

      const { data: versionRows, error: versionErr } = await supabase
        .from("checklist_workspace_templates")
        .update({ version: Number(template?.version ?? 1) + 1 })
        .eq("id", templateId)
        .select("id");
      if (versionErr || !versionRows || versionRows.length === 0) {
        return {
          ok: false,
          error:
            "Alterações salvas, mas não foi possível atualizar a versão do modelo. Recarregue e confira os itens.",
        };
      }
    }
  }

  return { ok: true, sections: persistedSections };
}
