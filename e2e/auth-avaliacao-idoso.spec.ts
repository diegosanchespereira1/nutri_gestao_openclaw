import { expect, test } from "@playwright/test";

import { login, gotoNovaAvaliacao, findPatientIdByCategory } from "./helpers/auth";
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
  const ctx  = await browser.newContext();
  const page = await ctx.newPage();
  await login(page);
  patientId = (await findPatientIdByCategory(page, "idoso")) ?? "";
  await ctx.close();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function abrirFormulario(page: Parameters<typeof shot>[0]) {
  await login(page);
  await gotoNovaAvaliacao(page, patientId);
  await expect(page.getByRole("tab", { name: /idoso/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: /idoso/i }).click();
}

async function getCalcBoxValue(page: Parameters<typeof shot>[0], label: string): Promise<string> {
  const box = page.locator(".rounded-lg").filter({ hasText: new RegExp(label, "i") }).first();
  return (await box.locator("p.font-mono").textContent()) ?? "";
}

// ── Suite principal ───────────────────────────────────────────────────────────

test.describe("Avaliação Idoso — preenchimento e cálculos", () => {
  test.beforeEach(async () => {
    resetShotIndex();
    test.skip(!patientId, "Nenhum paciente idoso encontrado em /pacientes?categoria=idoso.");
  });

  test("01 — navega até o formulário e a aba Idoso está visível", async ({ page }) => {
    await login(page);
    await gotoNovaAvaliacao(page, patientId);
    await shot(page, SCREENSHOT_DIR, "pagina-carregada");
    await expect(page.getByRole("tab", { name: /idoso/i })).toBeVisible();
  });

  test("02 — altura geriátrica exige AJ + Idade (todos os grupos)", async ({ page }) => {
    await abrirFormulario(page);

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
    await abrirFormulario(page);

    await page.locator("#ga-group").selectOption("mulher_branca");
    await page.locator("#ga-cb").fill("25");
    await page.locator("#ga-aj").fill("50");
    await page.locator("#ga-age").fill("75");

    const pe = await getCalcBoxValue(page, "Peso Estimado");
    const peNum = Number(pe.replace(",", ".").replace(/[^\d.]/g, ""));

    expect(peNum).toBeCloseTo(55.99, 0);
    await shot(page, SCREENSHOT_DIR, "pe-geriatrico");
  });

  test("04 — CMB calculado corretamente", async ({ page }) => {
    await abrirFormulario(page);

    await page.locator("#ga-cb").fill("25");
    await page.locator("#ga-dct").fill("8");

    const cmb = await getCalcBoxValue(page, "CMB");
    expect(cmb).toMatch(/22[,.]4[89]/);
  });

  test("05 — IMC calculado quando PE e Altura disponíveis", async ({ page }) => {
    await abrirFormulario(page);

    await page.locator("#ga-group").selectOption("homem_branco");
    await page.locator("#ga-cb").fill("27");
    await page.locator("#ga-aj").fill("50");
    await page.locator("#ga-age").fill("72");
    await shot(page, SCREENSHOT_DIR, "imc-calculado");

    const imc = await getCalcBoxValue(page, "IMC");
    expect(imc).not.toMatch(/^–/);
  });

  test("06 — amputação recalcula PE e IMC do idoso", async ({ page }) => {
    await abrirFormulario(page);

    await page.locator("#ga-group").selectOption("homem_branco");
    await page.locator("#ga-cb").fill("27");
    await page.locator("#ga-aj").fill("50");
    await page.locator("#ga-age").fill("72");

    const peSem = await getCalcBoxValue(page, "Peso Estimado");

    await page.locator("input[type='checkbox']").check();
    await expect(page.locator("#ga-amp-pct")).toBeVisible();
    await shot(page, SCREENSHOT_DIR, "amputacao-marcada");

    const peCom = await getCalcBoxValue(page, "Peso Estimado");
    expect(Number(peCom.replace(",", "."))).toBeGreaterThan(
      Number(peSem.replace(",", ".")),
    );
  });

  test("07 — Kcal/kg e g PTN/kg → NE e NP calculados", async ({ page }) => {
    await abrirFormulario(page);

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
    await abrirFormulario(page);

    await page.locator("#ga-risk").selectOption("s_rn");
    await page.locator("#ga-diagnosis").fill("D-16");
    await expect(page.locator("#ga-risk")).toHaveValue("s_rn");
    await expect(page.locator("#ga-diagnosis")).toHaveValue("D-16");
  });

  test("09 — submissão com dados mínimos redireciona para prontuário", async ({ page }) => {
    test.setTimeout(60_000);
    await abrirFormulario(page);

    await page.locator("#ga-group").selectOption("mulher_branca");
    await page.locator("#ga-cb").fill("24");
    await page.locator("#ga-aj").fill("47");
    await page.locator("#ga-age").fill("74");
    await shot(page, SCREENSHOT_DIR, "antes-submissao");

    await page.getByRole("button", { name: /registar avaliação/i }).first().click();
    await page.waitForURL(new RegExp(`/pacientes/${patientId}`), { timeout: 30_000 });
    await shot(page, SCREENSHOT_DIR, "apos-submissao");

    await expect(page.getByRole("alert")).not.toBeVisible();
  });

  test("10 — avaliação geriátrica aparece no histórico do paciente", async ({ page }) => {
    test.setTimeout(60_000);
    await abrirFormulario(page);

    await page.locator("#ga-group").selectOption("homem_negro");
    await page.locator("#ga-cb").fill("26");
    await page.locator("#ga-aj").fill("51");
    await page.locator("#ga-age").fill("80");
    await page.getByRole("button", { name: /registar avaliação/i }).first().click();
    await page.waitForURL(new RegExp(`/pacientes/${patientId}`), { timeout: 30_000 });

    const historicoSection = page.locator("[data-testid='geriatric-assessments-section']")
      .or(page.getByRole("region", { name: /avaliações geriátricas/i }))
      .or(page.locator("section").filter({ hasText: /geriátric/i }));
    await expect(historicoSection.first()).toBeVisible({ timeout: 10_000 });
  });
});

// ── Diferenciação de fórmulas por grupo ──────────────────────────────────────

test.describe("Avaliação Idoso — diferenciação de fórmulas por grupo", () => {
  test.beforeEach(async () => {
    resetShotIndex();
    test.skip(!patientId, "Nenhum paciente idoso encontrado em /pacientes?categoria=idoso.");
  });

  test("11 — trocar grupo muda PE e Altura exibidos", async ({ page }) => {
    await abrirFormulario(page);

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
    await abrirFormulario(page);

    await page.locator("#ga-group").selectOption("mulher_negra");
    await page.locator("#ga-cb").fill("25");
    await page.locator("#ga-aj").fill("50");
    await page.locator("#ga-age").fill("75");
    await shot(page, SCREENSHOT_DIR, "mulher-negra-pe");

    const pe = await getCalcBoxValue(page, "Peso Estimado");
    const peNum = Number(pe.replace(",", ".").replace(/[^\d.]/g, ""));
    expect(peNum).toBeCloseTo(55.28, 0);
  });

  test("13 — grupo Homem Negro exibe PE segundo equação correta", async ({ page }) => {
    // AJ×0,44 + CB×2,86 − 39,21 com AJ=50, CB=25 → 54,29 kg
    await abrirFormulario(page);

    await page.locator("#ga-group").selectOption("homem_negro");
    await page.locator("#ga-cb").fill("25");
    await page.locator("#ga-aj").fill("50");
    await page.locator("#ga-age").fill("75");
    await shot(page, SCREENSHOT_DIR, "homem-negro-pe");

    const pe = await getCalcBoxValue(page, "Peso Estimado");
    const peNum = Number(pe.replace(",", ".").replace(/[^\d.]/g, ""));
    expect(peNum).toBeCloseTo(54.29, 0);
  });
});
