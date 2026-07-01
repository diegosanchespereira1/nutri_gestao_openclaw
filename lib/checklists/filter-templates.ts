import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { EstablishmentRow } from "@/lib/types/establishments";

export type EstablishmentChecklistFilter = Pick<
  EstablishmentRow,
  "state" | "establishment_type"
>;

/**
 * Filtra o catálogo global por UF do estabelecimento (quando informada).
 * O tipo de estabelecimento não restringe quais templates podem ser aplicados.
 */
export function filterTemplatesForEstablishment(
  templates: ChecklistTemplateWithSections[],
  establishment: EstablishmentChecklistFilter | null,
): ChecklistTemplateWithSections[] {
  if (!establishment) return templates;
  const state = establishment.state?.toUpperCase() ?? null;
  return templates.filter((t) => {
    const ufOk = t.uf === "*" || (state !== null && t.uf === state);
    return ufOk;
  });
}
