/**
 * Origin usado em redirectTo / emailRedirectTo.
 * Defina NEXT_PUBLIC_SITE_URL se o email abrir noutro host que o da barra de endereços (ex. 127.0.0.1 vs localhost).
 */
export function getBrowserAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

/**
 * Lê a origem do ambiente de EXECUÇÃO.
 *
 * Chave montada dinamicamente de propósito: uma referência literal a
 * `process.env.NEXT_PUBLIC_SITE_URL` é substituída pelo Next durante o `next build`,
 * congelando no bundle o valor que existia no `docker build` (o secret do GitHub).
 * Definir a variável no Portainer depois não muda nada — foi o que fez o Checkout do
 * Stripe gravar `success_url: http://localhost:3000` mesmo com a stack correta.
 * `process.env[key]` com chave variável escapa dessa substituição.
 *
 * Mesmo padrão de `lib/env/public-runtime.ts` → `readServerEnv`.
 */
function readRuntimeSiteUrl(): string {
  if (typeof window !== "undefined") return "";
  for (const key of ["SITE_URL", "NEXT_PUBLIC_SITE_URL"]) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim().replace(/\/$/, "");
    }
  }
  return "";
}

/**
 * Origem absoluta para links em emails e server actions (sem `window`).
 *
 * Ordem: runtime (Portainer) → valor embutido no build → VERCEL_URL → localhost.
 * O runtime vem primeiro porque é o único que distingue DEV de PRD sem rebuild.
 */
export function getServerAppOrigin(): string {
  const fromRuntime = readRuntimeSiteUrl();
  if (fromRuntime) return fromRuntime;

  // Referência literal: é o valor embutido no build, usado quando o runtime não define.
  const fromBuild = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromBuild) return fromBuild;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}
