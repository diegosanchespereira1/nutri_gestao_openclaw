/** Identificador da build/deploy (embutido em `NEXT_PUBLIC_*` no build). */

const DEV_BUILD_ID = "dev";

export function getAppBuildId(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim();
  if (fromEnv) return fromEnv;
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (vercelSha) return vercelSha;
  return DEV_BUILD_ID;
}

/** Rótulo curto para a UI (ex.: abaixo de «Sair»). */
export function formatAppBuildLabel(buildId: string): string {
  if (buildId === DEV_BUILD_ID) return "dev";
  if (buildId.length > 12) return buildId.slice(0, 7);
  return buildId;
}

export const APP_BUILD_SESSION_STORAGE_KEY = "ng_app_build_id";
