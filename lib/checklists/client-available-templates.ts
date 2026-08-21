import type { CustomTemplateListRow } from "@/lib/actions/checklist-custom";
import type { WorkspaceTemplateListRow } from "@/lib/actions/checklist-workspace";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

export type ClientAvailableChecklistSource = "workspace" | "custom" | "system";

export type ClientAvailableChecklist = {
  id: string;
  name: string;
  source: ClientAvailableChecklistSource;
  sourceLabel: "Equipe" | "Personalizado" | "Sistema";
  scopeLabel: string;
  exclusiveToClient: boolean;
  itemCount: number | null;
  requiredItemCount: number | null;
};

const SOURCE_LABEL: Record<
  ClientAvailableChecklistSource,
  ClientAvailableChecklist["sourceLabel"]
> = {
  workspace: "Equipe",
  custom: "Personalizado",
  system: "Sistema",
};

export function clientAvailableChecklistRank(
  item: Pick<ClientAvailableChecklist, "source" | "exclusiveToClient">,
): number {
  if (item.source === "workspace" && item.exclusiveToClient) return 0;
  if (item.source === "workspace") return 1;
  if (item.source === "custom") return 2;
  return 3;
}

export function sortClientAvailableChecklists(
  items: ClientAvailableChecklist[],
): ClientAvailableChecklist[] {
  return [...items].sort((a, b) => {
    const rank = clientAvailableChecklistRank(a) - clientAvailableChecklistRank(b);
    if (rank !== 0) return rank;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function buildApplyChecklistHref(
  establishmentId: string,
  item: Pick<ClientAvailableChecklist, "id" | "source">,
): string {
  const params = new URLSearchParams();
  params.set("est", establishmentId);
  if (item.source === "system") params.set("template", item.id);
  if (item.source === "workspace") params.set("workspace_template", item.id);
  if (item.source === "custom") params.set("custom_template", item.id);
  return `/checklists?${params.toString()}`;
}

export function assembleClientAvailableChecklists(input: {
  workspace: Pick<
    WorkspaceTemplateListRow,
    "id" | "name" | "client_id" | "total_item_count" | "required_item_count"
  >[];
  custom: Pick<CustomTemplateListRow, "id" | "name">[];
  official: Pick<
    ChecklistTemplateWithSections,
    "id" | "name" | "uf" | "total_item_count" | "required_item_count"
  >[];
}): ClientAvailableChecklist[] {
  const workspaceItems: ClientAvailableChecklist[] = input.workspace.map(
    (tpl) => {
      const exclusiveToClient = tpl.client_id != null;
      return {
        id: tpl.id,
        name: tpl.name,
        source: "workspace",
        sourceLabel: SOURCE_LABEL.workspace,
        scopeLabel: exclusiveToClient
          ? "Somente este cliente"
          : "Todos os clientes",
        exclusiveToClient,
        itemCount: tpl.total_item_count,
        requiredItemCount: tpl.required_item_count,
      };
    },
  );

  const customItems: ClientAvailableChecklist[] = input.custom.map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    source: "custom",
    sourceLabel: SOURCE_LABEL.custom,
    scopeLabel: "Só esta unidade",
    exclusiveToClient: false,
    itemCount: null,
    requiredItemCount: null,
  }));

  const officialItems: ClientAvailableChecklist[] = input.official.map(
    (tpl) => ({
      id: tpl.id,
      name: tpl.name,
      source: "system",
      sourceLabel: SOURCE_LABEL.system,
      scopeLabel: tpl.uf === "*" ? "Todas as UFs" : `UF ${tpl.uf}`,
      exclusiveToClient: false,
      itemCount: tpl.total_item_count,
      requiredItemCount: tpl.required_item_count,
    }),
  );

  return sortClientAvailableChecklists([
    ...workspaceItems,
    ...customItems,
    ...officialItems,
  ]);
}
