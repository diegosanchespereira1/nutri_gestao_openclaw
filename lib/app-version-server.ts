import { DEV_APP_VERSION, getAppVersion } from "@/lib/app-version";
import { readPackageVersion } from "@/lib/app-version-package";

/** Versão no servidor: env → package.json → fallback dev. */
export function getServerAppVersion(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_VERSION?.trim();
  if (fromEnv) return fromEnv;
  const fromPackage = readPackageVersion();
  if (fromPackage && fromPackage !== "0.0.0") return fromPackage;
  return getAppVersion() || DEV_APP_VERSION;
}
