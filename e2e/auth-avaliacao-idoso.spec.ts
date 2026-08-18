import { expect, test } from "@playwright/test";

import { login, gotoNovaAvaliacao, discoverPatientIdInBeforeAll } from "./helpers/auth";
import {
  abrirFormularioAvaliacao,
  expectAvaliacaoSalva,
  fillAndAssert,
  getCalcBoxValue,
  parseCalcBoxNumber,
  REGISTRAR_AVALIACAO_RE,
} from "./helpers/avaliacao";
import { shot, resetShotIndex } from "./helpers/screenshot";

/**
 * Testes funcionais E2E — Avaliação Nutricional do Idoso (Geriátrica).
 *
 * Pré-requisitos:
 *   E2E_EMAIL    — email da conta de teste (em .env.test)
 *   E2E_PASSWORD — senha da conta de teste (em .env.test)
 *
 * O paciente idoso é descoberto automaticamente em /pacientes?categoria=idoso.
 * Se não houver nenhum paciente idoso cadastrado, os testes são ignorados.
 */

const E2E_EMAIL    = process.env.E2E_EMAIL    ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
const SCREENSHOT_DIR = "avaliacao-idoso";

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD em .env.test para executar.",
);

let patientId = "";

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  patientId = await discoverPatientIdInBeforeAll(browser, "idoso");
});

// ── Suite principal ───────────────────────────────────────────────────────────

test.describe("Avaliação Idoso — preenchimento e cálculos", () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeEach(async () => {
    resetShotIndex();
    test.skip(!patientId, "Nenhum paciente idoso encontrado em /pacientes?categoria=idoso.");
  });

  test("01 — navega até o formulário de idoso (renderizado direto, sem abas)", async ({ page }) => {
    await login(page);
    await gotoNovaAvaliacao(page, patientId);
    await shot(page, SCREENSHOT_DIR, "pagina-carregada");
    // Paciente de categoria única: formulário direto, sem tablist.
    await expect(page.locator("#ga-group")).toBeVisible();
    await expect(page.getByRole("tablist")).toHaveCount(0);
  });

  test("02 — altura geriátrica exige AJ + Idade (todos os grupos)", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "idoso");
    await page.locator("#ga-group").selectOption("mulher_branca");
    // Limpa a idade pré-preenchida a partir da data de nascimento do paciente.
    await page.locator("#ga-age").fill("");

    let alt = await getCalcBoxValue(page, "Altura Estimada");
    expect(alt).toMatch(/^–/);

    await page.locator("#ga-aj").fill("50");
    alt = await getCalcBoxValue(page, "Altura Estimada");
    expect(alt).toMatch(/^–/);

    await page.locator("#ga-age").fill("75");
    alt = await getCalcBoxValue(page, "Altura Estimada");
    await shot(page, SCREENSHOT_DIR, "altura-calculada");
    expect(alt).not.toMatch(/^–/);
  });

  test("03 — PE geriátrico (Chumlea 1988) difere do PE adulto", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-group").selectOption("mulher_branca");
    await page.locator("#ga-cb").fill("25");
    await page.locator("#ga-aj").fill("50");
    await page.locator("#ga-age").fill("75");

    const peNum = parseCalcBoxNumber(await getCalcBoxValue(page, "Peso Estimado"));

    expect(peNum).toBeCloseTo(55.99, 0);
    await shot(page, SCREENSHOT_DIR, "pe-geriatrico");
  });

  test("04 — CMB calculado corretamente", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-cb").fill("25");
    await page.locator("#ga-dct").fill("8");

    const cmb = await getCalcBoxValue(page, "CMB");
    expect(cmb).toMatch(/22[,.]4[89]/);
  });

  test("05 — IMC calculado quando PE e Altura disponíveis", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-group").selectOption("homem_branco");
    await page.locator("#ga-cb").fill("27");
    await page.locator("#ga-aj").fill("50");
    await page.locator("#ga-age").fill("72");
    await shot(page, SCREENSHOT_DIR, "imc-calculado");

    const imc = await getCalcBoxValue(page, "IMC");
    expect(imc).not.toMatch(/^–/);
  });

  test("06 — amputação recalcula PE e IMC do idoso", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-group").selectOption("homem_branco");
    await expect(page.locator("#ga-group")).toHaveValue("homem_branco");
    await fillAndAssert(page, "#ga-cb", "27");
    await fillAndAssert(page, "#ga-aj", "50");
    await fillAndAssert(page, "#ga-age", "72");

    // Aguarda o PE base estar calculado antes de marcar amputação.
    await expect
      .poll(async () => parseCalcBoxNumber(await getCalcBoxValue(page, "Peso Estimado")), {
        timeout: 15_000,
      })
      .not.toBeNaN();
    const peSem = parseCalcBoxNumber(await getCalcBoxValue(page, "Peso Estimado"));

    await page.getByLabel(/membro amputado/i).check();
    await expect(page.locator("#ga-amp-pct")).toBeVisible();
    await shot(page, SCREENSHOT_DIR, "amputacao-marcada");

    const peCom = parseCalcBoxNumber(await getCalcBoxValue(page, "Peso Estimado"));
    expect(peCom).toBeGreaterThan(peSem);
  });

  test("07 — Kcal/kg e g PTN/kg → NE e NP calculados", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-group").selectOption("mulher_branca");
    await page.locator("#ga-cb").fill("24");
    await page.locator("#ga-aj").fill("46");
    await page.locator("#ga-age").fill("78");
    await page.locator("#ga-kcal").fill("30");
    await page.locator("#ga-ptn").fill("1.2");
    await shot(page, SCREENSHOT_DIR, "ne-np-calculados");

    const ne = await getCalcBoxValue(page, "Necessidade Energética");
    const np = await getCalcBoxValue(page, "Necessidade Proteica");
    expect(ne).not.toMatch(/^–/);
    expect(np).not.toMatch(/^–/);
  });

  test("08 — risco nutricional e diagnóstico preenchidos", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-risk").selectOption("s_rn");
    await page.locator("#ga-diagnosis").fill("D-16");
    await expect(page.locator("#ga-risk")).toHaveValue("s_rn");
    await expect(page.locator("#ga-diagnosis")).toHaveValue("D-16");
  });

  test("09 — submissão com dados mínimos redireciona para prontuário", async ({ page }) => {
    test.setTimeout(60_000);
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-group").selectOption("mulher_branca");
    await fillAndAssert(page, "#ga-cb", "24");
    await fillAndAssert(page, "#ga-aj", "47");
    await fillAndAssert(page, "#ga-age", "74");
    await shot(page, SCREENSHOT_DIR, "antes-submissao");

    await page.getByRole("button", { name: REGISTRAR_AVALIACAO_RE }).first().click();
    await expectAvaliacaoSalva(page, patientId);
    await shot(page, SCREENSHOT_DIR, "apos-submissao");
  });

  test("10 — avaliação geriátrica aparece no histórico do paciente", async ({ page }) => {
    test.setTimeout(60_000);
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-group").selectOption("homem_negro");
    await fillAndAssert(page, "#ga-cb", "26");
    await fillAndAssert(page, "#ga-aj", "51");
    await fillAndAssert(page, "#ga-age", "80");
    await page.getByRole("button", { name: REGISTRAR_AVALIACAO_RE }).first().click();
    await expectAvaliacaoSalva(page, patientId);

    // Redirect abre o prontuário unificado; histórico fica na aba Avaliação.
    await expect(
      page.getByRole("tab", { name: /Indicadores/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.goto(`/pacientes/${patientId}?tab=avaliacao`);
    await expect(page.getByRole("heading", { name: /^Histórico$/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});

// ── Diferenciação de fórmulas por grupo ──────────────────────────────────────

test.describe("Avaliação Idoso — diferenciação de fórmulas por grupo", () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeEach(async () => {
    resetShotIndex();
    test.skip(!patientId, "Nenhum paciente idoso encontrado em /pacientes?categoria=idoso.");
  });

  test("11 — trocar grupo muda PE e Altura exibidos", async ({ page }) => {
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-cb").fill("25");
    await page.locator("#ga-aj").fill("50");
    await page.locator("#ga-age").fill("75");

    await page.locator("#ga-group").selectOption("mulher_branca");
    const peMulher = await getCalcBoxValue(page, "Peso Estimado");

    await page.locator("#ga-group").selectOption("homem_branco");
    const peHomem = await getCalcBoxValue(page, "Peso Estimado");

    expect(peMulher).not.toBe(peHomem);
  });

  test("12 — grupo Mulher Negra exibe PE segundo equação correta", async ({ page }) => {
    // AJ×1,50 + CB×2,58 − 84,22 com AJ=50, CB=25 → 55,28 kg
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-group").selectOption("mulher_negra");
    await page.locator("#ga-cb").fill("25");
    await page.locator("#ga-aj").fill("50");
    await page.locator("#ga-age").fill("75");
    await shot(page, SCREENSHOT_DIR, "mulher-negra-pe");

    const peNum = parseCalcBoxNumber(await getCalcBoxValue(page, "Peso Estimado"));
    expect(peNum).toBeCloseTo(55.28, 0);
  });

  test("13 — grupo Homem Negro exibe PE segundo equação correta", async ({ page }) => {
    // AJ×0,44 + CB×2,86 − 39,21 com AJ=50, CB=25 → 54,29 kg
    await abrirFormularioAvaliacao(page, patientId, "idoso");

    await page.locator("#ga-group").selectOption("homem_negro");
    await page.locator("#ga-cb").fill("25");
    await page.locator("#ga-aj").fill("50");
    await page.locator("#ga-age").fill("75");
    await shot(page, SCREENSHOT_DIR, "homem-negro-pe");

    const peNum = parseCalcBoxNumber(await getCalcBoxValue(page, "Peso Estimado"));
    expect(peNum).toBeCloseTo(54.29, 0);
  });
});
