#!/usr/bin/env node
/**
 * Executa ./gradlew no Android com JDK 17–21 (AGP não suporta Java 25 no PATH).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.join(__dirname, "..", "..", "android");
const gradleArgs = process.argv.slice(2);

if (gradleArgs.length === 0) {
  console.error("Uso: node scripts/mobile/run-android-gradle.mjs bundleRelease");
  process.exit(1);
}

function resolveJavaHome() {
  if (process.env.JAVA_HOME?.trim()) {
    return process.env.JAVA_HOME.trim();
  }

  if (process.platform === "darwin") {
    for (const version of ["21", "17"]) {
      const probe = spawnSync("/usr/libexec/java_home", ["-v", version], {
        encoding: "utf8",
      });
      if (probe.status === 0 && probe.stdout.trim()) {
        return probe.stdout.trim();
      }
    }
  }

  return null;
}

const javaHome = resolveJavaHome();
const env = { ...process.env };
if (javaHome) {
  env.JAVA_HOME = javaHome;
  console.log(`[android-gradle] JAVA_HOME=${javaHome}`);
} else {
  console.warn(
    "[android-gradle] JAVA_HOME não definido e JDK 21/17 não detectado. " +
      "Instale Temurin 21 ou export JAVA_HOME antes do build.",
  );
}

const gradlew =
  process.platform === "win32"
    ? path.join(androidDir, "gradlew.bat")
    : path.join(androidDir, "gradlew");

if (!fs.existsSync(gradlew)) {
  console.error(`Gradle wrapper não encontrado: ${gradlew}`);
  process.exit(1);
}

const result = spawnSync(gradlew, gradleArgs, {
  cwd: androidDir,
  env,
  stdio: "inherit",
});

if (result.status === 0 && gradleArgs.includes("bundleRelease")) {
  const aab = path.join(
    androidDir,
    "app/build/outputs/bundle/release/app-release.aab",
  );
  const nativeSymbols = path.join(
    androidDir,
    "app/build/outputs/native-debug-symbols/release/native-debug-symbols.zip",
  );
  const mapping = path.join(
    androidDir,
    "app/build/outputs/mapping/release/mapping.txt",
  );

  console.log("\n[android-gradle] Artefactos de release:");
  if (fs.existsSync(aab)) console.log(`  AAB: ${aab}`);
  if (fs.existsSync(nativeSymbols)) {
    console.log(`  Símbolos nativos (Play Console): ${nativeSymbols}`);
  }
  if (fs.existsSync(mapping)) {
    console.log(`  Mapping R8/ProGuard: ${mapping}`);
  }
  console.log("");
}

process.exit(result.status ?? 1);
