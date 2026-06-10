import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Fluxo funcional completo de checklist:
 *   login → selecionar estabelecimento do cliente "Escola Teste" →
 *   selecionar o primeiro checklist do sistema → marcar todos os itens como
 *   Conforme → finalizar → assinar → aprovar dossiê → gerar PDF.
 *
 * Screenshots de cada passo ficam em test-results/checklist-dossie-steps/.
 *
 * Pré-requisitos (conta indicada em E2E_EMAIL):
 *   - Onboarding concluído e sem MFA.
 *   - Cliente "Escola Teste" com pelo menos um estabelecimento cadastrado.
 *   - Pelo menos um template de checklist do sistema aplicável.
 *
 * Sem E2E_EMAIL / E2E_PASSWORD o teste é ignorado (skip).
 * Cada execução cria uma sessão nova ("Iniciar novo") — pode re-executar à vontade.
 */

const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
const CLIENT_NAME = process.env.E2E_CLIENT_NAME ?? "Escola Teste";

const SCREENSHOT_DIR = "test-results/checklist-dossie-steps";

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD para executar os testes autenticados.",
);

let shotIndex = 0;
async function shot(page: Page, name: string) {
  shotIndex += 1;
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${String(shotIndex).padStart(2, "0")}-${name}.png`,
    fullPage: true,
  });
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByLabel("Senha", { exact: true }).fill(E2E_PASSWORD);
  await shot(page, "login-preenchido");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/inicio/, { timeout: 30_000 });
  await shot(page, "inicio-apos-login");
}

/** Desenha um traço em zigue-zague no canvas de assinatura. */
async function drawSignature(page: Page, canvas: Locator) {
  await canvas.waitFor({ state: "visible" });
  // Dialogs têm animação de entrada — aguardar estabilizar antes de medir o canvas.
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

test.describe("Checklist do sistema — dossiê completo com PDF", () => {
  test("aplica checklist, marca tudo Conforme, aprova e gera PDF", async ({
    page,
  }) => {
    test.setTimeout(360_000);
    shotIndex = 0;

    await login(page);

    // ── 1. Catálogo de checklists: selecionar o estabelecimento do cliente ──
    await page.goto("/checklists");
    const establishmentSelect = page.getByLabel("Selecionar estabelecimento");
    await establishmentSelect.waitFor({ state: "visible" });
    await shot(page, "catalogo-checklists");

    const option = establishmentSelect
      .locator("option", { hasText: CLIENT_NAME })
      .first();
    const optionCount = await option.count();

    if (optionCount > 0) {
      const value = await option.getAttribute("value");
      await establishmentSelect.selectOption(value!);
    } else {
      // Não está nos recentes: usar a busca por nome.
      await page.getByRole("button", { name: "Pesquisar estabelecimento" }).click();
      await page
        .getByLabel("Pesquisar estabelecimento para filtrar checklists")
        .fill(CLIENT_NAME);
      const result = page
        .getByRole("dialog")
        .getByRole("button", { name: new RegExp(CLIENT_NAME, "i") })
        .first();
      await result.click();
    }
    await shot(page, "estabelecimento-selecionado");

    // ── 2. Selecionar o primeiro checklist do sistema na lista ──
    // Os templates são cartões com role="radio"; o botão "Usar template"
    // só fica disponível depois de um cartão estar selecionado.
    const systemTemplates = page.getByRole("radiogroup", {
      name: "Templates de checklist disponíveis",
    });
    const firstTemplate = systemTemplates.getByRole("radio").first();
    await firstTemplate.waitFor({ state: "visible", timeout: 15_000 });
    await firstTemplate.click();
    await expect(firstTemplate).toHaveAttribute("aria-checked", "true");
    await shot(page, "template-selecionado");

    const useTemplate = page
      .getByRole("button", { name: "Usar template" })
      .first();
    await expect(useTemplate).toBeEnabled({ timeout: 15_000 });
    await useTemplate.click();

    // Pode aparecer o dialog de sessão em aberto (execuções anteriores) —
    // nesse caso iniciamos uma sessão nova para o teste ser re-executável.
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
      await shot(page, "dialog-sessao-em-aberto");
      await startNew.click();
      await page.waitForURL(/\/checklists\/preencher\//, { timeout: 20_000 });
    }
    await shot(page, "preenchimento-iniciado");

    // ── 3. Percorrer todas as seções marcando tudo como Conforme ──
    const nextSection = page.getByRole("button", { name: "Próxima seção" });

    for (let section = 1; section <= 60; section++) {
      const conformeRadios = page.locator(
        'input[type="radio"][value="conforme"]',
      );
      await conformeRadios.first().waitFor({ state: "visible", timeout: 15_000 });

      const count = await conformeRadios.count();
      for (let i = 0; i < count; i++) {
        await conformeRadios.nth(i).check();
      }
      await shot(page, `secao-${String(section).padStart(2, "0")}-conforme`);

      // Botão fica desativado na última seção.
      await nextSection.waitFor({ state: "visible" });
      if (await nextSection.isDisabled()) break;
      await nextSection.click();
      // Aguardar a transição de seção (autosave + render).
      await expect(
        page.getByRole("button", { name: "Carregando..." }),
      ).toHaveCount(0, { timeout: 30_000 });
    }

    // ── 4. Finalizar e compilar o dossiê ──
    await page.getByRole("button", { name: "Finalizar e ver dossiê" }).click();
    const finalizeDialog = page.getByRole("dialog");
    await expect(
      finalizeDialog.getByText("Finalizar e compilar dossiê?"),
    ).toBeVisible();
    await shot(page, "dialog-finalizar");
    await finalizeDialog.getByRole("button", { name: "Confirmar" }).click();

    // ── 5. Aprovar o dossiê (com assinaturas) ──
    const approve = page.getByRole("button", { name: "Aprovar dossiê" });
    await expect(approve).toBeVisible({ timeout: 60_000 });
    await shot(page, "dossie-em-revisao");
    await approve.click();

    const signatureDialog = page.getByRole("dialog");
    await expect(
      signatureDialog.getByText("Assinatura da profissional"),
    ).toBeVisible();
    await drawSignature(page, signatureDialog.locator("canvas"));
    await shot(page, "assinatura-profissional");
    await signatureDialog.getByRole("button", { name: "Próximo →" }).click();

    await expect(
      signatureDialog.getByText("Assinatura do cliente"),
    ).toBeVisible();
    await signatureDialog
      .getByLabel(/Nome de quem está assinando/)
      .fill("Responsável Teste E2E");
    await drawSignature(page, signatureDialog.locator("canvas"));
    await shot(page, "assinatura-cliente");
    await signatureDialog
      .getByRole("button", { name: "Confirmar e aprovar dossiê" })
      .click();

    // Aprovação sincroniza com o servidor — aguardar o estado aprovado.
    await expect(page.getByText("Dossiê aprovado").first()).toBeVisible({
      timeout: 90_000,
    });
    await shot(page, "dossie-aprovado");

    // ── 6. Gerar o PDF do relatório ──
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
    // Downloads do Playwright são temporários — persistir junto dos screenshots.
    await download.saveAs(`${SCREENSHOT_DIR}/${download.suggestedFilename()}`);
    await expect(page.getByText(/PDF v\d+/)).toBeVisible({ timeout: 30_000 });
    await shot(page, "pdf-gerado");
  });
});
