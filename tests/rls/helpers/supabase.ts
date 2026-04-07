/**
 * Factory de clientes Supabase para testes de isolamento RLS.
 * Carrega variáveis de .env.test e cria clientes autenticados por tenant.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Carregar .env.test manualmente (vitest não tem dotenv por padrão)
// ---------------------------------------------------------------------------
function loadEnvTest(): void {
  try {
    const envPath = resolve(process.cwd(), ".env.test");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.test não existe — assumir que as vars já estão no ambiente (CI)
  }
}

loadEnvTest();

// ---------------------------------------------------------------------------
// Configuração base
// ---------------------------------------------------------------------------
export function getTestEnv() {
  const url = process.env["SUPABASE_TEST_URL"];
  const anonKey = process.env["SUPABASE_TEST_ANON_KEY"];
  const serviceRoleKey = process.env["SUPABASE_TEST_SERVICE_ROLE_KEY"];

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Variáveis de ambiente de teste em falta.\n" +
        "Copie .env.test.example para .env.test e preencha com os valores do Supabase local.\n" +
        "Execute: npx supabase start",
    );
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
    tenantAEmail:
      process.env["TEST_TENANT_A_EMAIL"] ?? "tenant_a_rls@nutrigestao.test",
    tenantAPassword:
      process.env["TEST_TENANT_A_PASSWORD"] ?? "RlsTest@TenantA2026!",
    tenantBEmail:
      process.env["TEST_TENANT_B_EMAIL"] ?? "tenant_b_rls@nutrigestao.test",
    tenantBPassword:
      process.env["TEST_TENANT_B_PASSWORD"] ?? "RlsTest@TenantB2026!",
  };
}

// ---------------------------------------------------------------------------
// Cliente service_role (bypass RLS — apenas para seed/teardown)
// ---------------------------------------------------------------------------
export function createServiceClient(): SupabaseClient {
  const { url, serviceRoleKey } = getTestEnv();
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Cliente autenticado por JWT real (RLS activo)
// ---------------------------------------------------------------------------
export function createTenantClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = getTestEnv();
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Autenticar um utilizador e obter JWT real
// ---------------------------------------------------------------------------
export async function signInTenant(
  email: string,
  password: string,
): Promise<{ accessToken: string; userId: string }> {
  const { url, anonKey } = getTestEnv();
  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new Error(`Falha ao autenticar ${email}: ${error?.message}`);
  }

  return {
    accessToken: data.session.access_token,
    userId: data.user.id,
  };
}
