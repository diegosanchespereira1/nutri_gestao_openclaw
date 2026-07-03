import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { login } from "./helpers/auth";

/**
 * Captura screenshots para Google Play e App Store.
 *
 * Pré-requisitos: E2E_EMAIL e E2E_PASSWORD em .env.test
 * Produção (recomendado — igual ao app mobile): E2E_BASE_URL=https://nutricao.stratostech.com.br
 */
const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";

const OUT = path.join(process.cwd(), "assets/store-listing");
const ANDROID_DIR = path.join(OUT, "google-play/screenshots");
const IOS_65_DIR = path.join(OUT, "app-store/screenshots-iphone-6.5");
const IOS_69_DIR = path.join(OUT, "app-store/screenshots-iphone-6.9");

const SCREENS: Array<{ slug: string; path: string; heading?: RegExp | string }> = [
  { slug: "01-dashboard", path: "/dashboard", heading: /dashboard/i },
  { slug: "02-ficha-tecnica", path: "/ficha-tecnica", heading: /ficha técnica/i },
  { slug: "03-checklists", path: "/checklists", heading: /checklist/i },
  { slug: "04-clientes", path: "/clientes", heading: /cliente/i },
  { slug: "05-visitas", path: "/visitas", heading: /visita/i },
];

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test.skip(
  !E2E_EMAIL || !E2E_PASSWORD,
  "Defina E2E_EMAIL e E2E_PASSWORD em .env.test para gerar screenshots.",
);

async function captureSet(
  page: import("@playwright/test").Page,
  viewport: { width: number; height: number },
  outDir: string,
  prefix: string,
) {
  fs.mkdirSync(outDir, { recursive: true });
  await page.setViewportSize(viewport);

  for (const screen of SCREENS) {
    await page.goto(screen.path, { waitUntil: "networkidle" });
    if (screen.heading) {
      await expect(page.getByRole("heading", { name: screen.heading }).first()).toBeVisible({
        timeout: 25_000,
      });
    }
    await page.waitForTimeout(800);
    const file = path.join(outDir, `${prefix}${screen.slug}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  📸 ${file}`);
  }
}

test("gera screenshots para Google Play e App Store", async ({ page }) => {
  await login(page);

  console.log("\n[store-screenshots] Google Play (1080×1920):");
  await captureSet(page, { width: 1080, height: 1920 }, ANDROID_DIR, "");

  console.log("\n[store-screenshots] App Store iPhone 6.5\" (1284×2778):");
  await captureSet(page, { width: 1284, height: 2778 }, IOS_65_DIR, "");

  console.log("\n[store-screenshots] App Store iPhone 6.9\" (1320×2868):");
  await captureSet(page, { width: 1320, height: 2868 }, IOS_69_DIR, "");

  console.log("\n✅ Screenshots em assets/store-listing/\n");
});
