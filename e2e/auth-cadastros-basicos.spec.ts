import { expect, test, type Page } from "@playwright/test";

import { login } from "./helpers/auth";

/**
 * T0.5 — Rede de regressão dos fluxos de cadastro que o plano de limites vai alterar
 * (docs/plano-limites-tenant-e-billing-TAREFAS.md).
 *
 * Estes fluxos passam por `createClientAction`, `createPatientAction` e
 * `deletePatientAction` — Server Actions **sem nenhum teste unitário** hoje. Este
 * arquivo grava o comportamento ANTES do trigger de limite (T2), da checagem em
 * TypeScript (T3) e do soft delete (T9c), para que a mudança seja comparável.
 *
 * ⚠️ Ao chegar na T9c, o teste de exclusão MUDA de expectativa de propósito:
 *    o registro deixa de sumir do banco e passa a ficar inativo. Essa é a única
 *    alteração de expectativa legítima — justificar no PR.
 *
 * Escrevem dados reais no ambiente de E2E: cada teste limpa o que criou e usa um
 * sufixo único. Sem E2E_EMAIL / E2E_PASSWORD o arquivo inteiro é ignorado.
 */

const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD para executar os testes autenticados.",
);

/** Sufixo único por execução — evita colisão com dados deixados por rodadas anteriores. */
const RUN = `E2E-${Date.now().toString(36)}`;

/** `window.confirm` dos botões de exclusão: aceitar automaticamente. */
function autoAcceptConfirm(page: Page) {
  page.on("dialog", (d) => void d.accept());
}

/** Extrai o UUID de /clientes/<id>/editar ou /pacientes/<id>/editar. */
function idFromEditUrl(url: string): string {
  const m = url.match(/\/(?:clientes|pacientes)\/([0-9a-f-]{36})\/editar/i);
  if (!m) throw new Error(`URL de edição inesperada: ${url}`);
  return m[1]!;
}

test.describe("Cadastros básicos — rede de regressão", () => {
  test("cliente PF: criar, aparecer na lista e eliminar", async ({ page }) => {
    autoAcceptConfirm(page);
    await login(page);

    const nome = `Cliente PF ${RUN}`;

    await page.goto("/clientes/novo", { waitUntil: "domcontentloaded" });
    await page.locator('input[name="kind"][value="pf"]').check();
    await page.locator("#client-legal-name").fill(nome);

    await page.getByRole("button", { name: "Criar cliente" }).click();
    await page.waitForURL(/\/clientes\/[0-9a-f-]{36}\/editar/i, {
      timeout: 30_000,
    });
    const clientId = idFromEditUrl(page.url());

    // Aparece na listagem
    await page.goto(`/clientes?q=${encodeURIComponent(RUN)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(nome, { exact: false })).toBeVisible();

    // Limpeza — e cobertura de deleteClientAction
    await page.goto(`/clientes/${clientId}/editar`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Eliminar cliente" }).click();
    await page.waitForURL(/\/clientes(\?|$)/, { timeout: 30_000 });

    await page.goto(`/clientes?q=${encodeURIComponent(RUN)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(nome, { exact: false })).toHaveCount(0);
  });

  test("paciente independente: criar, aparecer na lista e eliminar", async ({
    page,
  }) => {
    autoAcceptConfirm(page);
    await login(page);

    const nome = `Paciente ${RUN}`;

    await page.goto("/pacientes/novo", { waitUntil: "domcontentloaded" });
    await page.locator("#patient-name").fill(nome);

    await page.getByRole("button", { name: "Criar paciente" }).click();
    await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}\/editar/i, {
      timeout: 30_000,
    });
    const patientId = idFromEditUrl(page.url());

    await page.goto(`/pacientes?q=${encodeURIComponent(RUN)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(nome, { exact: false })).toBeVisible();

    // Limpeza — e cobertura de deletePatientAction.
    // Na T9c isto passa a ser exclusão lógica: o paciente some da lista, mas a
    // linha permanece no banco. A asserção abaixo (some da lista) continua válida.
    await page.goto(`/pacientes/${patientId}/editar`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Eliminar paciente" }).click();
    await page.waitForURL(/\/pacientes(\?|$)/, { timeout: 30_000 });

    await page.goto(`/pacientes?q=${encodeURIComponent(RUN)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(nome, { exact: false })).toHaveCount(0);
  });

  test("formulário de cliente mantém os campos que a T3/T5 vão alterar", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/clientes/novo", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#client-legal-name")).toBeVisible();
    await expect(page.locator("#client-document")).toBeVisible();
    await expect(page.locator('input[name="kind"][value="pf"]')).toBeAttached();
    await expect(page.locator('input[name="kind"][value="pj"]')).toBeAttached();

    // Antes do limite existir, o botão de criar nunca aparece desabilitado.
    const criar = page.getByRole("button", { name: "Criar cliente" });
    await expect(criar).toBeVisible();
    await expect(criar).toBeEnabled();
  });

  test("formulário de paciente mantém os campos que a T3/T5 vão alterar", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/pacientes/novo", { waitUntil: "domcontentloaded" });

    await expect(page.locator("#patient-name")).toBeVisible();
    await expect(page.locator("#patient-doc")).toBeVisible();

    const criar = page.getByRole("button", { name: "Criar paciente" });
    await expect(criar).toBeVisible();
    await expect(criar).toBeEnabled();
  });
});
