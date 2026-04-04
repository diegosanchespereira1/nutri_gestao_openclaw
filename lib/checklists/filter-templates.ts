import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { EstablishmentRow } from "@/lib/types/establishments";

export type EstablishmentChecklistFilter = Pick<
  EstablishmentRow,
  "state" | "establishment_type"
>;

export function filterTemplatesForEstablishment(
  templates: ChecklistTemplateWithSections[],
  establishment: EstablishmentChecklistFilter | null,
): ChecklistTemplateWithSections[] {
  if (!establishment) return templates;
  const state = establishment.state?.toUpperCase() ?? null;
  const type = establishment.establishment_type;
  return templates.filter((t) => {
    const ufOk = t.uf === "*" || (state !== null && t.uf === state);
    const typeOk = t.applies_to.includes(type);
    return ufOk && typeOk;
  });
}
