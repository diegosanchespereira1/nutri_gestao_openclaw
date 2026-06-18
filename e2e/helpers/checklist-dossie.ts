import { expect, type Locator, type Page } from "@playwright/test";

import { login } from "./auth";
import { waitForLocator } from "./retry";
import { resetShotIndex, shot } from "./screenshot";

/** Desenha um traço em zigue-zague no canvas de assinatura. */
export async function drawSignature(page: Page, canvas: Locator) {
  await canvas.waitFor({ state: "visible" });
  await page.waitForTimeout(400);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas de assinatura não está visível.");

  const y = box.y + box.height / 2;
  const startX = box.x + box.width * 0.2;
  const endX = box.x + box.width * 0.8;
  const stepCount = 8;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  for (let i = 1; i <= stepCount; i++) {
    const x = startX + ((endX - startX) * i) / stepCount;
    const offsetY = i % 2 === 0 ? 14 : -14;
    await page.mouse.move(x, y + offsetY, { steps: 4 });
  }
  await page.mouse.up();
}

export type ChecklistDossieFlowOptions = {
  clientName: string;
  screenshotDir: string;
  signerName?: string;
};

/**
 * Fluxo funcional completo de checklist:
 * login → selecionar estabelecimento do cliente → template do sistema →
 * marcar todos os itens como Conforme → finalizar → assinar → aprovar → gerar PDF.
 */
export async function runChecklistDossieFlow(
  page: Page,
  options: ChecklistDossieFlowOptions,
) {
  const {
    clientName,
    screenshotDir,
    signerName = "Responsável Teste E2E",
  } = options;

  resetShotIndex();
  await login(page);
  await shot(page, screenshotDir, "inicio-apos-login");

  await page.goto("/checklists", { waitUntil: "domcontentloaded" });
  const establishmentSelect = page.getByLabel("Selecionar estabelecimento");
  await waitForLocator(establishmentSelect, {
    label: "seletor de estabelecimento",
  });
  await shot(page, screenshotDir, "catalogo-checklists");

  const option = establishmentSelect
    .locator("option", { hasText: clientName })
    .first();
  const optionCount = await option.count();

  if (optionCount > 0) {
    const value = await option.getAttribute("value");
    await establishmentSelect.selectOption(value!);
  } else {
    await page.getByRole("button", { name: "Pesquisar estabelecimento" }).click();
    await page
      .getByLabel("Pesquisar estabelecimento para filtrar checklists")
      .fill(clientName);
    const result = page
      .getByRole("dialog")
      .getByRole("button", { name: new RegExp(clientName, "i") })
      .first();
    await waitForLocator(result, {
      label: `estabelecimento ${clientName}`,
    });
    await result.click();
  }
  await shot(page, screenshotDir, "estabelecimento-selecionado");

  const systemTemplates = page.getByRole("radiogroup", {
    name: "Templates de checklist disponíveis",
  });
  const firstTemplate = systemTemplates.getByRole("radio").first();
  await waitForLocator(firstTemplate, {
    label: "primeiro template de checklist",
    timeoutMs: 15_000,
  });
  await firstTemplate.click();
  await expect(firstTemplate).toHaveAttribute("aria-checked", "true");
  await shot(page, screenshotDir, "template-selecionado");

  const useTemplate = page
    .getByRole("button", { name: "Usar template" })
    .first();
  await expect(useTemplate).toBeEnabled({ timeout: 15_000 });
  await useTemplate.click();

  const startNew = page.getByRole("button", {
    name: "Iniciar novo (mantém o existente)",
  });
  await Promise.race([
    page
      .waitForURL(/\/checklists\/preencher\//, { timeout: 20_000 })
      .catch(() => null),
    startNew.waitFor({ state: "visible", timeout: 20_000 }).catch(() => null),
  ]);
  if (!page.url().includes("/checklists/preencher/")) {
    await shot(page, screenshotDir, "dialog-sessao-em-aberto");
    await startNew.click();
    await page.waitForURL(/\/checklists\/preencher\//, { timeout: 20_000 });
  }
  await shot(page, screenshotDir, "preenchimento-iniciado");

  const nextSection = page.getByRole("button", { name: "Próxima seção" });

  for (let section = 1; section <= 60; section++) {
    const conformeRadios = page.locator(
      'input[type="radio"][value="conforme"]',
    );
    await waitForLocator(conformeRadios.first(), {
      label: `itens conforme (seção ${section})`,
      timeoutMs: 15_000,
    });

    const count = await conformeRadios.count();
    for (let i = 0; i < count; i++) {
      await conformeRadios.nth(i).check();
    }
    await shot(
      page,
      screenshotDir,
      `secao-${String(section).padStart(2, "0")}-conforme`,
    );

    await nextSection.waitFor({ state: "visible" });
    if (await nextSection.isDisabled()) break;
    await nextSection.click();
    await expect(
      page.getByRole("button", { name: "Carregando..." }),
    ).toHaveCount(0, { timeout: 30_000 });
  }

  await page.getByRole("button", { name: "Finalizar e ver dossiê" }).click();
  const finalizeDialog = page.getByRole("dialog");
  await expect(
    finalizeDialog.getByText("Finalizar e compilar dossiê?"),
  ).toBeVisible();
  await shot(page, screenshotDir, "dialog-finalizar");
  await finalizeDialog.getByRole("button", { name: "Confirmar" }).click();

  const approve = page.getByRole("button", { name: "Aprovar dossiê" });
  await waitForLocator(approve, {
    label: "botão Aprovar dossiê",
    timeoutMs: 60_000,
  });
  await shot(page, screenshotDir, "dossie-em-revisao");
  await approve.click();

  const signatureDialog = page.getByRole("dialog");
  await expect(
    signatureDialog.getByText("Assinatura da profissional"),
  ).toBeVisible();
  await drawSignature(page, signatureDialog.locator("canvas"));
  await shot(page, screenshotDir, "assinatura-profissional");
  await signatureDialog.getByRole("button", { name: "Próximo →" }).click();

  await expect(signatureDialog.getByText("Assinatura do cliente")).toBeVisible();
  await signatureDialog
    .getByLabel(/Nome de quem está assinando/)
    .fill(signerName);
  await drawSignature(page, signatureDialog.locator("canvas"));
  await shot(page, screenshotDir, "assinatura-cliente");
  await signatureDialog
    .getByRole("button", { name: "Confirmar e aprovar dossiê" })
    .click();

  await expect(page.getByText("Dossiê aprovado").first()).toBeVisible({
    timeout: 90_000,
  });
  await shot(page, screenshotDir, "dossie-aprovado");

  await expect(page.getByText("PDF do relatório")).toBeVisible({
    timeout: 30_000,
  });

  const downloadPromise = page.waitForEvent("download", {
    timeout: 180_000,
  });
  await page
    .getByRole("button", { name: /Gerar PDF|Gerar novamente/ })
    .click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  await download.saveAs(
    `test-results/${screenshotDir}/${download.suggestedFilename()}`,
  );
  await expect(page.getByText(/PDF v\d+/)).toBeVisible({ timeout: 30_000 });
  await shot(page, screenshotDir, "pdf-gerado");
}
