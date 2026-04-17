import { createClient } from "@supabase/supabase-js";

/**
 * Chave só em runtime (Docker/Portainer). Não usar `process.env.SUPABASE_SERVICE_ROLE_KEY`
 * diretamente: o Next.js inlinha isso no build e o valor fica vazio no bundle, ignorando
 * variáveis definidas no container em produção.
 */
function readServiceRoleKey(): string | undefined {
  if (typeof process === "undefined") return undefined;
  const name = "SUPABASE" + "_SERVICE_ROLE_KEY";
  const raw = process.env[name];
  return typeof raw === "string" ? raw.trim() : undefined;
}

/** Apenas server actions / route handlers. Nunca importar em Client Components. */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = readServiceRoleKey();
  if (!url || !key) {
    const missing: string[] = [];
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL (build)");
    if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY (runtime no servidor)");
    throw new Error(`Supabase (service role): ${missing.join(", ")}.`);
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
