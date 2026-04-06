/**
 * Regra de três para escalonar quantidades quando muda o rendimento em porções (Story 6.6).
 * factor = targetPortions / currentPortions; cada quantidade multiplica por factor.
 */

const MAX_DECIMALS = 4;
const MAX_QTY = 999_999.9999;

export type ScaleYieldResult =
  | { ok: true; factor: number; quantities: string[] }
  | { ok: false; reason: "invalid_current" | "invalid_target" | "no_lines" };

function roundQuantity(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return n;
  const m = 10 ** MAX_DECIMALS;
  return Math.min(MAX_QTY, Math.round(n * m) / m);
}

export function scaleIngredientQuantitiesForPortionYield(input: {
  currentPortions: number;
  targetPortions: number;
  lineQuantities: string[];
}): ScaleYieldResult {
  const { currentPortions, targetPortions, lineQuantities } = input;

  if (
    !Number.isFinite(currentPortions) ||
    currentPortions < 1 ||
    currentPortions > 999_999
  ) {
    return { ok: false, reason: "invalid_current" };
  }

  if (
    !Number.isFinite(targetPortions) ||
    targetPortions < 1 ||
    targetPortions > 999_999
  ) {
    return { ok: false, reason: "invalid_target" };
  }

  if (lineQuantities.length === 0) {
    return { ok: false, reason: "no_lines" };
  }

  const factor = targetPortions / currentPortions;
  if (!Number.isFinite(factor) || factor <= 0) {
    return { ok: false, reason: "invalid_target" };
  }

  const quantities: string[] = [];
  for (const raw of lineQuantities) {
    const q = parseFloat(String(raw).replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) {
      quantities.push(raw);
      continue;
    }
    const scaled = roundQuantity(q * factor);
    quantities.push(String(scaled));
  }

  return { ok: true, factor, quantities };
}
