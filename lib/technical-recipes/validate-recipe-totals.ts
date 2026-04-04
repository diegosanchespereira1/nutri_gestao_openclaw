import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";

export type RecipeTotalsValidation =
  | {
      kind: "mass";
      totalGrams: number;
      label: string;
    }
  | {
      kind: "volume";
      totalMl: number;
      label: string;
    }
  | {
      kind: "mixed";
      label: string;
    }
  | {
      kind: "empty";
      label: string;
    };

const MASS: RecipeLineUnit[] = ["g", "kg"];
const VOLUME: RecipeLineUnit[] = ["ml", "l"];

/** Soma homogénea em massa (g) ou volume (ml); caso contrário indica mistura ou vazio. */
export function validateRecipeTotals(
  lines: { quantity: number; unit: RecipeLineUnit }[],
): RecipeTotalsValidation {
  if (lines.length === 0) {
    return {
      kind: "empty",
      label: "Adicione pelo menos uma linha para validar totais.",
    };
  }

  const units = new Set(lines.map((l) => l.unit));
  const allMass = [...units].every((u) => MASS.includes(u));
  const allVolume = [...units].every((u) => VOLUME.includes(u));

  if (allMass) {
    let totalGrams = 0;
    for (const l of lines) {
      if (l.unit === "g") totalGrams += l.quantity;
      else if (l.unit === "kg") totalGrams += l.quantity * 1000;
    }
    const rounded =
      Math.round(totalGrams * 100) % 100 === 0
        ? totalGrams.toFixed(0)
        : totalGrams.toFixed(2);
    return {
      kind: "mass",
      totalGrams,
      label: `Peso total (ingredientes em massa): ${rounded} g`,
    };
  }

  if (allVolume) {
    let totalMl = 0;
    for (const l of lines) {
      if (l.unit === "ml") totalMl += l.quantity;
      else if (l.unit === "l") totalMl += l.quantity * 1000;
    }
    const rounded =
      Math.round(totalMl * 100) % 100 === 0
        ? totalMl.toFixed(0)
        : totalMl.toFixed(2);
    return {
      kind: "volume",
      totalMl,
      label: `Volume total (ingredientes em volume): ${rounded} ml`,
    };
  }

  return {
    kind: "mixed",
    label:
      "Unidades mistas (massa, volume e/ou unidades) — não é possível somar num único total. Use apenas massa ou apenas volume para ver o total.",
  };
}
