import { expect, test } from "@playwright/test";

import { login, gotoNovaAvaliacao, findPatientIdByCategory } from "./helpers/auth";
import { shot, resetShotIndex } from "./helpers/screenshot";

/**
 * Testes funcionais E2E — Avaliação Nutricional Adulto.
 *
 * Pré-requisitos:
 *   E2E_EMAIL    — email da conta de teste (em .env.test)
 *   E2E_PASSWORD — senha da conta de teste (em .env.test)
 *
 * O paciente adulto é descoberto automaticamente em /pacientes?categoria=adulto.
 * Se não houver nenhum paciente adulto cadastrado, os testes são ignorados.
 */

const E2E_EMAIL    = process.env.E2E_EMAIL    ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
const SCREENSHOT_DIR = "avaliacao-adulto";

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD em .env.test para executar.",
);

let patientId = "";

test.beforeAll(async ({ browser }) => {
  const ctx  = await browser.newContext();
  const page = await ctx.newPage();
  await login(page);
  patientId = (await findPatientIdByCategory(page, "adulto")) ?? "";
  await ctx.close();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function abrirFormulario(page: Parameters<typeof shot>[0]) {
  await login(page);
  await gotoNovaAvaliacao(page, patientId);
  await expect(page.getByRole("tab", { name: /adulto/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: /adulto/i }).click();
}

async function getCalcBoxValue(page: Parameters<typeof shot>[0], label: string): Promise<string> {
  const box = page.locator(".rounded-lg").filter({ hasText: new RegExp(label, "i") }).first();
  return (await box.locator("p.font-mono").textContent()) ?? "";
}

// ── Suite principal ───────────────────────────────────────────────────────────

test.describe("Avaliação Adulto — preenchimento e cálculos em tempo real", () => {
  test.beforeEach(async () => {
    resetShotIndex();
    test.skip(!patientId, "Nenhum paciente adulto encontrado em /pacientes?categoria=adulto.");
  });

  test("01 — navega até o formulário e a aba Adulto está visível", async ({ page }) => {
    await login(page);
    await gotoNovaAvaliacao(page, patientId);
    await shot(page, SCREENSHOT_DIR, "pagina-carregada");
    await expect(page.getByRole("tab", { name: /adulto/i })).toBeVisible();
  });

  test("02 — seleciona grupo e preenche idade", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#adult-group").selectOption("mulher_branca");
    await page.locator("#adult-age").fill("42");
    await shot(page, SCREENSHOT_DIR, "grupo-idade");
    await expect(page.locator("#adult-age")).toHaveValue("42");
  });

  test("03 — CB + DCT → CMB calculado em tempo real", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#adult-cb").fill("25");
    await page.locator("#adult-dct").fill("8");
    await shot(page, SCREENSHOT_DIR, "cmb-calculado");
    const cmb = await getCalcBoxValue(page, "CMB");
    expect(cmb).toMatch(/22[,.]4[89]/);
  });

  test("04 — AJ + CB → Peso Estimado calculado", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#adult-cb").fill("25");
    await page.locator("#adult-aj").fill("48");
    await shot(page, SCREENSHOT_DIR, "pe-calculado");
    const pe = await getCalcBoxValue(page, "Peso Estimado");
    expect(pe).not.toMatch(/^–/);
  });

  test("05 — mulher branca exige idade para Altura Estimada", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#adult-group").selectOption("mulher_branca");
    await page.locator("#adult-aj").fill("48");
    const alt = await getCalcBoxValue(page, "Altura Estimada");
    expect(alt).toMatch(/^–/);
    await page.locator("#adult-age").fill("42");
    const altComIdade = await getCalcBoxValue(page, "Altura Estimada");
    expect(altComIdade).not.toMatch(/^–/);
  });

  test("06 — homem branco NÃO exige idade para Altura Estimada", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#adult-group").selectOption("homem_branco");
    await page.locator("#adult-aj").fill("50");
    const alt = await getCalcBoxValue(page, "Altura Estimada");
    expect(alt).not.toMatch(/^–/);
  });

  test("07 — IMC calculado quando PE e Altura disponíveis", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#adult-group").selectOption("homem_branco");
    await page.locator("#adult-cb").fill("27");
    await page.locator("#adult-aj").fill("50");
    await shot(page, SCREENSHOT_DIR, "imc-calculado");
    const imc = await getCalcBoxValue(page, "IMC");
    expect(imc).not.toMatch(/^–/);
  });

  test("08 — checkbox amputação exibe campo de % e recalcula PE", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#adult-cb").fill("25");
    await page.locator("#adult-aj").fill("48");
    const peSemAmp = await getCalcBoxValue(page, "Peso Estimado");
    await page.locator("input[type='checkbox']").check();
    await expect(page.locator("#adult-amp-pct")).toBeVisible();
    await shot(page, SCREENSHOT_DIR, "amputacao-marcada");
    const peComAmp = await getCalcBoxValue(page, "Peso Estimado");
    expect(Number(peComAmp.replace(",", "."))).toBeGreaterThan(
      Number(peSemAmp.replace(",", ".")),
    );
  });

  test("09 — Kcal/kg e g PTN/kg → NE e NP calculados", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#adult-group").selectOption("homem_branco");
    await page.locator("#adult-cb").fill("27");
    await page.locator("#adult-aj").fill("50");
    await page.locator("#adult-kcal").fill("30");
    await page.locator("#adult-ptn").fill("1.2");
    await shot(page, SCREENSHOT_DIR, "ne-np-calculados");
    const ne = await getCalcBoxValue(page, "Necessidade Energética");
    const np = await getCalcBoxValue(page, "Necessidade Proteica");
    expect(ne).not.toMatch(/^–/);
    expect(np).not.toMatch(/^–/);
  });

  test("10 — select de risco nutricional e diagnóstico preenchidos", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#adult-risk").selectOption("c_rn");
    await page.locator("#adult-diagnosis").fill("SRD-19");
    await expect(page.locator("#adult-risk")).toHaveValue("c_rn");
    await expect(page.locator("#adult-diagnosis")).toHaveValue("SRD-19");
  });

  test("11 — submissão com dados mínimos (AJ + CB) redireciona", async ({ page }) => {
    test.setTimeout(60_000);
    await abrirFormulario(page);
    await page.locator("#adult-group").selectOption("homem_branco");
    await page.locator("#adult-cb").fill("26");
    await page.locator("#adult-aj").fill("49");
    await shot(page, SCREENSHOT_DIR, "antes-submissao");
    await page.getByRole("button", { name: /registar avaliação \(adultos\)/i }).click();
    await page.waitForURL(new RegExp(`/pacientes/${patientId}`), { timeout: 30_000 });
    await shot(page, SCREENSHOT_DIR, "apos-submissao");
    await expect(page.getByRole("alert")).not.toBeVisible();
  });
});

// ── Validações de borda ───────────────────────────────────────────────────────

test.describe("Avaliação Adulto — validações de borda", () => {
  test.beforeEach(async () => {
    resetShotIndex();
    test.skip(!patientId, "Nenhum paciente adulto encontrado em /pacientes?categoria=adulto.");
  });

  test("12 — campo Peso Real (opcional) aceita valor sem bloquear", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#adult-weight").fill("72.5");
    await expect(page.locator("#adult-weight")).toHaveValue("72.5");
  });

  test("13 — notas clínicas e CP preenchidos não causam erro", async ({ page }) => {
    test.setTimeout(60_000);
    await abrirFormulario(page);
    await page.locator("#adult-group").selectOption("mulher_branca");
    await page.locator("#adult-age").fill("45");
    await page.locator("#adult-cb").fill("24");
    await page.locator("#adult-aj").fill("46");
    await page.locator("#adult-cp").fill("28");
    await page.locator("#adult-notes").fill("Paciente em uso de diurético.");
    await page.getByRole("button", { name: /registar avaliação \(adultos\)/i }).click();
    await page.waitForURL(new RegExp(`/pacientes/${patientId}`), { timeout: 30_000 });
    await expect(page.getByRole("alert")).not.toBeVisible();
  });
});
