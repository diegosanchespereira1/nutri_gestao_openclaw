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

export const WORKSPACE_TEMPLATE_OPEN_DRAFTS_ERROR =
  "Existem rascunhos em aberto usando este modelo. Aprove-os ou exclua-os antes de editar.";

export type PersistWorkspaceTemplateMetadataResult =
  | { ok: true }
  | { ok: false; error: string };

export function mapWorkspaceTemplateUpdateError(error: {
  message?: string;
  code?: string;
}): string {
  const message = error.message ?? "";
  const code = error.code ?? "";

  if (code === "PGRST204" || /schema cache/i.test(message)) {
    return "O vínculo com o cliente ainda não está disponível no banco. Tente novamente em instantes.";
  }
  if (/row-level security/i.test(message) || code === "42501") {
    return "Sem permissão para vincular este cliente a este modelo.";
  }
  if (code === "23503" || /foreign key/i.test(message)) {
    return "Cliente inválido ou removido.";
  }
  if (code === "22P02") {
    return "Cliente inválido.";
  }

  return message.trim().length > 0
    ? `Não foi possível salvar o modelo. ${message}`
    : "Não foi possível salvar o modelo.";
}

function asIdList(rows: Array<{ id: string }> | null | undefined): string[] {
  return (rows ?? []).map((row) => String(row.id));
}

/**
 * Grava nome e/ou vínculo com cliente sem reescrever seções/itens.
 *
 * Não consulta preenchimentos em aberto: alterar a visibilidade do modelo
 * no catálogo não invalida sessões já iniciadas nem o histórico.
 */
export async function persistWorkspaceTemplateMetadata(
  supabase: SupabaseClient,
  templateId: string,
  workspaceOwnerId: string,
  input: {
    name?: string;
    clientId: string | null;
  },
): Promise<PersistWorkspaceTemplateMetadataResult> {
  const patch: { name?: string; client_id: string | null } = {
    client_id: input.clientId,
  };
  if (input.name !== undefined) {
    patch.name = input.name;
  }

  const { data: rows, error } = await supabase
    .from("checklist_workspace_templates")
    .update(patch)
    .eq("id", templateId)
    .eq("owner_user_id", workspaceOwnerId)
    .select("id");

  if (error) {
    console.error("[workspace-template] metadata update failed", {
      templateId,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return { ok: false, error: mapWorkspaceTemplateUpdateError(error) };
  }
  if (!rows || rows.length === 0) {
    return {
      ok: false,
      error:
        "Sem permissão para alterar este modelo, ou ele não foi encontrado.",
    };
  }
  return { ok: true };
}

/**
 * Persiste nome + seções + itens de um modelo da equipe.
 *
 * Vínculo com cliente (`clientId`) deve ir em
 * {@link persistWorkspaceTemplateMetadata}: não reescreve itens e não é
 * bloqueado por rascunhos em aberto, para preservar o histórico.
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
        error: WORKSPACE_TEMPLATE_OPEN_DRAFTS_ERROR,
      };
    }
  }

  const { data: nameRows, error: nameErr } = await supabase
    .from("checklist_workspace_templates")
    .update({ name: input.name })
    .eq("id", templateId)
    .eq("owner_user_id", workspaceOwnerId)
    .select("id");
  if (nameErr) {
    console.error("[workspace-template] name update failed", {
      templateId,
      code: nameErr.code,
      message: nameErr.message,
      details: nameErr.details,
    });
    return { ok: false, error: mapWorkspaceTemplateUpdateError(nameErr) };
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
