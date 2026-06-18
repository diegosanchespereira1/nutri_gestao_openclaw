# Assets Mobile — NutriGestão

Esta pasta contém os arquivos de origem para geração automática de ícones e
splash screens para iOS e Android.

## Arquivos necessários (você precisa criar/fornecer)

| Arquivo | Tamanho | Uso |
|---|---|---|
| `icon.png` | **1024×1024px** | Ícone principal (iOS + Android) — fundo sólido, SEM transparência |
| `icon-foreground.png` | **1024×1024px** | Ícone adaptativo Android — apenas o símbolo, fundo transparente |
| `icon-background.png` | **1024×1024px** | Fundo do ícone adaptativo Android — cor sólida ou textura |
| `splash.png` | **2732×2732px** | Tela de splash (centralizado, o logo ocupa ~400px no centro) |
| `splash-dark.png` | **2732×2732px** | Splash para modo escuro (opcional) |

## Como gerar todos os tamanhos automaticamente

Após colocar os arquivos acima nesta pasta, rodar:

```bash
npx capacitor-assets generate
```

Isso gera automaticamente todos os tamanhos para:
- iOS: `ios/App/App/Assets.xcassets/`
- Android: `android/app/src/main/res/`

## Especificações do ícone

- **Formato:** PNG
- **Fundo:** sólido (sem transparência no `icon.png` — a App Store rejeita ícones com transparência)
- **Safe zone:** manter o logo dentro dos 80% centrais para não ser cortado pelo arredondamento do iOS
- **Cor de fundo sugerida:** `#0d9488` (primary teal do NutriGestão)

## Especificações do splash

- **Formato:** PNG
- **Tamanho:** 2732×2732px (cobre todos os dispositivos)
- **Logo:** centralizado, ~400×400px
- **Fundo:** `#ffffff` (branco) ou a cor de fundo do app

## Screenshots para as stores

Gerados automaticamente — ver `assets/store-listing/README.md`.

```bash
# Ícones + feature graphic (Google Play)
npm run mobile:store-assets

# Capturas de ecrã (requer npm run dev + E2E_EMAIL/E2E_PASSWORD em .env.test)
npm run mobile:store-screenshots
```

### Tamanhos exigidos

### App Store (iOS)
| Dispositivo | Tamanho |
|---|---|
| iPhone 6.9" (16 Pro Max) — **obrigatório** | 1320×2868px |
| iPhone 6.5" (14 Plus) — **obrigatório** | 1284×2778px |
| iPad Pro 13" — opcional | 2064×2752px |

### Google Play (Android)
| Tipo | Tamanho |
|---|---|
| Screenshots portrait — **mínimo 2** | 1080×1920px |
| Feature Graphic (banner) | 1024×500px |
| Ícone alto nível | 512×512px |

**Dica:** tirar screenshots direto no Simulador do Xcode e no Emulador do Android Studio
com os tamanhos configurados corretamente.
