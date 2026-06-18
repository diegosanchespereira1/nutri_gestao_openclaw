import { test } from "@playwright/test";

import { runChecklistDossieFlow } from "./helpers/checklist-dossie";

/**
 * Fluxo funcional completo de checklist para o cliente Hospital TESTE:
 *   login → selecionar estabelecimento → template do sistema →
 *   marcar todos os itens como Conforme → finalizar → assinar →
 *   aprovar dossiê → gerar PDF.
 *
 * Screenshots e PDF ficam em test-results/checklist-hospital-teste-steps/.
 *
 * Pré-requisitos (conta indicada em E2E_EMAIL):
 *   - Onboarding concluído e sem MFA.
 *   - Cliente "Hospital TESTE" com pelo menos um estabelecimento cadastrado.
 *   - Pelo menos um template de checklist do sistema aplicável.
 *
 * Sem E2E_EMAIL / E2E_PASSWORD o teste é ignorado (skip).
 * Cada execução cria uma sessão nova ("Iniciar novo") — pode re-executar à vontade.
 */

const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
const CLIENT_NAME = "Hospital TESTE";
const SCREENSHOT_DIR = "checklist-hospital-teste-steps";

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD para executar os testes autenticados.",
);

test.describe("Checklist do sistema — Hospital TESTE", () => {
  test("preenche checklist como Conforme, aprova e gera PDF", async ({
    page,
  }) => {
    test.setTimeout(360_000);

    await runChecklistDossieFlow(page, {
      clientName: CLIENT_NAME,
      screenshotDir: SCREENSHOT_DIR,
      signerName: "Responsável Hospital TESTE E2E",
    });
  });
});
