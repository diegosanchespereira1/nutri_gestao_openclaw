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

function pickBaked(...values: (string | undefined)[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
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

export type SupabaseRuntimeCredentials = {
  url: string;
  anonKey: string;
};

/** URL + anon key do mesmo tier — evita misturar runtime parcial com build. */
export function readSupabaseCredentials():
  | SupabaseRuntimeCredentials
  | undefined {
  const runtimeUrl = readRuntimeEnv([
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  ]);
  const runtimeAnonKey = readRuntimeEnv([
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]);
  if (runtimeUrl && runtimeAnonKey) {
    return { url: runtimeUrl, anonKey: runtimeAnonKey };
  }

  const bakedUrl = bakedSupabaseUrl();
  const bakedAnonKey = bakedSupabaseAnonKey();
  if (bakedUrl && bakedAnonKey) {
    return { url: bakedUrl, anonKey: bakedAnonKey };
  }

  return undefined;
}

export function readSupabaseUrl(): string | undefined {
  return readSupabaseCredentials()?.url;
}

export function readSupabaseAnonKey(): string | undefined {
  return readSupabaseCredentials()?.anonKey;
}

export function readSupabaseServiceRoleKey(): string | undefined {
  return readRuntimeEnv(["SUPABASE_SERVICE_ROLE_KEY"]);
}
