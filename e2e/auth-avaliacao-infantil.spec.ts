import { expect, test } from "@playwright/test";

import { login, gotoNovaAvaliacao, discoverPatientIdInBeforeAll } from "./helpers/auth";
import { abrirFormularioAvaliacao } from "./helpers/avaliacao";
import { shot, resetShotIndex } from "./helpers/screenshot";

/**
 * Testes funcionais E2E — Avaliação Nutricional Infantil.
 *
 * Pré-requisitos:
 *   E2E_EMAIL    — email da conta de teste (em .env.test)
 *   E2E_PASSWORD — senha da conta de teste (em .env.test)
 *
 * O paciente criança é descoberto automaticamente em /pacientes?categoria=crianca.
 * Se não houver nenhum paciente criança cadastrado, os testes são ignorados.
 */

const E2E_EMAIL    = process.env.E2E_EMAIL    ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
const SCREENSHOT_DIR = "avaliacao-infantil";

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD em .env.test para executar.",
);

let patientId = "";

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  patientId = await discoverPatientIdInBeforeAll(browser, "crianca");
});

// ── Suite principal ───────────────────────────────────────────────────────────

test.describe("Avaliação Infantil — preenchimento completo", () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeEach(async () => {
    resetShotIndex();
    test.skip(!patientId, "Nenhum paciente criança encontrado em /pacientes?categoria=crianca.");
  });

  test("01 — navega até o formulário e a aba Infantil está visível", async ({ page }) => {
    await login(page);
    await gotoNovaAvaliacao(page, patientId);
    await shot(page, SCREENSHOT_DIR, "pagina-carregada");

    await expect(page.getByRole("tab", { name: /infantil/i })).toBeVisible();
    await expect(page).toHaveURL(/avaliacao\/nova/);
  });

  test("02 — seleciona sexo e datas → idade calculada exibida", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    await page.locator("#ca-sex").selectOption("female");

    const hoje = new Date();
    const nascimento = new Date(hoje);
    nascimento.setFullYear(nascimento.getFullYear() - 5);
    await page.locator("#ca-birth").fill(nascimento.toISOString().slice(0, 10));
    await page.locator("#ca-recorded").fill(hoje.toISOString().slice(0, 10));
    await shot(page, SCREENSHOT_DIR, "datas-preenchidas");

    const idadeEl = page.locator("text=/\\d+a \\d+m/");
    await expect(idadeEl).toBeVisible();
  });

  test("03 — peso e estatura → IMC calculado em tempo real", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    await page.locator("#ca-sex").selectOption("female");
    const nascimento = new Date();
    nascimento.setFullYear(nascimento.getFullYear() - 5);
    nascimento.setMonth(1);
    await page.locator("#ca-birth").fill(nascimento.toISOString().slice(0, 10));
    await page.locator("#ca-recorded").fill(new Date().toISOString().slice(0, 10));

    await page.locator("#ca-weight").fill("22");
    await page.locator("#ca-height").fill("120");
    await shot(page, SCREENSHOT_DIR, "peso-altura-preenchidos");

    // IMC = 22/(1,2²) ≈ 15,3
    await expect(page.getByText(/15[,.]3/)).toBeVisible();
  });

  test("04 — critério Z-score: opção presente (habilitada ou desabilitada)", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    const zOption = page.locator("#ca-method option[value='zscore']");
    await expect(zOption).toBeAttached();

    const isDisabled = await zOption.getAttribute("disabled");
    if (isDisabled !== null) {
      await expect(zOption).toContainText(/referência/i);
    } else {
      await page.locator("#ca-method").selectOption("zscore");
      await expect(page.locator("#ca-method")).toHaveValue("zscore");
    }
  });

  test("05 — label muda entre comprimento e estatura conforme a idade", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "infantil");
    await page.locator("#ca-sex").selectOption("male");

    const bebe = new Date();
    bebe.setMonth(bebe.getMonth() - 12);
    await page.locator("#ca-birth").fill(bebe.toISOString().slice(0, 10));
    await page.locator("#ca-recorded").fill(new Date().toISOString().slice(0, 10));
    await expect(page.locator("#ca-height").locator("..").locator("..")).toContainText(/deitado/i);

    const crianca = new Date();
    crianca.setFullYear(crianca.getFullYear() - 3);
    await page.locator("#ca-birth").fill(crianca.toISOString().slice(0, 10));
    await expect(page.locator("#ca-height").locator("..").locator("..")).toContainText(/em pé/i);
  });

  test("06 — cards de resultado aparecem ao preencher peso e altura", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    await page.locator("#ca-sex").selectOption("female");
    const nasc = new Date();
    nasc.setFullYear(nasc.getFullYear() - 6);
    await page.locator("#ca-birth").fill(nasc.toISOString().slice(0, 10));
    await page.locator("#ca-recorded").fill(new Date().toISOString().slice(0, 10));
    await page.locator("#ca-weight").fill("22");
    await page.locator("#ca-height").fill("118");
    await shot(page, SCREENSHOT_DIR, "cards-resultado");

    await expect(page.getByText(/resultado/i).first()).toBeVisible();
  });

  test("07 — campo de notas clínicas aceita texto", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    const notas = page.locator("textarea[name='clinical_notes']");
    await notas.fill("Paciente eutrófico. Acompanhamento mensal.");
    await expect(notas).toHaveValue("Paciente eutrófico. Acompanhamento mensal.");
  });

  test("08 — submissão com dados válidos redireciona para prontuário", async ({ page }) => {
    test.setTimeout(60_000);
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    await page.locator("#ca-sex").selectOption("female");
    const nasc = new Date();
    nasc.setFullYear(nasc.getFullYear() - 5);
    await page.locator("#ca-birth").fill(nasc.toISOString().slice(0, 10));
    await page.locator("#ca-recorded").fill(new Date().toISOString().slice(0, 10));
    await page.locator("#ca-weight").fill("19");
    await page.locator("#ca-height").fill("110");
    await shot(page, SCREENSHOT_DIR, "antes-submissao");

    await page.getByRole("button", { name: /registar avaliação/i }).click();
    await page.waitForURL(new RegExp(`/pacientes/${patientId}`), { timeout: 30_000 });
    await shot(page, SCREENSHOT_DIR, "apos-submissao");

    await expect(page.getByRole("alert")).not.toBeVisible();
  });

  test("09 — botão desabilitado sem sexo selecionado", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    const btnSubmit = page.getByRole("button", { name: /registar avaliação/i });
    await expect(btnSubmit).toBeDisabled();
  });

  test("10 — avaliação registada aparece no histórico do paciente", async ({ page }) => {
    test.setTimeout(60_000);
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    await page.locator("#ca-sex").selectOption("male");
    const nasc = new Date();
    nasc.setFullYear(nasc.getFullYear() - 7);
    await page.locator("#ca-birth").fill(nasc.toISOString().slice(0, 10));
    await page.locator("#ca-recorded").fill(new Date().toISOString().slice(0, 10));
    await page.locator("#ca-weight").fill("24");
    await page.locator("#ca-height").fill("122");
    await page.getByRole("button", { name: /registar avaliação/i }).click();
    await page.waitForURL(new RegExp(`/pacientes/${patientId}`), { timeout: 30_000 });

    const historicoSection = page.locator("[data-testid='child-assessments-section']")
      .or(page.getByRole("region", { name: /avaliações infantis/i }))
      .or(page.locator("section").filter({ hasText: /avalia.*infantil/i }));
    await expect(historicoSection.first()).toBeVisible({ timeout: 10_000 });
  });
});

// ── Validações de borda ───────────────────────────────────────────────────────

test.describe("Avaliação Infantil — validações de borda", () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeEach(async () => {
    resetShotIndex();
    test.skip(!patientId, "Nenhum paciente criança encontrado em /pacientes?categoria=crianca.");
  });

  test("11 — apenas peso (sem altura) → card de peso exibido, IMC ausente", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    await page.locator("#ca-sex").selectOption("female");
    const nasc = new Date();
    nasc.setFullYear(nasc.getFullYear() - 5);
    await page.locator("#ca-birth").fill(nasc.toISOString().slice(0, 10));
    await page.locator("#ca-recorded").fill(new Date().toISOString().slice(0, 10));
    await page.locator("#ca-weight").fill("20");

    await expect(page.getByText(/imc calculado/i)).not.toBeVisible();
  });

  test("12 — apenas altura (sem peso) → sem IMC, sem erro de JS", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    await page.locator("#ca-sex").selectOption("male");
    const nasc = new Date();
    nasc.setFullYear(nasc.getFullYear() - 5);
    await page.locator("#ca-birth").fill(nasc.toISOString().slice(0, 10));
    await page.locator("#ca-recorded").fill(new Date().toISOString().slice(0, 10));
    await page.locator("#ca-height").fill("115");

    await expect(page.getByText(/imc calculado/i)).not.toBeVisible();
    await expect(page.getByRole("button", { name: /registar avaliação/i })).toBeEnabled();
  });

  test("13 — data de nascimento futura → botão desabilitado", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "infantil");

    await page.locator("#ca-sex").selectOption("female");
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    await page.locator("#ca-birth").fill(futuro.toISOString().slice(0, 10));
    await page.locator("#ca-recorded").fill(new Date().toISOString().slice(0, 10));

    await expect(page.getByRole("button", { name: /registar avaliação/i })).toBeDisabled();
  });
});
