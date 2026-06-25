import {
  categoryFromType,
  establishmentCategoryLabel,
  ESTABLISHMENT_CATEGORIES,
} from "@/lib/constants/establishment-types";
import type { EstablishmentCategory, EstablishmentType } from "@/lib/types/establishments";
import type { EnabledModules } from "@/lib/types/modules";

export function isEstablishmentCategoryEnabled(
  category: EstablishmentCategory,
  modules: EnabledModules,
): boolean {
  return modules[category] === true;
}

export function establishmentCategorySelectLabel(
  category: EstablishmentCategory,
  modules: EnabledModules,
): string {
  const base = establishmentCategoryLabel[category];
  if (isEstablishmentCategoryEnabled(category, modules)) return base;
  return `${base} — Não habilitado`;
}

export function isEstablishmentTypeAllowedForModules(
  type: EstablishmentType,
  modules: EnabledModules,
): boolean {
  return isEstablishmentCategoryEnabled(categoryFromType(type), modules);
}

export function firstEnabledEstablishmentCategory(
  modules: EnabledModules,
): EstablishmentCategory | null {
  for (const category of ESTABLISHMENT_CATEGORIES) {
    if (isEstablishmentCategoryEnabled(category, modules)) return category;
  }
  return null;
}

export function establishmentCategoryDisabledMessage(
  category: EstablishmentCategory,
): string {
  return `A categoria ${establishmentCategoryLabel[category]} não está habilitada na sua conta.`;
}

export function establishmentTypeDisabledMessage(
  type: EstablishmentType,
): string {
  return establishmentCategoryDisabledMessage(categoryFromType(type));
}
