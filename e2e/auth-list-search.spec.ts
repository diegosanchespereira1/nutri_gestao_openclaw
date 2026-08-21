import { expect, test, type Page } from "@playwright/test";

import { login } from "./helpers/auth";

/**
 * Busca em listas: Enter não pode disparar o overlay global (logo NutriGestão).
 * O chrome da página permanece e só a zona de resultados pode ir a skeleton.
 *
 * Sem E2E_EMAIL / E2E_PASSWORD o teste é ignorado (skip).
 */

const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD para executar os testes autenticados.",
);

function systemLoading(page: Page) {
  return page.getByRole("status", { name: "Carregando", exact: true });
}

test.describe("Busca em listas sem loading global", () => {
  test("checklists: Enter na busca de templates mantém o título e não mostra o logo", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/checklists", { waitUntil: "domcontentloaded" });

    const heading = page.getByRole("heading", { name: "Checklists" });
    await expect(heading).toBeVisible();

    const search = page.getByRole("searchbox", {
      name: "Buscar template de checklist",
    });
    await expect(search).toBeVisible();
    await search.fill("rdc");
    await search.press("Enter");

    await expect(heading).toBeVisible();
    await expect(search).toBeFocused();
    await expect(systemLoading(page)).toHaveCount(0);
  });

  test("clientes: Enter na busca não substitui o cabeçalho pelo overlay", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/clientes", { waitUntil: "domcontentloaded" });

    const heading = page.getByRole("heading", { name: "Clientes" });
    await expect(heading).toBeVisible();

    const search = page.getByPlaceholder("Pesquisar por nome, CNPJ…");
    await search.fill("escola");
    await search.press("Enter");

    await expect(heading).toBeVisible();
    await expect(systemLoading(page)).toHaveCount(0);
  });
});
