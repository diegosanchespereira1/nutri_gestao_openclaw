/**
 * Configuração Vitest exclusiva para testes de isolamento RLS multi-tenant.
 * Usa ficheiro .env.test com credenciais da instância Supabase local.
 *
 * Executar: npm run test:rls
 * Pré-requisito: npx supabase start
 */
import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    // Cada ficheiro de teste tem o seu setup/teardown completo
    // Não usar globalSetup para evitar estado partilhado entre ficheiros
    testTimeout: 30_000, // Supabase local pode ser lento em CI
    hookTimeout: 30_000,
    // Não paralelizar — evita race conditions no seed/teardown
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      // Carregar .env.test se existir (dotenv manual no helper)
    },
    reporters: ["verbose"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
