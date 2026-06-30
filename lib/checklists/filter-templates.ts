import { ASSESSORIA_TYPES } from "@/lib/constants/establishment-types";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { EstablishmentRow } from "@/lib/types/establishments";
import type { EstablishmentType } from "@/lib/types/establishments";

export type EstablishmentChecklistFilter = Pick<
  EstablishmentRow,
  "state" | "establishment_type"
>;

/** Tipos ASA (exceto empresa) herdam checklists do sistema marcados para empresa. */
const ASA_TYPES_INHERITING_EMPRESA_TEMPLATES: readonly EstablishmentType[] =
  ASSESSORIA_TYPES.filter((t) => t !== "empresa");

function templateAppliesToEstablishmentType(
  appliesTo: readonly string[],
  establishmentType: EstablishmentType,
): boolean {
  if (appliesTo.includes(establishmentType)) return true;
  if (
    (ASA_TYPES_INHERITING_EMPRESA_TEMPLATES as readonly string[]).includes(
      establishmentType,
    ) &&
    appliesTo.includes("empresa")
  ) {
    return true;
  }
  return false;
}

export function filterTemplatesForEstablishment(
  templates: ChecklistTemplateWithSections[],
  establishment: EstablishmentChecklistFilter | null,
): ChecklistTemplateWithSections[] {
  if (!establishment) return templates;
  const state = establishment.state?.toUpperCase() ?? null;
  const type = establishment.establishment_type;
  return templates.filter((t) => {
    const ufOk = t.uf === "*" || (state !== null && t.uf === state);
    const typeOk = templateAppliesToEstablishmentType(t.applies_to, type);
    return ufOk && typeOk;
  });
}
