/** Versão da aplicação (semver em `package.json`, embutida no build via `NEXT_PUBLIC_APP_VERSION`). */

export const DEV_APP_VERSION = "0.0.0-dev";

export const APP_VERSION_SESSION_STORAGE_KEY = "ng_app_version";

export function getAppVersion(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_VERSION?.trim();
  if (fromEnv) return fromEnv;
  return DEV_APP_VERSION;
}

export function parseSemver(
  version: string,
): { major: number; minor: number; patch: number } | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version.trim());
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

/** Rótulo na UI: `V 1.0.10` (semver completo). */
export function formatAppVersionLabel(version: string): string {
  if (version === DEV_APP_VERSION) return "dev";
  const parts = parseSemver(version);
  if (!parts) return `V ${version}`;
  return `V ${parts.major}.${parts.minor}.${parts.patch}`;
}

/** Texto completo para tooltip / detalhe. */
export function formatAppVersionTitle(version: string): string {
  if (version === DEV_APP_VERSION) return "Versão de desenvolvimento";
  const parts = parseSemver(version);
  if (!parts) return `Versão ${version}`;
  return `Versão ${parts.major}.${parts.minor}.${parts.patch}`;
}
