import "server-only";
import { env as nodeEnv } from "node:process";

function readRuntimeEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = Reflect.get(nodeEnv, key);
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
