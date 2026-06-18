import type { Page } from "@playwright/test";

import { retryUntil, waitForLocator } from "./retry";

/**
 * Faz login com as credenciais de E2E.
 * Repete até 3 vezes antes de falhar por timeout.
 */
export async function login(page: Page): Promise<void> {
  const email = process.env.E2E_EMAIL ?? "";
  const password = process.env.E2E_PASSWORD ?? "";

  if (/\/(inicio|onboarding)/.test(page.url())) return;

  await retryUntil(
    async () => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Senha", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.waitForURL(/\/(inicio|onboarding)/, { timeout: 20_000 });
      return true;
    },
    { label: "login E2E", attempts: 3, delayMs: 1_000 },
  );
}

/**
 * Navega para a página de nova avaliação de um paciente.
 */
export async function gotoNovaAvaliacao(
  page: Page,
  patientId: string,
): Promise<void> {
  await page.goto(`/pacientes/${patientId}/avaliacao/nova`, {
    waitUntil: "domcontentloaded",
  });
}

/**
 * Descobre o primeiro paciente da lista filtrada pela categoria etária.
 * Retorna o UUID do paciente, ou null se não houver nenhum cadastrado.
 *
 * A lista é localizada até 3 vezes antes de falhar por timeout.
 * Requer que a página já esteja autenticada (chame login() antes).
 */
export async function findPatientIdByCategory(
  page: Page,
  categoria: "crianca" | "adulto" | "idoso",
): Promise<string | null> {
  await page.goto(`/pacientes?categoria=${categoria}`, {
    waitUntil: "domcontentloaded",
  });

  const list = page.locator('ul[aria-label="Lista de pacientes"]');
  await waitForLocator(list, {
    label: `lista de pacientes (${categoria})`,
    attempts: 3,
    timeoutMs: 20_000,
  });

  const firstLink = list.locator("li a").first();
  const hasPatient = await firstLink.isVisible().catch(() => false);
  if (!hasPatient) return null;

  const href = await firstLink.getAttribute("href");
  if (!href) return null;

  const match = href.match(/\/pacientes\/([0-9a-f-]{36})/);
  return match ? match[1] : null;
}

const BEFORE_ALL_ATTEMPTS = 3;
const BEFORE_ALL_DELAY_MS = 2_000;

/**
 * Setup compartilhado para beforeAll: login + descoberta de paciente por categoria.
 * Repete até 3 vezes apenas em caso de erro/timeout (lista vazia não dispara retry).
 */
export async function discoverPatientIdInBeforeAll(
  browser: import("@playwright/test").Browser,
  categoria: "crianca" | "adulto" | "idoso",
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= BEFORE_ALL_ATTEMPTS; attempt++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await login(page);
      return (await findPatientIdByCategory(page, categoria)) ?? "";
    } catch (err) {
      lastError = err;
      if (attempt < BEFORE_ALL_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, BEFORE_ALL_DELAY_MS));
      }
    } finally {
      await ctx.close();
    }
  }

  throw (
    lastError ??
    new Error(
      `beforeAll falhou ao descobrir paciente ${categoria} após ${BEFORE_ALL_ATTEMPTS} tentativas.`,
    )
  );
}

/**
 * Setup compartilhado para beforeAll: descobre pacientes de todas as categorias.
 */
export async function discoverPatientIdsByCategoryInBeforeAll(
  browser: import("@playwright/test").Browser,
): Promise<Record<"crianca" | "adulto" | "idoso", string>> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= BEFORE_ALL_ATTEMPTS; attempt++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await login(page);
      return {
        crianca: (await findPatientIdByCategory(page, "crianca")) ?? "",
        adulto: (await findPatientIdByCategory(page, "adulto")) ?? "",
        idoso: (await findPatientIdByCategory(page, "idoso")) ?? "",
      };
    } catch (err) {
      lastError = err;
      if (attempt < BEFORE_ALL_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, BEFORE_ALL_DELAY_MS));
      }
    } finally {
      await ctx.close();
    }
  }

  throw (
    lastError ??
    new Error(
      `beforeAll falhou ao descobrir pacientes por categoria após ${BEFORE_ALL_ATTEMPTS} tentativas.`,
    )
  );
}
