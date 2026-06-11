#!/usr/bin/env node
/**
 * Incrementa patch em package.json e alinha Android (versionName + versionCode)
 * e iOS (MARKETING_VERSION + CURRENT_PROJECT_VERSION no project.pbxproj).
 *
 * Uso: node scripts/version/bump-app-version.mjs
 *      npm run version:bump-patch
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");

function bumpPatch(version) {
  const m = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!m) throw new Error(`Versão inválida em package.json: "${version}"`);
  const suffix = m[4] || "";
  if (suffix && !suffix.startsWith("-")) {
    throw new Error(`Só semver simples X.Y.Z ou X.Y.Z-prerelease suportado; recebido: "${version}"`);
  }
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}${suffix}`;
}

const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const prev = pkg.version;
const next = bumpPatch(prev);
pkg.version = next;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const gradlePath = path.join(root, "android", "app", "build.gradle");
let gradle = fs.readFileSync(gradlePath, "utf8");
gradle = gradle.replace(/versionCode\s+(\d+)/, (_, c) => `versionCode ${Number(c) + 1}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${next}"`);
fs.writeFileSync(gradlePath, gradle);

const pbxPath = path.join(root, "ios", "App", "App.xcodeproj", "project.pbxproj");
let pbx = fs.readFileSync(pbxPath, "utf8");
const buildMatches = [...pbx.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)];
const maxBuild = buildMatches.length
  ? Math.max(...buildMatches.map((x) => Number(x[1])))
  : 0;
const nextBuild = maxBuild + 1;
pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${next};`);
pbx = pbx.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${nextBuild};`);
fs.writeFileSync(pbxPath, pbx);

console.log(`[bump-app-version] ${prev} → ${next} | Android versionCode+1 | iOS CURRENT_PROJECT_VERSION=${nextBuild}`);
