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

function bakedSupabaseUrl(): string | undefined {
  const url = pickBaked(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  );
  return url || undefined;
}

function bakedSupabaseAnonKey(): string | undefined {
  const key = pickBaked(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
  );
  return key || undefined;
}

function pickBaked(...values: (string | undefined)[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

export function readSupabaseUrl(): string | undefined {
  return (
    readRuntimeEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]) ??
    bakedSupabaseUrl()
  );
}

export function readSupabaseAnonKey(): string | undefined {
  return (
    readRuntimeEnv(["SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) ??
    bakedSupabaseAnonKey()
  );
}

export function readSupabaseServiceRoleKey(): string | undefined {
  return readRuntimeEnv(["SUPABASE_SERVICE_ROLE_KEY"]);
}
