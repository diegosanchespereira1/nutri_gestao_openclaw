import { expect, test } from "@playwright/test";

/**
 * Testes smoke — não precisam de Supabase real nem credenciais.
 * Validam que a app arranca, as páginas públicas renderizam e o
 * guard de autenticação (middleware) protege as rotas privadas.
 */

test.describe("Páginas públicas", () => {
  test("raiz redireciona para /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("página de login renderiza o formulário completo", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("button", { name: "Entrar", pressed: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
    await expect(
      page.locator("form").getByRole("button", { name: "Entrar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Recuperar senha" }),
    ).toBeVisible();
  });

  test("registo público abre a aba Cadastre-se", async ({
    page,
  }) => {
    await page.goto("/register");

    await expect(page).toHaveURL(/\/login\?aba=cadastro/);
    await expect(
      page.getByRole("button", { name: "Cadastre-se", pressed: true }),
    ).toBeVisible();
  });

  test("página de recuperação de senha renderiza", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});

test.describe("Guard de autenticação", () => {
  for (const path of [
    "/dashboard",
    "/clientes",
    "/perfil",
    "/checklists",
    "/checklists/vencidos",
    "/checklists/a-vencer",
  ]) {
    test(`rota protegida ${path} redireciona para login com next`, async ({
      page,
    }) => {
      await page.goto(path);

      await expect(page).toHaveURL(
        new RegExp(`/login\\?next=${encodeURIComponent(path)}`),
      );
      await expect(
        page.getByRole("button", { name: "Entrar", pressed: true }),
      ).toBeVisible();
    });
  }

  test("área admin não é acessível sem sessão", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});
