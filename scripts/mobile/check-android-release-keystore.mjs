#!/usr/bin/env node
/**
 * Valida keystore de release antes de ./gradlew bundleRelease.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.join(__dirname, "..", "..", "android");
const propsPath = path.join(androidDir, "keystore.properties");
const examplePath = path.join(androidDir, "keystore.properties.example");

function resolveKeystorePath(rawPath) {
  const trimmed = rawPath.trim();
  if (path.isAbsolute(trimmed)) return trimmed;
  return path.resolve(androidDir, trimmed);
}

function readKeystoreFromProps() {
  if (!fs.existsSync(propsPath)) return null;
  const lines = fs.readFileSync(propsPath, "utf8").split("\n");
  const props = {};
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (m) props[m[1]] = m[2].trim();
  }
  if (!props.storeFile) return null;
  return {
    storeFile: resolveKeystorePath(props.storeFile),
    keyAlias: props.keyAlias ?? "nutrigestao",
  };
}

function readKeystoreFromEnv() {
  const envPath = process.env.KEYSTORE_PATH?.trim();
  if (!envPath) return null;
  return {
    storeFile: path.isAbsolute(envPath)
      ? envPath
      : path.resolve(androidDir, "app", envPath),
    keyAlias: process.env.KEY_ALIAS?.trim() || "nutrigestao",
  };
}

const configured = readKeystoreFromProps() ?? readKeystoreFromEnv();
const fallbackPath = path.join(androidDir, "app", "nutrigestao-release.keystore");
const keystorePath = configured?.storeFile ?? fallbackPath;

if (fs.existsSync(keystorePath)) {
  console.log(`✅ Keystore encontrado: ${keystorePath}`);
  process.exit(0);
}

console.error(`
❌ Keystore de release não encontrado.

Procurado em: ${keystorePath}

Para publicar na Google Play:

1. Gere o keystore (uma vez — guarde senhas em local seguro):

   mkdir -p ~/keystores
   keytool -genkey -v \\
     -keystore ~/keystores/nutrigestao-release.keystore \\
     -alias nutrigestao \\
     -keyalg RSA -keysize 2048 -validity 10000

2. Configure o projeto:

   cp android/keystore.properties.example android/keystore.properties

   Edite android/keystore.properties, por exemplo:
   storeFile=../keystores/nutrigestao-release.keystore
   (caminho relativo à pasta android/, ou caminho absoluto)

3. Gere o AAB:

   npm run mobile:android:bundle

Referência: ${examplePath}
`);
process.exit(1);
