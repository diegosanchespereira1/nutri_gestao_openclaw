import "server-only";

// Usa process.env diretamente (compatível com Node.js e Edge Runtime).
// Reflect.get(import("node:process").env, key) falha silenciosamente no Edge
// porque o polyfill de node:process não inclui vars não-públicas.
function readRuntimeEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
  }
  return undefined;
}

export function readSupabaseUrl(): string | undefined {
  return readRuntimeEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
}

export function readSupabaseAnonKey(): string | undefined {
  return readRuntimeEnv(["SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
}

export function readSupabaseServiceRoleKey(): string | undefined {
  return readRuntimeEnv(["SUPABASE_SERVICE_ROLE_KEY"]);
}
