import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Testes unitários da lib — executados no CI normal (npm run test)
    // Testes RLS multi-tenant estão em vitest.config.rls.ts (npm run test:rls)
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
