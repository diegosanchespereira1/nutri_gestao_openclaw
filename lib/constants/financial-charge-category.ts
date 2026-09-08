export type FinancialChargeBuiltInCategory =
  | "mensalidade"
  | "consultoria"
  | "avaliacao_nutricional";

export const FINANCIAL_CHARGE_BUILT_IN_CATEGORIES: readonly FinancialChargeBuiltInCategory[] =
  ["mensalidade", "consultoria", "avaliacao_nutricional"] as const;

export const financialChargeBuiltInCategoryLabel: Record<
  FinancialChargeBuiltInCategory,
  string
> = {
  mensalidade: "Mensalidade",
  consultoria: "Consultoria",
  avaliacao_nutricional: "Avaliação Nutricional",
};

export function isFinancialChargeBuiltInCategory(
  value: string,
): value is FinancialChargeBuiltInCategory {
  return (FINANCIAL_CHARGE_BUILT_IN_CATEGORIES as readonly string[]).includes(
    value,
  );
}

function normalizeCategoryKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

const builtInReservedKeys = new Set([
  ...FINANCIAL_CHARGE_BUILT_IN_CATEGORIES,
  ...Object.values(financialChargeBuiltInCategoryLabel).map(normalizeCategoryKey),
]);

/** Impede criar personalizada com o mesmo nome de uma categoria padrão. */
export function isReservedChargeCategoryLabel(label: string): boolean {
  return builtInReservedKeys.has(normalizeCategoryKey(label));
}

export function chargeCategoryDisplayLabel(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  if (isFinancialChargeBuiltInCategory(value)) {
    return financialChargeBuiltInCategoryLabel[value];
  }
  return value;
}

export function isAllowedChargeCategory(
  value: string,
  customLabels: readonly string[],
): boolean {
  if (isFinancialChargeBuiltInCategory(value)) return true;
  const key = normalizeCategoryKey(value);
  return customLabels.some((label) => normalizeCategoryKey(label) === key);
}
