import { readFileSync } from "node:fs";
import path from "node:path";

/** Ícone NutriGestão — placeholder quando a receita ainda não tem foto. */
const DEFAULT_RECIPE_IMAGE_PATH = path.join(
  process.cwd(),
  "assets",
  "icon.png",
);

let cachedBuffer: Buffer | undefined;

export function getDefaultTechnicalRecipeImageBuffer(): Buffer {
  if (cachedBuffer === undefined) {
    cachedBuffer = readFileSync(DEFAULT_RECIPE_IMAGE_PATH);
  }
  return cachedBuffer;
}
