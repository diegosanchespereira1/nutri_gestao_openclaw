import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

/**
 * Testes funcionais (E2E) com Playwright.
 *
 * Dois níveis de testes em `e2e/`:
 *  - smoke  → não precisam de Supabase real nem credenciais (sempre correm).
 *  - auth   → precisam de E2E_EMAIL / E2E_PASSWORD + Supabase real
 *             (são automaticamente ignorados quando as variáveis não existem).
 *
 * Credenciais e IDs de pacientes ficam em .env.test (ignorado pelo git).
 *
 * Local:  npm run test:e2e        (arranca `next dev` automaticamente)
 * CI:     faz build antes e o Playwright arranca `next start`.
 */

// Carrega .env.test se existir (não sobrescreve variáveis já definidas no shell)
loadDotenv({ path: ".env.test", override: false });

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    // E2E_SLOWMO=500 abranda cada ação (ms) — útil com --headed para acompanhar visualmente.
    launchOptions: {
      slowMo: Number(process.env.E2E_SLOWMO ?? 0),
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: process.env.CI ? `npx next start -p ${PORT}` : `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
