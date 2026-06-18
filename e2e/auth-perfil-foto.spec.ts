import { expect, test } from "@playwright/test";

import { login } from "./helpers/auth";

/**
 * Testes funcionais autenticados — login e upload de foto de perfil.
 *
 * Precisam de um utilizador de teste real (Supabase) com onboarding concluído
 * e SEM MFA. Configurar via variáveis de ambiente:
 *   E2E_EMAIL=teste@exemplo.com
 *   E2E_PASSWORD=...
 *
 * Sem estas variáveis, os testes são ignorados (skip) — assim o CI passa
 * mesmo antes de os secrets estarem configurados.
 */

const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD para executar os testes autenticados.",
);

// JPEG válido de 1x1 píxel.
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);

test.describe("Autenticação", () => {
  test("login com credenciais válidas entra na aplicação", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/inicio/);
  });

  test("login com senha errada mostra mensagem de erro", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_EMAIL);
    await page.getByLabel("Senha", { exact: true }).fill("senha-errada-123!");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Perfil — upload de foto", () => {
  test("aceita ficheiro .jpg mesmo com MIME não-padrão image/jpg", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/perfil");

    // Simula o cenário do bug: SO reporta "image/jpg" em vez de "image/jpeg".
    await page.locator("#perfil-photo").setInputFiles({
      name: "foto-teste.jpg",
      mimeType: "image/jpg",
      buffer: TINY_JPEG,
    });
    await page.getByRole("button", { name: "Salvar perfil" }).click();

    // Sucesso: toast de confirmação e nenhum alerta de formato inválido.
    await expect(page.getByText(/atualizad/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("#perfil-err")).toHaveCount(0);
  });

  test("rejeita ficheiro que não é imagem", async ({ page }) => {
    await login(page);
    await page.goto("/perfil");

    await page.locator("#perfil-photo").setInputFiles({
      name: "documento.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 conteudo de teste"),
    });
    await page.getByRole("button", { name: "Salvar perfil" }).click();

    await expect(page.locator("#perfil-err")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("#perfil-err")).toContainText(/PNG, JPEG/);
  });
});
