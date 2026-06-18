#!/usr/bin/env node
/**
 * Prepara ícones nativos (Android/iOS) e Play Store a partir de assets/icon.png.
 *
 * - icon-512.png → upload na consola Google Play (ícone da loja)
 * - mipmap/ic_launcher* → ícone instalado no telemóvel (via AAB)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const iconPath = path.join(root, "assets/icon.png");
const foregroundPath = path.join(root, "assets/icon-foreground.png");
const backgroundPath = path.join(root, "assets/icon-background.png");
const googlePlayIcon512 = path.join(root, "assets/store-listing/google-play/icon-512.png");
const adaptiveIconXml = path.join(root, "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml");
const adaptiveIconRoundXml = path.join(
  root,
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml"
);

const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`;

async function assertSourceIcon() {
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Ícone fonte não encontrado: ${iconPath}`);
  }

  const meta = await sharp(iconPath).metadata();
  if (meta.width !== 1024 || meta.height !== 1024) {
    throw new Error(
      `assets/icon.png deve ser 1024×1024 (actual: ${meta.width}×${meta.height})`
    );
  }
}

async function writeAdaptiveIconLayers() {
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: "#FFFFFF",
    },
  })
    .png()
    .toFile(backgroundPath);

  await fs.promises.copyFile(iconPath, foregroundPath);
}

function patchAdaptiveIconXml() {
  for (const file of [adaptiveIconXml, adaptiveIconRoundXml]) {
    if (fs.existsSync(path.dirname(file))) {
      fs.writeFileSync(file, ADAPTIVE_ICON_XML);
    }
  }
}

async function writePlayStoreIcon512() {
  fs.mkdirSync(path.dirname(googlePlayIcon512), { recursive: true });
  await sharp(iconPath)
    .resize(512, 512, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(googlePlayIcon512);
}

function generateNativeAssets() {
  execSync("npx capacitor-assets generate", { cwd: root, stdio: "inherit" });
}

export async function prepareAppIcons({ generateNative = true } = {}) {
  await assertSourceIcon();
  await writeAdaptiveIconLayers();
  if (generateNative) {
    generateNativeAssets();
  }
  patchAdaptiveIconXml();
  await writePlayStoreIcon512();
}

async function main() {
  await prepareAppIcons();
  console.log("\n✅ Ícone sincronizado a partir de assets/icon.png\n");
  console.log("  Play Store  → assets/store-listing/google-play/icon-512.png");
  console.log("  Android     → android/app/src/main/res/mipmap-*/ic_launcher*");
  console.log("\nPróximo passo: npm run mobile:android:bundle (novo AAB com o ícone)\n");
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
