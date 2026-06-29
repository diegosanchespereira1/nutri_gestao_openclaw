import type {
  WorkspaceEditItem,
  WorkspaceEditSection,
  WorkspaceTemplateInput,
} from "@/lib/actions/checklist-workspace";
import { normalizeChecklistText } from "@/lib/checklists/capitalize-checklist-text";

export const WORKSPACE_TEMPLATE_DRAFT_DEFAULT_NAME = "(Rascunho)";

export function normalizeDraftTemplateName(name: string | undefined): string {
  const trimmed = (name ?? "").trim();
  if (trimmed.length === 0) return WORKSPACE_TEMPLATE_DRAFT_DEFAULT_NAME;
  return trimmed.slice(0, 200);
}

export function normalizeDraftTemplateInput(
  input: WorkspaceTemplateInput,
): { name: string; sections: WorkspaceEditSection[] } {
  const sectionsIn = input.sections ?? [];
  const sections: WorkspaceEditSection[] =
    sectionsIn.length > 0
      ? sectionsIn.map((sec, secIdx) => {
          const itemsIn = sec.items ?? [];
          const items: WorkspaceEditItem[] =
            itemsIn.length > 0
              ? itemsIn.map((it) => {
                  const description = (it.description ?? "").trim();
                  return {
                    id: it.id,
                    description:
                      description.length > 0
                        ? normalizeChecklistText(description)
                        : description,
                    is_required: Boolean(it.is_required),
                  };
                })
              : [{ description: "", is_required: false }];
          return {
            id: sec.id,
            title:
              normalizeChecklistText(sec.title ?? "") ||
              `Seção ${secIdx + 1}`,
            items,
          };
        })
      : [
          {
            title: "Geral",
            items: [{ description: "", is_required: false }],
          },
        ];

  return {
    name: normalizeDraftTemplateName(input.name),
    sections,
  };
}
