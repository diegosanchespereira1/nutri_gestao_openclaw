import {
  categoryFromType,
  establishmentCategoryLabel,
  ESTABLISHMENT_CATEGORIES,
  isBuiltinEstablishmentType,
} from "@/lib/constants/establishment-types";
import type { EstablishmentCategory } from "@/lib/types/establishments";
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
  type: string,
  modules: EnabledModules,
  customCategory?: EstablishmentCategory | null,
): boolean {
  const category =
    customCategory ??
    (isBuiltinEstablishmentType(type) ? categoryFromType(type) : null);
  if (!category) return false;
  return isEstablishmentCategoryEnabled(category, modules);
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
  type: string,
  customCategory?: EstablishmentCategory | null,
): string {
  const category =
    customCategory ??
    (isBuiltinEstablishmentType(type) ? categoryFromType(type) : null);
  if (!category) {
    return "Tipo de estabelecimento inválido ou não habilitado na sua conta.";
  }
  return establishmentCategoryDisabledMessage(category);
}
