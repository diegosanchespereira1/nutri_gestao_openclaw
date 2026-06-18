import fs from "node:fs";
import path from "node:path";

import { test, type Page } from "@playwright/test";

let shotIndex = 0;

/**
 * Reinicia o contador de screenshots (chamar no início de cada teste).
 */
export function resetShotIndex(): void {
  shotIndex = 0;
}

/**
 * Tira screenshot numerada, grava em disco e anexa ao report HTML do Playwright.
 *
 * @param page  Página Playwright.
 * @param dir   Subdiretório dentro de `test-results/`. Ex.: `receita-nova-steps`
 * @param name  Nome descritivo (sem espaços). Ex.: `formulario-preenchido`
 * @returns Caminho relativo ao projeto. Ex.: `test-results/receita-nova-steps/01-formulario-vazio.png`
 */
export async function shot(
  page: Page,
  dir: string,
  name: string,
): Promise<string> {
  shotIndex += 1;
  const fileName = `${String(shotIndex).padStart(2, "0")}-${name}.png`;
  const dirPath = path.join("test-results", dir);
  fs.mkdirSync(dirPath, { recursive: true });

  const filePath = path.join(dirPath, fileName);
  await page.screenshot({ path: filePath, fullPage: true });

  await test.info().attach(`[${dir}] ${fileName}`, {
    path: filePath,
    contentType: "image/png",
  });

  return filePath;
}
