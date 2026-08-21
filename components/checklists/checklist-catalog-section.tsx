import { ChecklistCatalog } from "@/components/checklists/checklist-catalog";
import { duplicateGlobalTemplateAction } from "@/lib/actions/checklist-custom";
import { startChecklistFill } from "@/lib/actions/checklist-fill";
import { loadChecklistPageData } from "@/lib/checklists/load-page-data";

type Props = {
  focusTemplateId: string | null;
  focusWorkspaceTemplateId: string | null;
  focusCustomTemplateId: string | null;
  initialEstablishmentId: string | null;
};

export async function ChecklistCatalogSection({
  focusTemplateId,
  focusWorkspaceTemplateId,
  focusCustomTemplateId,
  initialEstablishmentId,
}: Props) {
  const { templates, workspaceTemplates, customTemplates, recentEstablishments } =
    await loadChecklistPageData({ initialEstablishmentId });

  return (
    <ChecklistCatalog
      key={
        initialEstablishmentId ??
        focusTemplateId ??
        focusWorkspaceTemplateId ??
        focusCustomTemplateId ??
        "checklist-catalog-default"
      }
      recentEstablishments={recentEstablishments}
      templates={templates}
      workspaceTemplates={workspaceTemplates}
      customTemplates={customTemplates}
      startFillAction={startChecklistFill}
      duplicateTemplateAction={duplicateGlobalTemplateAction}
      focusTemplateId={focusTemplateId}
      focusWorkspaceTemplateId={focusWorkspaceTemplateId}
      focusCustomTemplateId={focusCustomTemplateId}
      initialEstablishmentId={initialEstablishmentId}
    />
  );
}
