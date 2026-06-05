import { getAppVersion } from "@/lib/app-version";

export type PublicRuntimeEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
  version: string;
};

type SupabasePublicConfig = Pick<
  PublicRuntimeEnv,
  "supabaseUrl" | "supabaseAnonKey" | "siteUrl"
>;

declare global {
  interface Window {
    __NUTRIGESTAO_PUBLIC_ENV__?: PublicRuntimeEnv;
  }
}

function trimNonEmpty(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "";
}

function pickEnv(...candidates: (string | undefined | null)[]): string {
  for (const candidate of candidates) {
    const value = trimNonEmpty(candidate);
    if (value) return value;
  }
  return "";
}

function isCompleteSupabaseConfig(
  config: Partial<SupabasePublicConfig>,
): config is SupabasePublicConfig {
  return (
    trimNonEmpty(config.supabaseUrl).length > 0 &&
    trimNonEmpty(config.supabaseAnonKey).length > 0
  );
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

/**
 * Referências directas a `process.env` para o Next inlinar NEXT_PUBLIC_* no build
 * (Docker). `readServerEnv` com chave dinâmica não recebe esse inline.
 */
function readBakedPublicEnv(): SupabasePublicConfig {
  return {
    supabaseUrl: pickEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_URL,
    ),
    supabaseAnonKey: pickEnv(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      process.env.SUPABASE_ANON_KEY,
    ),
    siteUrl: pickEnv(process.env.NEXT_PUBLIC_SITE_URL, process.env.SITE_URL),
  };
}

function readServerRuntimeConfig(): SupabasePublicConfig | null {
  const config: SupabasePublicConfig = {
    supabaseUrl: readServerEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]),
    supabaseAnonKey: readServerEnv([
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]),
    siteUrl: readServerEnv(["SITE_URL", "NEXT_PUBLIC_SITE_URL"]),
  };
  return isCompleteSupabaseConfig(config) ? config : null;
}

function readBakedConfig(): SupabasePublicConfig | null {
  const config = readBakedPublicEnv();
  return isCompleteSupabaseConfig(config) ? config : null;
}

function readWindowConfig(): SupabasePublicConfig | null {
  const fromWindow = getFromWindow();
  if (!fromWindow) return null;
  const config: SupabasePublicConfig = {
    supabaseUrl: fromWindow.supabaseUrl,
    supabaseAnonKey: fromWindow.supabaseAnonKey,
    siteUrl: fromWindow.siteUrl,
  };
  return isCompleteSupabaseConfig(config) ? config : null;
}

/**
 * URL e anon key devem vir do mesmo tier (runtime, build ou window).
 * Em produção, o Portainer por vezes só tinha a anon key antiga em runtime e a URL
 * vinha do build — par inválido → "Invalid API key". Dev funciona porque o par
 * DEV está completo em ambos os lados.
 */
function resolveSupabasePublicConfig(): SupabasePublicConfig | null {
  // Servidor: build Docker (secrets GitHub) antes do Portainer — em prod o runtime
  // do stack por vezes mantém anon key antiga com URL nova (par inválido após merge).
  // Cliente: script inline do HTML (gerado no servidor) antes do bundle.
  const tiers =
    typeof window === "undefined"
      ? [readBakedConfig, readServerRuntimeConfig, readWindowConfig]
      : [readWindowConfig, readBakedConfig];

  for (const readTier of tiers) {
    const config = readTier();
    if (config) return config;
  }
  return null;
}

export function getPublicRuntimeEnv(): PublicRuntimeEnv {
  const resolved = resolveSupabasePublicConfig();
  const fromWindow = getFromWindow();

  const version =
    fromWindow?.version ||
    (typeof window === "undefined" ? getAppVersion() : "");

  return {
    supabaseUrl: resolved?.supabaseUrl ?? "",
    supabaseAnonKey: resolved?.supabaseAnonKey ?? "",
    siteUrl:
      resolved?.siteUrl ||
      pickEnv(fromWindow?.siteUrl, readBakedPublicEnv().siteUrl),
    version: version || getAppVersion(),
  };
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
