#!/usr/bin/env node
/**
 * Gera imagens estáticas para Google Play e App Store a partir de assets/icon.png.
 *
 * Saída: assets/store-listing/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { prepareAppIcons } from "./prepare-app-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const iconPath = path.join(root, "assets/icon.png");
const outRoot = path.join(root, "assets/store-listing");
const googlePlayDir = path.join(outRoot, "google-play");
const appStoreDir = path.join(outRoot, "app-store");

const BRAND = {
  bg: "#F4F9F8",
  ink: "#0f172a",
  muted: "#475569",
  accent: "#0d9488",
};

async function ensureDirs() {
  for (const dir of [
    outRoot,
    googlePlayDir,
    appStoreDir,
    path.join(googlePlayDir, "screenshots"),
    path.join(appStoreDir, "screenshots-iphone-6.5"),
    path.join(appStoreDir, "screenshots-iphone-6.9"),
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function writeIconVariants() {
  const icon = sharp(iconPath);

  // icon-512 é gerado por prepare-app-icons (Play Store + launcher Android)
  await icon.clone().resize(1024, 1024).png().toFile(path.join(appStoreDir, "icon-1024.png"));
  await icon.clone().resize(1024, 1024).png().toFile(path.join(googlePlayDir, "icon-1024-marketing.png"));
}

async function writeFeatureGraphic() {
  const iconBuffer = await sharp(iconPath).resize(280, 280).png().toBuffer();

  const svg = `
<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BRAND.bg}"/>
      <stop offset="100%" style="stop-color:#E6F4F1"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <rect x="0" y="496" width="1024" height="4" fill="${BRAND.accent}"/>
  <text x="340" y="210" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="700" fill="${BRAND.ink}">NutriGestão</text>
  <text x="340" y="260" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="${BRAND.muted}">Gestão nutricional para profissionais</text>
  <text x="340" y="310" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="${BRAND.accent}">Fichas técnicas · Checklists · Avaliações</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .composite([{ input: iconBuffer, left: 40, top: 110 }])
    .png()
    .toFile(path.join(googlePlayDir, "feature-graphic-1024x500.png"));
}

async function writeReadme() {
  const readme = `# Imagens para as lojas — NutriGestão

Gerado automaticamente. Revisar textos e capturas antes de publicar.

## Google Play

| Ficheiro | Uso na consola |
|----------|----------------|
| \`google-play/icon-512.png\` | Ícone da loja (512×512) — **mesma imagem** que o launcher no telemóvel |
| \`google-play/feature-graphic-1024x500.png\` | Feature graphic (banner) |
| \`google-play/screenshots/*.png\` | Capturas portrait (1080×1920) — ver \`npm run mobile:store-screenshots\` |

## App Store (iOS)

| Ficheiro | Uso |
|----------|-----|
| \`app-store/icon-1024.png\` | Marketing icon (1024×1024, sem transparência) |
| \`app-store/screenshots-iphone-6.5/*.png\` | iPhone 6.5" (1284×2778) |
| \`app-store/screenshots-iphone-6.9/*.png\` | iPhone 6.9" (1320×2868) |

## Comandos

\`\`\`bash
# Ícones + feature graphic
npm run mobile:store-assets

# Screenshots das telas (requer E2E_EMAIL/E2E_PASSWORD em .env.test)
# Produção: E2E_BASE_URL=https://nutricao.stratostech.com.br npm run mobile:store-screenshots
npm run mobile:store-screenshots
\`\`\`

## Ícone da loja = ícone instalado

Ambos vêm de \`assets/icon.png\` (1024×1024):

\`\`\`bash
npm run mobile:icons
\`\`\`

Gera \`icon-512.png\` (Play Console) e \`mipmap/ic_launcher*\` (AAB). Depois:

\`\`\`bash
npm run mobile:android:bundle
\`\`\`
`;
  fs.writeFileSync(path.join(outRoot, "README.md"), readme);
}

async function main() {
  if (!fs.existsSync(iconPath)) {
    console.error(`Ícone não encontrado: ${iconPath}`);
    process.exit(1);
  }

  await ensureDirs();
  await prepareAppIcons();
  await writeIconVariants();
  await writeFeatureGraphic();
  await writeReadme();

  console.log("\n✅ Imagens estáticas geradas em assets/store-listing/\n");
  console.log("  google-play/icon-512.png");
  console.log("  google-play/feature-graphic-1024x500.png");
  console.log("  app-store/icon-1024.png");
  console.log("\nPróximo passo: npm run mobile:store-screenshots\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
