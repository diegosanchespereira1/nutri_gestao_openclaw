import {
  assembleClientAvailableChecklists,
  type ClientAvailableChecklist,
} from "@/lib/checklists/client-available-templates";
import type { CustomTemplateListRow } from "@/lib/actions/checklist-custom";
import type { WorkspaceTemplateListRow } from "@/lib/actions/checklist-workspace";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { EstablishmentType } from "@/lib/types/establishments";

export type VisitChecklistOption = ClientAvailableChecklist & {
  uf: string | null;
  appliesTo: EstablishmentType[];
  searchText: string;
};

export type VisitTemplateSourceFilter = "all" | "system" | "workspace" | "custom";

export type VisitChecklistFilters = {
  source: VisitTemplateSourceFilter;
  search: string;
  types: EstablishmentType[];
  ufs: string[];
};

export const EMPTY_VISIT_CHECKLIST_FILTERS: VisitChecklistFilters = {
  source: "all",
  search: "",
  types: [],
  ufs: [],
};

export type VisitChecklistChoice =
  | { kind: "global"; id: string }
  | { kind: "custom"; id: string }
  | { kind: "workspace"; id: string };

const UUID_RE = "[0-9a-f-]{36}";

export function visitChecklistChoiceValue(option: VisitChecklistOption): string {
  if (option.source === "workspace") return `workspace:${option.id}`;
  if (option.source === "custom") return `custom:${option.id}`;
  return `global:${option.id}`;
}

export function parseVisitChecklistChoice(
  raw: string,
): VisitChecklistChoice | null {
  const s = raw.trim();
  const workspace = s.match(new RegExp(`^workspace:(${UUID_RE})$`, "i"));
  if (workspace?.[1]) return { kind: "workspace", id: workspace[1] };
  const custom = s.match(new RegExp(`^custom:(${UUID_RE})$`, "i"));
  if (custom?.[1]) return { kind: "custom", id: custom[1] };
  const global = s.match(new RegExp(`^global:(${UUID_RE})$`, "i"));
  if (global?.[1]) return { kind: "global", id: global[1] };
  return null;
}

function joinSearchText(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join(" ");
}

export function assembleVisitChecklistOptions(input: {
  workspace: Pick<
    WorkspaceTemplateListRow,
    | "id"
    | "name"
    | "client_id"
    | "client_label"
    | "created_by_name"
    | "total_item_count"
    | "required_item_count"
  >[];
  custom: Pick<
    CustomTemplateListRow,
    "id" | "name" | "establishment_label" | "created_by_name"
  >[];
  official: Pick<
    ChecklistTemplateWithSections,
    | "id"
    | "name"
    | "uf"
    | "portaria_ref"
    | "description"
    | "applies_to"
    | "total_item_count"
    | "required_item_count"
  >[];
}): VisitChecklistOption[] {
  const items = assembleClientAvailableChecklists(input);
  const workspaceMeta = new Map(input.workspace.map((row) => [row.id, row]));
  const customMeta = new Map(input.custom.map((row) => [row.id, row]));
  const officialMeta = new Map(input.official.map((row) => [row.id, row]));

  return items.map((item) => {
    if (item.source === "workspace") {
      const row = workspaceMeta.get(item.id);
      return {
        ...item,
        uf: null,
        appliesTo: [],
        searchText: joinSearchText(
          item.name,
          row?.created_by_name,
          row?.client_label,
        ),
      };
    }

    if (item.source === "custom") {
      const row = customMeta.get(item.id);
      const label = row?.establishment_label?.trim() ?? "";
      return {
        ...item,
        scopeLabel: label || item.scopeLabel,
        uf: null,
        appliesTo: [],
        searchText: joinSearchText(item.name, label, row?.created_by_name),
      };
    }

    const row = officialMeta.get(item.id);
    return {
      ...item,
      uf: row?.uf ?? "*",
      appliesTo: row?.applies_to ?? [],
      searchText: joinSearchText(
        item.name,
        row?.portaria_ref,
        row?.description,
        item.scopeLabel,
      ),
    };
  });
}

export function filterVisitChecklistOptions(
  options: VisitChecklistOption[],
  filters: VisitChecklistFilters,
): VisitChecklistOption[] {
  const query = filters.search.trim().toLowerCase();

  return options.filter((option) => {
    if (filters.source !== "all" && option.source !== filters.source) {
      return false;
    }

    if (query) {
      const haystack = `${option.name} ${option.scopeLabel} ${option.searchText}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (option.source !== "system") return true;

    if (
      filters.types.length > 0 &&
      !filters.types.some((type) => option.appliesTo.includes(type))
    ) {
      return false;
    }

    if (
      filters.ufs.length > 0 &&
      option.uf &&
      option.uf !== "*" &&
      !filters.ufs.includes(option.uf)
    ) {
      return false;
    }

    return true;
  });
}

export function visitChecklistUfOptions(options: VisitChecklistOption[]): string[] {
  const ufs = new Set<string>();
  for (const option of options) {
    if (option.source === "system" && option.uf && option.uf !== "*") {
      ufs.add(option.uf);
    }
  }
  return Array.from(ufs).sort();
}

export function groupVisitChecklistOptions(options: VisitChecklistOption[]): {
  workspace: VisitChecklistOption[];
  custom: VisitChecklistOption[];
  system: VisitChecklistOption[];
} {
  return {
    workspace: options.filter((o) => o.source === "workspace"),
    custom: options.filter((o) => o.source === "custom"),
    system: options.filter((o) => o.source === "system"),
  };
}

export type VisitAreaSelectionError = "area_required" | "area_invalid";

/**
 * Mesma regra do catálogo: com áreas cadastradas, ao menos uma é obrigatória;
 * IDs devem pertencer ao estabelecimento.
 */
export function resolveVisitSelectedAreaIds(input: {
  availableAreaIds: readonly string[];
  selectedAreaIds: readonly string[];
}):
  | { ok: true; areaIds: string[] }
  | { ok: false; error: VisitAreaSelectionError } {
  const available = new Set(input.availableAreaIds);
  if (available.size > 0 && input.selectedAreaIds.length === 0) {
    return { ok: false, error: "area_required" };
  }

  const unique: string[] = [];
  for (const id of input.selectedAreaIds) {
    if (!available.has(id)) return { ok: false, error: "area_invalid" };
    if (!unique.includes(id)) unique.push(id);
  }

  return { ok: true, areaIds: unique };
}

/** Uma sessão por área; sem áreas cadastradas, uma sessão sem `area_id`. */
export function visitFillSessionAreaSlots(
  areaIds: readonly string[],
): (string | null)[] {
  return areaIds.length > 0 ? [...areaIds] : [null];
}
