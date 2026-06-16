import type { Page } from "@playwright/test";

/**
 * Faz login com as credenciais de E2E.
 * Aguarda redirecionamento para /inicio ou /onboarding.
 */
export async function login(page: Page): Promise<void> {
  const email    = process.env.E2E_EMAIL    ?? "";
  const password = process.env.E2E_PASSWORD ?? "";

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(inicio|onboarding)/, { timeout: 30_000 });
}

/**
 * Navega para a página de nova avaliação de um paciente.
 */
export async function gotoNovaAvaliacao(page: Page, patientId: string): Promise<void> {
  await page.goto(`/pacientes/${patientId}/avaliacao/nova`);
}

/**
 * Descobre o primeiro paciente da lista filtrada pela categoria etária.
 * Retorna o UUID do paciente, ou null se não houver nenhum cadastrado.
 *
 * Requer que a página já esteja autenticada (chame login() antes).
 */
export async function findPatientIdByCategory(
  page: Page,
  categoria: "crianca" | "adulto" | "idoso",
): Promise<string | null> {
  await page.goto(`/pacientes?categoria=${categoria}`);
  await page.waitForLoadState("networkidle");

  const firstLink = page
    .locator('ul[aria-label="Lista de pacientes"] li a')
    .first();

  const isVisible = await firstLink.isVisible().catch(() => false);
  if (!isVisible) return null;

  const href = await firstLink.getAttribute("href");
  if (!href) return null;

  const match = href.match(/\/pacientes\/([0-9a-f-]{36})/);
  return match ? match[1] : null;
}
