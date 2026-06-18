import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  validateTechnicalRecipePdfContent,
  type SavedRecipeSnapshot,
} from "@/lib/pdf/validate-technical-recipe-pdf-content";
import { login } from "./auth";
import { waitForLocator } from "./retry";
import { resetShotIndex, shot } from "./screenshot";

const CLASSIFICATIONS = [
  "bebida",
  "entrada",
  "prato-principal",
  "sobremesa",
] as const;

const SECTORS = ["Cozinha quente", "Cozinha fria", "Confeitaria", "Bar"];

const INGREDIENT_POOL = [
  "Farinha de trigo",
  "Ovos",
  "Leite integral",
  "Acucar refinado",
  "Sal marinho",
  "Manteiga",
  "Cenoura",
  "Batata",
  "Frango desfiado",
  "Queijo minas",
];

export type RecipeE2EFormData = {
  name: string;
  classification: (typeof CLASSIFICATIONS)[number];
  sector: string;
  cmvPercent: string;
  portionsYield: string;
  marginPercent: string;
  taxPercent: string;
  scaleTarget: string;
  lines: Array<{
    ingredient: string;
    quantity: string;
    unit: "g" | "kg" | "ml" | "l" | "un";
    notes: string;
    correctionFactor: string;
    cookingFactor: string;
  }>;
};

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Gera dados pseudo-aleatórios estáveis o suficiente para depuração (inclui timestamp). */
export function buildRandomRecipeFormData(): RecipeE2EFormData {
  const suffix = `${Date.now()}-${randomInt(1000, 9999)}`;
  const baseQty1 = randomInt(80, 450);
  const baseQty2 = randomInt(40, 280);

  return {
    name: `Receita E2E ${suffix}`,
    classification: pickRandom(CLASSIFICATIONS),
    sector: `${pickRandom(SECTORS)} ${randomInt(1, 9)}`,
    cmvPercent: String(randomInt(20, 35)),
    portionsYield: String(randomInt(2, 8)),
    marginPercent: String(randomInt(12, 45)),
    taxPercent: String(randomInt(5, 18)),
    scaleTarget: String(randomInt(10, 24)),
    lines: [
      {
        ingredient: `${pickRandom(INGREDIENT_POOL)} A`,
        quantity: String(baseQty1),
        unit: "g",
        notes: `Notas linha 1 - ${suffix}`,
        correctionFactor: (randomInt(95, 110) / 100).toFixed(2),
        cookingFactor: "1",
      },
      {
        ingredient: `${pickRandom(INGREDIENT_POOL)} B`,
        quantity: String(baseQty2),
        unit: "g",
        notes: `Notas linha 2 - ${suffix}`,
        correctionFactor: "1",
        cookingFactor: (randomInt(85, 100) / 100).toFixed(2),
      },
    ],
  };
}

export type RecipeFormFlowOptions = {
  screenshotDir?: string;
  data?: RecipeE2EFormData;
};

async function dismissLocalDraftBanner(page: Page) {
  const discard = page.getByRole("button", { name: "Descartar" }).first();
  if (await discard.isVisible().catch(() => false)) {
    await discard.click();
  }
}

async function fillIngredientLine(
  page: Page,
  index: number,
  line: RecipeE2EFormData["lines"][number],
) {
  const row = index + 1;
  await page.getByLabel(`Ingrediente ${row}`).fill(line.ingredient);
  await page.getByLabel(`Quantidade`, { exact: true }).nth(index).fill(line.quantity);
  await page
    .getByLabel("Unidade", { exact: true })
    .nth(index)
    .selectOption(line.unit);
  await page.getByLabel(`Correção (custo)`).nth(index).fill(line.correctionFactor);
  await page.getByLabel(`Cocção (TACO)`).nth(index).fill(line.cookingFactor);
  await page.getByLabel("Notas (opcional)").nth(index).fill(line.notes);

  const rawMaterialSelect = page.getByLabel("Matéria-prima (custo)").nth(index);
  const optionCount = await rawMaterialSelect.locator("option").count();
  if (optionCount > 1) {
    const value = await rawMaterialSelect.locator("option").nth(1).getAttribute("value");
    if (value) {
      await rawMaterialSelect.selectOption(value);
    }
  }

  if (index === 0) {
    const tacoInput = page.getByLabel(/Ligar à TACO/i).first();
    await tacoInput.fill("arroz");
    const tacoHit = page
      .getByRole("listbox", { name: "Resultados TACO" })
      .getByRole("button")
      .first();
    await waitForLocator(tacoHit, {
      label: "resultado TACO arroz",
      timeoutMs: 15_000,
      attempts: 2,
    }).catch(() => null);
    if (await tacoHit.isVisible().catch(() => false)) {
      await tacoHit.click();
      await expect(page.getByRole("button", { name: "Remover ligação" }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  }
}

async function readSavedRecipeSnapshot(page: Page): Promise<SavedRecipeSnapshot> {
  const ingredientFields = page.getByLabel(/^Ingrediente \d+$/);
  const lineCount = await ingredientFields.count();
  const lines: SavedRecipeSnapshot["lines"] = [];

  for (let i = 0; i < lineCount; i++) {
    lines.push({
      ingredient: await ingredientFields.nth(i).inputValue(),
      quantity: await page.getByLabel("Quantidade", { exact: true }).nth(i).inputValue(),
      notes: await page.getByLabel("Notas (opcional)").nth(i).inputValue(),
    });
  }

  return {
    name: await page.getByLabel("Nome da receita").inputValue(),
    classification: await page.locator("#recipe-classification").inputValue(),
    sector: await page.getByLabel("Setor").inputValue(),
    portionsYield: await page.locator("#recipe-portions-yield").inputValue(),
    cmvPercent: await page.locator("#recipe-cmv").inputValue(),
    lines,
  };
}

async function clickExportPdfAndDownload(
  page: Page,
  screenshotDir: string,
  recipeId: string,
): Promise<Buffer> {
  const exportLink = page.getByRole("link", { name: "Exportar PDF" });
  await expect(exportLink).toBeVisible();
  await expect(exportLink).toHaveAttribute("href", `/ficha-tecnica/${recipeId}/pdf`);

  const pdfDir = path.join("test-results", screenshotDir);
  fs.mkdirSync(pdfDir, { recursive: true });

  await exportLink.click();
  await page.waitForURL(new RegExp(`/ficha-tecnica/${recipeId}/pdf$`), {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { name: "Ficha técnica em PDF" }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  const download = await downloadPromise;

  const savePath = path.join(pdfDir, download.suggestedFilename());
  await download.saveAs(savePath);
  const pdfBytes = fs.readFileSync(savePath);
  await test.info().attach("ficha-tecnica-exportada.pdf", {
    path: savePath,
    contentType: "application/pdf",
  });
  return pdfBytes;
}

/**
 * Fluxo funcional: login → nova receita → preencher campos → validar painéis →
 * salvar → clicar Exportar PDF → validar conteúdo da ficha técnica.
 */
export async function runNewRecipeFormFlow(
  page: Page,
  options: RecipeFormFlowOptions = {},
) {
  const data = options.data ?? buildRandomRecipeFormData();
  const screenshotDir = options.screenshotDir ?? "receita-nova-steps";

  resetShotIndex();

  await page.addInitScript(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("nutrigestao:recipe-draft:")) {
        localStorage.removeItem(key);
      }
    }
  });

  await login(page);
  await page.goto("/ficha-tecnica/nova", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Nova receita" })).toBeVisible({
    timeout: 20_000,
  });
  await dismissLocalDraftBanner(page);
  await shot(page, screenshotDir, "formulario-vazio");

  await page.getByLabel("Nome da receita").fill(data.name);

  const establishmentSelect = page.locator("#recipe-establishment");
  if (await establishmentSelect.isVisible().catch(() => false)) {
    const optionsCount = await establishmentSelect.locator("option").count();
    if (optionsCount > 1) {
      const value = await establishmentSelect.locator("option").nth(1).getAttribute("value");
      if (value) await establishmentSelect.selectOption(value);
    }
  }

  await page.locator("#recipe-classification").selectOption(data.classification);
  await page.getByLabel("Setor").fill(data.sector);
  await page.locator("#recipe-cmv").fill(data.cmvPercent);

  await page.locator("#recipe-portions-yield").fill(data.portionsYield);
  await page.locator("#recipe-margin-pct").fill(data.marginPercent);
  await page.locator("#recipe-tax-pct").fill(data.taxPercent);
  await page.locator("#recipe-cmv-pct").fill(data.cmvPercent);

  await fillIngredientLine(page, 0, data.lines[0]);
  await page.getByRole("button", { name: "Add Ingrediente" }).click();
  await fillIngredientLine(page, 1, data.lines[1]);

  await expect(page.getByText(/Peso total \(ingredientes em massa\)/i)).toBeVisible();
  await expect(page.getByText(/kcal/i).first()).toBeVisible();
  await shot(page, screenshotDir, "campos-preenchidos");

  await page.locator("#recipe-scale-target").fill(data.scaleTarget);
  await page.getByRole("button", { name: "Aplicar às quantidades" }).click();
  await expect(page.locator("#recipe-portions-yield")).toHaveValue(data.scaleTarget);
  await shot(page, screenshotDir, "escala-aplicada");

  await page.getByRole("button", { name: "Salvar receita" }).click();
  await page.waitForURL(/\/ficha-tecnica\/[0-9a-f-]+\/editar/, {
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "Editar receita" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Exportar PDF" })).toBeVisible();

  const saved = await readSavedRecipeSnapshot(page);
  expect(saved.name).toBe(data.name);
  expect(saved.sector).toBe(data.sector);
  await shot(page, screenshotDir, "receita-salva");

  const recipeId = page.url().match(/\/ficha-tecnica\/([0-9a-f-]+)\/editar/)?.[1];
  expect(recipeId).toBeTruthy();

  const pdfBytes = await clickExportPdfAndDownload(page, screenshotDir, recipeId!);
  await validateTechnicalRecipePdfContent(pdfBytes, saved);

  await shot(page, screenshotDir, "pdf-validado");

  return { recipeId: recipeId!, data, saved, pdfBytes };
}
