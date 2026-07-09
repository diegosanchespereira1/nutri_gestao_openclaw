#!/usr/bin/env node
/**
 * Gera ícones web (favicon, PWA, Apple) a partir de assets/icon.png.
 *
 * Saída:
 *   app/icon.png              → favicon (Next.js App Router)
 *   app/apple-icon.png        → Apple Touch Icon
 *   public/favicon.ico
 *   public/app-icon.png       → loading screen / referências legadas
 *   public/icons/icon-*.png   → manifest PWA
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const iconPath = path.join(root, "assets/icon.png");
const appDir = path.join(root, "app");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");

const MANIFEST_PATH = path.join(publicDir, "manifest.webmanifest");

const PWA_SIZES = [48, 72, 96, 128, 192, 256, 512];

async function assertSourceIcon() {
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Ícone fonte não encontrado: ${iconPath}`);
  }

  const meta = await sharp(iconPath).metadata();
  if (meta.width !== 1024 || meta.height !== 1024) {
    throw new Error(
      `assets/icon.png deve ser 1024×1024 (actual: ${meta.width}×${meta.height})`,
    );
  }
}

async function writePng(outPath, size) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(iconPath)
    .resize(size, size, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function writeFaviconIco(outPath) {
  const sizes = [16, 32, 48];
  const pages = await Promise.all(
    sizes.map((size) =>
      sharp(iconPath)
        .resize(size, size, { fit: "cover", kernel: sharp.kernel.lanczos3 })
        .png()
        .toBuffer(),
    ),
  );

  // sharp gera ICO a partir do buffer PNG (usa o maior como base)
  await sharp(pages[pages.length - 1]).toFile(outPath);
}

function writeManifest() {
  const manifest = {
    name: "NutriGestão",
    short_name: "NutriGestão",
    description: "Gestão nutricional para profissionais",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F9F8",
    theme_color: "#0d9488",
    lang: "pt-BR",
    icons: PWA_SIZES.map((size) => ({
      src: `/icons/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: size >= 192 ? "any maskable" : "any",
    })),
  };

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  await assertSourceIcon();

  console.log("\n[web-icons] A gerar a partir de assets/icon.png…\n");

  await writePng(path.join(appDir, "icon.png"), 32);
  console.log("  ✓ app/icon.png (32×32)");

  await writePng(path.join(appDir, "apple-icon.png"), 180);
  console.log("  ✓ app/apple-icon.png (180×180)");

  await writePng(path.join(publicDir, "app-icon.png"), 512);
  console.log("  ✓ public/app-icon.png (512×512)");

  await writeFaviconIco(path.join(publicDir, "favicon.ico"));
  console.log("  ✓ public/favicon.ico");

  for (const size of PWA_SIZES) {
    await writePng(path.join(iconsDir, `icon-${size}.png`), size);
    console.log(`  ✓ public/icons/icon-${size}.png (${size}×${size})`);
  }

  writeManifest();
  console.log("  ✓ public/manifest.webmanifest");

  console.log("\n✅ Ícones web gerados. Reinicie o dev server se estiver a correr.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
