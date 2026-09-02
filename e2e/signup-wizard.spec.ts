import { expect, test } from "@playwright/test";

test.describe("Wizard Cadastre-se", () => {
  test("mostra etapas e valida dados antes de avançar", async ({ page }) => {
    await page.goto("/login?aba=cadastro");

    await expect(
      page.getByRole("button", { name: "Cadastre-se", pressed: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Etapas do cadastro")).toBeVisible();
    await expect(
      page.getByLabel("Etapas do cadastro").getByText("Dados para cadastro"),
    ).toBeVisible();
    await expect(
      page.getByLabel("Etapas do cadastro").getByText("Plano"),
    ).toBeVisible();
    await expect(
      page.getByLabel("Etapas do cadastro").getByText("Pagamento"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Avançar para Plano" }).click();
    await expect(page.getByText("Informe o e-mail.")).toBeVisible();

    await page.getByLabel("Nome").fill("Maria Silva");
    await page.getByLabel("Email").fill("maria@example.com");
    await page.getByLabel("Telefone").fill("11988887777");
    await page.getByLabel("CPF").fill("52998224725");
    await page.getByLabel("Senha", { exact: true }).fill("SenhaForte!123");
    await page.getByLabel("Confirmar senha").fill("SenhaForte!123");
    await page.getByRole("button", { name: "Avançar para Plano" }).click();

    await expect(page.getByRole("button", { name: /Gratuito/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel("Ciclo de cobrança")).toBeVisible();
    await expect(
      page.getByLabel("Ciclo de cobrança").getByRole("button", { name: "Mensal" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Ciclo de cobrança").getByRole("button", { name: "Anual" }),
    ).toBeVisible();

    await page.getByLabel("Ciclo de cobrança").getByRole("button", { name: "Anual" }).click();
    await expect(page.getByText(/cobrados por ano/).first()).toBeVisible();
    await page.getByLabel("Ciclo de cobrança").getByRole("button", { name: "Mensal" }).click();
    await expect(page.getByText(/\/mês/).first()).toBeVisible();
  });

  test("/register abre a aba de cadastro", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/login\?aba=cadastro/);
    await expect(
      page.getByRole("button", { name: "Cadastre-se", pressed: true }),
    ).toBeVisible();
  });
});
