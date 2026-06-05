import { getAppVersion } from "@/lib/app-version";

export type PublicRuntimeEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
  version: string;
};

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
 * (Docker). `readServerEnv` com chave dinâmica não recebe esse inline — em
 * produção, se o Portainer não repetir NEXT_PUBLIC_SUPABASE_URL em runtime, o
 * SSR injetava `supabaseUrl: ""` e o login ficava preso em "Validando credenciais".
 */
function readBakedPublicEnv(): Pick<
  PublicRuntimeEnv,
  "supabaseUrl" | "supabaseAnonKey" | "siteUrl"
> {
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

export function getPublicRuntimeEnv(): PublicRuntimeEnv {
  const fromWindow = getFromWindow();
  const baked = readBakedPublicEnv();
  // Ordem: runtime do servidor (Portainer) → build Docker (inlinado pelo Next) → window.
  // O script inline do layout pode ficar em cache RSC com valores do build antigo (f18755f);
  // o window não pode ter prioridade sobre o bundle quando os campos estão vazios/errados.
  const supabaseUrl = pickEnv(
    readServerEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]),
    baked.supabaseUrl,
    fromWindow?.supabaseUrl,
  );
  const supabaseAnonKey = pickEnv(
    readServerEnv(["SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
    baked.supabaseAnonKey,
    fromWindow?.supabaseAnonKey,
  );
  const siteUrl = pickEnv(
    readServerEnv(["SITE_URL", "NEXT_PUBLIC_SITE_URL"]),
    baked.siteUrl,
    fromWindow?.siteUrl,
  );

  const version =
    fromWindow?.version ||
    (typeof window === "undefined" ? getAppVersion() : "");

  return {
    supabaseUrl,
    supabaseAnonKey,
    siteUrl,
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
