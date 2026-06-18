import { expect, test } from "@playwright/test";

import { login, gotoNovaAvaliacao, discoverPatientIdsByCategoryInBeforeAll } from "./helpers/auth";
import { shot, resetShotIndex } from "./helpers/screenshot";
import { waitForLocator } from "./helpers/retry";

/**
 * Testes funcionais E2E — Visibilidade de abas de avaliação por categoria etária.
 *
 * Pré-requisitos:
 *   E2E_EMAIL    — email da conta de teste (em .env.test)
 *   E2E_PASSWORD — senha da conta de teste (em .env.test)
 *
 * Os pacientes são descobertos automaticamente pela lista filtrada por categoria.
 * Cada teste é ignorado individualmente se não houver paciente da categoria.
 */

const E2E_EMAIL    = process.env.E2E_EMAIL    ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
const SCREENSHOT_DIR = "avaliacao-tabs";

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD em .env.test para executar.",
);

const ids: Record<"crianca" | "adulto" | "idoso", string> = {
  crianca: "",
  adulto:  "",
  idoso:   "",
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const discovered = await discoverPatientIdsByCategoryInBeforeAll(browser);
  ids.crianca = discovered.crianca;
  ids.adulto = discovered.adulto;
  ids.idoso = discovered.idoso;
});

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe("Visibilidade de abas de avaliação por categoria etária", () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeEach(resetShotIndex);

  test("01 — paciente criança: só aba Infantil visível", async ({ page }) => {
    test.skip(!ids.crianca, "Nenhum paciente criança encontrado.");

    await login(page);
    await gotoNovaAvaliacao(page, ids.crianca);
    await shot(page, SCREENSHOT_DIR, "crianca-tabs");

    await waitForLocator(page.getByRole("tab", { name: /infantil/i }), {
      label: "aba infantil",
    });
    await expect(page.getByRole("tab", { name: /adulto/i })).not.toBeVisible();
    await expect(page.getByRole("tab", { name: /idoso/i })).not.toBeVisible();
  });

  test("02 — paciente adulto: só aba Adulto visível", async ({ page }) => {
    test.skip(!ids.adulto, "Nenhum paciente adulto encontrado.");

    await login(page);
    await gotoNovaAvaliacao(page, ids.adulto);
    await shot(page, SCREENSHOT_DIR, "adulto-tabs");

    await waitForLocator(page.getByRole("tab", { name: /adulto/i }), {
      label: "aba adulto",
    });
    await expect(page.getByRole("tab", { name: /infantil/i })).not.toBeVisible();
    await expect(page.getByRole("tab", { name: /idoso/i })).not.toBeVisible();
  });

  test("03 — paciente idoso: só aba Idoso visível", async ({ page }) => {
    test.skip(!ids.idoso, "Nenhum paciente idoso encontrado.");

    await login(page);
    await gotoNovaAvaliacao(page, ids.idoso);
    await shot(page, SCREENSHOT_DIR, "idoso-tabs");

    await waitForLocator(page.getByRole("tab", { name: /idoso/i }), {
      label: "aba idoso",
    });
    await expect(page.getByRole("tab", { name: /infantil/i })).not.toBeVisible();
    await expect(page.getByRole("tab", { name: /adulto/i })).not.toBeVisible();
  });

  test("04 — paciente sem data de nascimento: todas as abas visíveis", async ({ page }) => {
    // Busca paciente sem data de nascimento (qualquer um sem birth_date)
    await login(page);
    await page.goto("/pacientes", { waitUntil: "domcontentloaded" });

    const list = page.locator('ul[aria-label="Lista de pacientes"]');
    await waitForLocator(list, { label: "lista de pacientes" });

    const semCategoria = list
      .locator("li a")
      .filter({ hasNot: page.locator(".bg-primary\\/10") })
      .first();

    const isVisible = await semCategoria.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip(true, "Nenhum paciente sem data de nascimento encontrado.");
      return;
    }

    const href = await semCategoria.getAttribute("href");
    const match = href?.match(/\/pacientes\/([0-9a-f-]{36})/);
    if (!match) {
      test.skip(true, "Não foi possível extrair UUID do paciente sem DOB.");
      return;
    }

    await gotoNovaAvaliacao(page, match[1]);
    await shot(page, SCREENSHOT_DIR, "sem-dob-tabs");

    await waitForLocator(page.getByRole("tab", { name: /infantil/i }), {
      label: "aba infantil",
    });
    await waitForLocator(page.getByRole("tab", { name: /adulto/i }), {
      label: "aba adulto",
    });
    await waitForLocator(page.getByRole("tab", { name: /idoso/i }), {
      label: "aba idoso",
    });
  });
});
