#!/usr/bin/env node
/**
 * Garante que applicationId, namespace e strings.xml Android usam o mesmo appId
 * do Capacitor (br.com.nutrigestao.app). Evita regressão para com.getcapacitor.myapp.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");

const EXPECTED_APP_ID = "br.com.nutrigestao.app";
const STRINGS_PATH = path.join(
  root,
  "android/app/src/main/res/values/strings.xml",
);
const BUILD_GRADLE_PATH = path.join(root, "android/app/build.gradle");
const CAPACITOR_CONFIG_PATH = path.join(root, "capacitor.config.ts");

function readCapacitorAppId() {
  const src = fs.readFileSync(CAPACITOR_CONFIG_PATH, "utf8");
  const match = src.match(/appId:\s*['"]([^'"]+)['"]/);
  if (!match?.[1]) {
    throw new Error("Não foi possível ler appId em capacitor.config.ts");
  }
  return match[1];
}

function ensureStringsXml(appId) {
  const packageLine = `    <string name="package_name">${appId}</string>`;
  const schemeLine = `    <string name="custom_url_scheme">${appId}</string>`;

  let xml = fs.existsSync(STRINGS_PATH)
    ? fs.readFileSync(STRINGS_PATH, "utf8")
    : "";

  if (!xml.trim()) {
    xml = `<?xml version='1.0' encoding='utf-8'?>\n<resources>\n    <string name="app_name">NutriGestão</string>\n    <string name="title_activity_main">NutriGestão</string>\n${packageLine}\n${schemeLine}\n</resources>\n`;
    fs.writeFileSync(STRINGS_PATH, xml);
    console.log(`[android-package] strings.xml criado com ${appId}`);
    return;
  }

  let next = xml;
  if (/name="package_name"/.test(next)) {
    next = next.replace(
      /<string name="package_name">[^<]*<\/string>/,
      packageLine.trim(),
    );
  } else {
    next = next.replace(
      "</resources>",
      `${packageLine}\n${schemeLine}\n</resources>`,
    );
  }

  if (/name="custom_url_scheme"/.test(next)) {
    next = next.replace(
      /<string name="custom_url_scheme">[^<]*<\/string>/,
      schemeLine.trim(),
    );
  }

  if (next.includes("com.getcapacitor.myapp")) {
    next = next.replaceAll("com.getcapacitor.myapp", appId);
  }

  if (next !== xml) {
    fs.writeFileSync(STRINGS_PATH, next);
    console.log(`[android-package] strings.xml atualizado → ${appId}`);
  } else {
    console.log(`[android-package] strings.xml OK (${appId})`);
  }
}

function ensureBuildGradle(appId) {
  let gradle = fs.readFileSync(BUILD_GRADLE_PATH, "utf8");
  let changed = false;

  const namespaceRe = /namespace\s*=\s*"[^"]*"/;
  const appIdRe = /applicationId\s+"[^"]*"/;

  if (!namespaceRe.test(gradle)) {
    throw new Error("namespace não encontrado em android/app/build.gradle");
  }
  if (!appIdRe.test(gradle)) {
    throw new Error("applicationId não encontrado em android/app/build.gradle");
  }

  const nextNamespace = `namespace = "${appId}"`;
  const nextAppId = `applicationId "${appId}"`;

  if (!gradle.includes(nextNamespace)) {
    gradle = gradle.replace(namespaceRe, nextNamespace);
    changed = true;
  }
  if (!gradle.includes(nextAppId)) {
    gradle = gradle.replace(appIdRe, nextAppId);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(BUILD_GRADLE_PATH, gradle);
    console.log(`[android-package] build.gradle atualizado → ${appId}`);
  } else {
    console.log(`[android-package] build.gradle OK (${appId})`);
  }
}

function scanForLegacyPackage(appId) {
  const androidDir = path.join(root, "android");
  const offenders = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "build" || entry.name === ".gradle") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(xml|gradle|java|kt|properties|json)$/i.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      if (text.includes("com.getcapacitor.myapp")) {
        offenders.push(path.relative(root, full));
      }
    }
  }

  walk(androidDir);
  if (offenders.length > 0) {
    throw new Error(
      `Pacote legado com.getcapacitor.myapp encontrado em:\n- ${offenders.join("\n- ")}\nEsperado: ${appId}`,
    );
  }
}

const appId = readCapacitorAppId();
if (appId !== EXPECTED_APP_ID) {
  console.warn(
    `[android-package] Aviso: appId em capacitor.config.ts é "${appId}" (esperado ${EXPECTED_APP_ID} para a Play Store).`,
  );
}

ensureStringsXml(appId);
ensureBuildGradle(appId);
scanForLegacyPackage(appId);

console.log(`\n✅ Pacote Android pronto para publicação: ${appId}\n`);
