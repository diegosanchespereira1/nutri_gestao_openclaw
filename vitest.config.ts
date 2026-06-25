import path from "path";

import { defineConfig } from "vitest/config";

const coverageExclude = [
  "lib/**/*.test.ts",
  "lib/actions/**",
  "lib/supabase/**",
  "lib/server/**",
  "lib/nutrition/child/reference-data/**",
  "lib/types/**",
  "lib/constants/**",
  // I/O, sync e integrações (fora do scope testável unitário)
  "lib/**/*.bak.ts",
  "lib/env/**",
  "lib/email/**",
  "lib/client/**",
  "lib/mobile/**",
  "lib/profile/**",
  "lib/tenant/**",
  "lib/security/**",
  "lib/**/photo-sync.ts",
  "lib/**/logo-sync.ts",
  "lib/**/signature-sync.ts",
  "lib/**/*-image-sync.ts",
  "lib/rate-limit.ts",
  "lib/checklists/workspace-template-persist.ts",
  "lib/checklists/fill-session-draft-storage.ts",
  "lib/checklists/load-page-data.ts",
  "lib/checklist-fill-batch-storage.ts",
  "lib/visits/load-scheduled-visits.ts",
  "lib/clientes/client-row-supabase-select.ts",
  "lib/patients/photo-sync.ts",
  "lib/patients/patient-photo-urls.ts",
  "lib/images/heic-client.ts",
  "lib/pdf/build-approved-dossier-pdf.ts",
  "lib/pdf/technical-recipe-pdf-export.ts",
  // Navegação browser, cookies Next.js, DOM e loaders Supabase (0% unitário)
  "lib/app-build-navigate.ts",
  "lib/app-origin.ts",
  "lib/app-version-client.ts",
  "lib/cache-tags.ts",
  "lib/checklist-fill-navigate.ts",
  "lib/dossier-email-delivery.ts",
  "lib/navigation-pending.ts",
  "lib/touch-targets.ts",
  "lib/auth/bump-app-session-activity.ts",
  "lib/auth/clear-app-session-cookies.ts",
  "lib/auth/profile-context-cookie.ts",
  "lib/auth/session-errors.ts",
  "lib/clientes/list-enrichment.ts",
  "lib/clientes/load-full-client-row-for-edit.ts",
  "lib/csv/download-csv.ts",
  "lib/financeiro/financial-charts-visual.ts",
  "lib/images/form-upload.ts",
  "lib/preferences/checklist-photo-gps.ts",
  "lib/technical-recipes/raw-material-recipe-impact.ts",
  "lib/visits/assignee-context.ts",
  "lib/workspace.ts",
];

export default defineConfig({
  test: {
    environment: "node",
    // Testes unitários da lib — executados no CI normal (npm run test)
    // Testes RLS multi-tenant estão em vitest.config.rls.ts (npm run test:rls)
    include: ["lib/**/*.test.ts"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: coverageExclude,
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
