import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Lê semver de `package.json` (apenas servidor / build). */
export function readPackageVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
