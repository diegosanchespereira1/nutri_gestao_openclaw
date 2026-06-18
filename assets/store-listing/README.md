# Imagens para as lojas — NutriGestão

Gerado automaticamente. Revisar textos e capturas antes de publicar.

## Google Play

| Ficheiro | Uso na consola |
|----------|----------------|
| `google-play/icon-512.png` | Ícone da loja (512×512) |
| `google-play/feature-graphic-1024x500.png` | Feature graphic (banner) |
| `google-play/screenshots/*.png` | Capturas portrait (1080×1920) — ver `npm run mobile:store-screenshots` |

## App Store (iOS)

| Ficheiro | Uso |
|----------|-----|
| `app-store/icon-1024.png` | Marketing icon (1024×1024, sem transparência) |
| `app-store/screenshots-iphone-6.5/*.png` | iPhone 6.5" (1284×2778) |
| `app-store/screenshots-iphone-6.9/*.png` | iPhone 6.9" (1320×2868) |

## Comandos

```bash
# Ícones + feature graphic
npm run mobile:store-assets

# Screenshots das telas (requer E2E_EMAIL/E2E_PASSWORD em .env.test)
# Produção: E2E_BASE_URL=https://nutricao.stratostech.com.br npm run mobile:store-screenshots
npm run mobile:store-screenshots
```

## Regenerar ícones nativos (Android/iOS no app)

```bash
npm run mobile:assets
```
