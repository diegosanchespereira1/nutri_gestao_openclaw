import { test } from "@playwright/test";

import { runNewRecipeFormFlow } from "./helpers/recipe-form";

/**
 * Fluxo funcional de criação de receita (ficha técnica):
 *   login → /ficha-tecnica/nova → preencher campos com dados aleatórios →
 *   validar painéis → Salvar receita → Exportar PDF → validar conteúdo no PDF.
 *
 * Screenshots ficam em test-results/receita-nova-steps/ (pasta gitignored).
 * O PDF exportado é anexado ao report como ficha-tecnica-exportada.pdf.
 *
 * Sem E2E_EMAIL / E2E_PASSWORD o teste é ignorado (skip).
 */

const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
const SCREENSHOT_DIR = "receita-nova-steps";

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD para executar os testes autenticados.",
);

test.describe("Ficha técnica — nova receita", () => {
  test("preenche formulário, salva e exporta PDF", async ({ page }) => {
    test.setTimeout(240_000);

    await runNewRecipeFormFlow(page, {
      screenshotDir: SCREENSHOT_DIR,
    });
  });
});
