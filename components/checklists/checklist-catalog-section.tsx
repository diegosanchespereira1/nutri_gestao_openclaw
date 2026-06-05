import { ChecklistCatalog } from "@/components/checklists/checklist-catalog";
import { duplicateGlobalTemplateAction } from "@/lib/actions/checklist-custom";
import { startChecklistFill } from "@/lib/actions/checklist-fill";
import { loadChecklistCatalog } from "@/lib/actions/checklists";
import { loadWorkspaceTemplatesForCatalog } from "@/lib/actions/checklist-workspace";
import {
  loadEstablishmentPickerOptionById,
  loadRecentChecklistEstablishmentsAction,
} from "@/lib/actions/establishments";

type Props = {
  focusTemplateId: string | null;
  focusWorkspaceTemplateId: string | null;
  initialEstablishmentId: string | null;
};

export async function ChecklistCatalogSection({
  focusTemplateId,
  focusWorkspaceTemplateId,
  initialEstablishmentId,
}: Props) {
  const [{ templates }, { rows: workspaceTemplates }, { rows: recentRaw }, preselected] =
    await Promise.all([
      loadChecklistCatalog(),
      loadWorkspaceTemplatesForCatalog(),
      loadRecentChecklistEstablishmentsAction(3),
      initialEstablishmentId
        ? loadEstablishmentPickerOptionById(initialEstablishmentId)
        : Promise.resolve(null),
    ]);

  const recentEstablishments = preselected
    ? [preselected, ...recentRaw.filter((r) => r.id !== preselected.id)].slice(0, 3)
    : recentRaw;

  return (
    <ChecklistCatalog
      key={
        initialEstablishmentId ??
        focusTemplateId ??
        focusWorkspaceTemplateId ??
        "checklist-catalog-default"
      }
      recentEstablishments={recentEstablishments}
      templates={templates}
      workspaceTemplates={workspaceTemplates}
      startFillAction={startChecklistFill}
      duplicateTemplateAction={duplicateGlobalTemplateAction}
      focusTemplateId={focusTemplateId}
      focusWorkspaceTemplateId={focusWorkspaceTemplateId}
      initialEstablishmentId={initialEstablishmentId}
    />
  );
}
