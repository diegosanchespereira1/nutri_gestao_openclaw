import { loadChecklistCatalog } from "@/lib/actions/checklists";
import { listCustomTemplatesForOwner } from "@/lib/actions/checklist-custom";
import { loadWorkspaceTemplatesForCatalogLight } from "@/lib/actions/checklist-workspace";
import {
  loadEstablishmentPickerOptionById,
  loadRecentChecklistEstablishmentsAction,
} from "@/lib/actions/establishments";
import { getServerContext } from "@/lib/supabase/get-server-user";
import type { CustomTemplateListRow } from "@/lib/actions/checklist-custom";
import type { WorkspaceTemplateListRow } from "@/lib/actions/checklist-workspace";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { EstablishmentPickerOption } from "@/lib/types/establishments";

export type ChecklistPageCatalogData = {
  templates: ChecklistTemplateWithSections[];
  workspaceTemplates: WorkspaceTemplateListRow[];
  customTemplates: CustomTemplateListRow[];
  recentEstablishments: EstablishmentPickerOption[];
};

/** Dados iniciais da página /checklists — para Server Components (sem roundtrip extra no cliente). */
export async function loadChecklistPageData(input?: {
  initialEstablishmentId?: string | null;
}): Promise<ChecklistPageCatalogData> {
  const empty: ChecklistPageCatalogData = {
    templates: [],
    workspaceTemplates: [],
    customTemplates: [],
    recentEstablishments: [],
  };

  const { user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return empty;

  const initialEstablishmentId = input?.initialEstablishmentId ?? null;

  const [{ templates }, { rows: workspaceTemplateRows }, { rows: customTemplateRows }, { rows: recentRaw }, preselected] =
    await Promise.all([
      loadChecklistCatalog(),
      loadWorkspaceTemplatesForCatalogLight(),
      listCustomTemplatesForOwner(),
      loadRecentChecklistEstablishmentsAction(3),
      initialEstablishmentId
        ? loadEstablishmentPickerOptionById(initialEstablishmentId)
        : Promise.resolve(null),
    ]);

  const workspaceTemplates = workspaceTemplateRows.filter((row) => !row.is_draft);
  const customTemplates = customTemplateRows;
  const recentEstablishments = preselected
    ? [preselected, ...recentRaw.filter((r) => r.id !== preselected.id)].slice(0, 3)
    : recentRaw;

  return { templates, workspaceTemplates, customTemplates, recentEstablishments };
}
