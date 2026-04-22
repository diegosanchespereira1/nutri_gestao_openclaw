export type PublicRuntimeEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
};

declare global {
  interface Window {
    __NUTRIGESTAO_PUBLIC_ENV__?: PublicRuntimeEnv;
  }
}

function getFromWindow(): PublicRuntimeEnv | null {
  if (typeof window === "undefined") return null;
  const fromWindow = window.__NUTRIGESTAO_PUBLIC_ENV__;
  if (!fromWindow) return null;
  return fromWindow;
}

function readServerEnv(keys: string[]): string {
  if (typeof window !== "undefined") return "";
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) return value;
  }
  return "";
}

export function getPublicRuntimeEnv(): PublicRuntimeEnv {
  const fromWindow = getFromWindow();
  const supabaseUrl =
    fromWindow?.supabaseUrl ||
    readServerEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  const supabaseAnonKey =
    fromWindow?.supabaseAnonKey ||
    readServerEnv(["SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  const siteUrl =
    fromWindow?.siteUrl || readServerEnv(["SITE_URL", "NEXT_PUBLIC_SITE_URL"]);

  return { supabaseUrl, supabaseAnonKey, siteUrl };
}

export function assertSupabasePublicRuntimeEnv() {
  const env = getPublicRuntimeEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "Configuração pública do Supabase ausente: defina SUPABASE_URL/SUPABASE_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY) no ambiente de execução.",
    );
  }
  return env;
}
