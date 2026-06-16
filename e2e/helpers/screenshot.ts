import type { Page } from "@playwright/test";

let shotIndex = 0;

/**
 * Reinicia o contador de screenshots (chamar no início de cada teste).
 */
export function resetShotIndex(): void {
  shotIndex = 0;
}

/**
 * Tira screenshot numerada e salva no diretório especificado.
 *
 * @param page  Página Playwright.
 * @param dir   Subdiretório dentro de test-results/. Ex.: "avaliacao-infantil"
 * @param name  Nome descritivo (sem espaços). Ex.: "formulario-preenchido"
 */
export async function shot(page: Page, dir: string, name: string): Promise<void> {
  shotIndex += 1;
  await page.screenshot({
    path: `test-results/${dir}/${String(shotIndex).padStart(2, "0")}-${name}.png`,
    fullPage: true,
  });
}
