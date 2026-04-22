import { createClient } from "@supabase/supabase-js";
import { env as nodeEnv } from "node:process";
import {
  readSupabaseServiceRoleKey,
  readSupabaseUrl,
} from "@/lib/supabase/runtime-env";

/**
 * Chave só em runtime (Docker/Portainer).
 *
 * O Next.js pode substituir `process.env.NOME` no bundle por valores do build.
 * Usamos `node:process` + nome da variável montado em runtime + `Reflect.get`
 * para ler o valor real injetado pelo container em produção.
 */
/** Apenas server actions / route handlers. Nunca importar em Client Components. */
export function createServiceRoleClient() {
  const url = readSupabaseUrl();
  const key = readSupabaseServiceRoleKey();
  if (!url || !key) {
    if (!key && process.env.NODE_ENV === "production") {
      const hasAnySupabaseEnv = Object.keys(nodeEnv).some((k) =>
        k.includes("SUPABASE"),
      );
      console.error(
        "[service-role] SUPABASE_SERVICE_ROLE_KEY ausente no process.env do Node.",
        { hasAnySupabaseEnvKey: hasAnySupabaseEnv },
      );
    }
    const missing: string[] = [];
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL (build)");
    if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY (runtime no servidor)");
    throw new Error(`Supabase (service role): ${missing.join(", ")}.`);
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
