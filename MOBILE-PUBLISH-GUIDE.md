# 📱 Guia de Publicação Mobile — NutriGestão

> Abordagem: **Capacitor** (WebView apontando para o servidor SSR em produção).
> O Next.js continua rodando no servidor normalmente. O app mobile é uma casca nativa
> que carrega `https://seudominio.com.br` com acesso a recursos nativos (câmera, push, etc.).

---

## ✅ PRÉ-REQUISITOS — Faça isso primeiro

### Contas e licenças
- [ ] **Apple Developer Program** — US$ 99/ano → https://developer.apple.com/programs/enroll/
  - Necessário: Mac com Xcode, Apple ID, CNPJ ou CPF
  - Leva até 2 dias úteis para ativação
- [ ] **Google Play Console** — US$ 25 (taxa única) → https://play.google.com/console
  - Ativação imediata com conta Google

### Ferramentas de desenvolvimento
- [ ] **macOS** com **Xcode 15+** instalado (obrigatório para build iOS)
  - Baixar na Mac App Store
- [ ] **Android Studio** → https://developer.android.com/studio
- [ ] **Node.js 22+** (já em uso no projeto)
- [ ] **CocoaPods** (gerenciador de dependências iOS)
  ```bash
  sudo gem install cocoapods
  ```
- [ ] **Java 17+** para Android
  ```bash
  brew install openjdk@17
  ```

---

## FASE 1 — Instalar e Configurar o Capacitor

### 1.1 Instalar dependências

```bash
cd /caminho/para/nutrigestao

npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android

# Plugins nativos que o app vai precisar
npm install @capacitor/camera
npm install @capacitor/push-notifications
npm install @capacitor/status-bar
npm install @capacitor/splash-screen
npm install @capacitor/app
npm install @capacitor/preferences
```

### 1.2 Criar o arquivo `capacitor.config.ts` na raiz do projeto

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.nutrigestao.app',       // ID único — não pode mudar depois de publicar
  appName: 'NutriGestão',
  webDir: 'public',                       // pasta estática (só para inicializar)
  server: {
    url: 'https://SEU-DOMINIO-PRODUCAO.com.br',  // ← substituir pelo domínio real
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      saveToGallery: false,
    },
  },
  ios: {
    contentInset: 'automatic',           // respeita safe areas (notch)
    backgroundColor: '#ffffff',
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false,
  },
};

export default config;
```

> ⚠️ **IMPORTANTE:** substituir `SEU-DOMINIO-PRODUCAO.com.br` pelo domínio real
> onde o Next.js está hospedado em produção.

### 1.3 Adicionar plataformas

```bash
npx cap add ios
npx cap add android
```

Isso cria as pastas `ios/` e `android/` na raiz do projeto.

### 1.4 Atualizar `.gitignore`

Adicionar ao `.gitignore`:
```
# Capacitor
ios/App/Pods/
android/.gradle/
android/app/build/
```

---

## FASE 2 — Ajustes no Next.js para funcionar no Capacitor

### 2.1 Atualizar Content-Security-Policy para o app mobile

No arquivo `lib/security/content-security-policy.ts`, a CSP precisa permitir o domínio
de produção carregar dentro do WebView.

Verificar se a CSP não bloqueia:
- `frame-ancestors` — não deve bloquear WebViews nativas
- Headers `X-Frame-Options: DENY` — **remover ou condicionar** para requisições do app mobile

### 2.2 Adicionar header `capacitor://` na CSP de produção

O Capacitor usa o scheme `capacitor://` no iOS. Adicionar à CSP em produção:
```
connect-src 'self' https://SEU-DOMINIO.com.br capacitor://localhost
```

### 2.3 Criar rota de detecção do app mobile (opcional mas recomendado)

Criar `app/api/app-version/route.ts` para o app mobile verificar se está desatualizado:
```typescript
export async function GET() {
  return Response.json({
    minVersion: '1.0.0',
    currentVersion: '1.0.0',
    forceUpdate: false,
  });
}
```

### 2.4 Ajustar viewport para mobile nativo

No `app/layout.tsx`, verificar se o viewport está correto:
```tsx
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,        // evita zoom acidental
  viewportFit: 'cover',   // ← importante para safe-area no iPhone
};
```

---

## FASE 3 — Ícones e Splash Screen

### 3.1 Preparar os assets

Você precisará de um ícone **1024×1024px** PNG sem transparência (fundo sólido).

Instalar o gerador automático de ícones:
```bash
npm install --save-dev @capacitor/assets
```

Criar a pasta e colocar os arquivos:
```
assets/
  icon.png          # 1024×1024px — ícone do app
  icon-foreground.png  # 512×512px — ícone adaptativo Android (foreground)
  icon-background.png  # 512×512px — fundo do ícone adaptativo Android
  splash.png        # 2732×2732px — tela de splash
```

Gerar todos os tamanhos automaticamente:
```bash
npx capacitor-assets generate
```

---

## FASE 4 — Build e Configuração iOS

### 4.1 Sincronizar o Capacitor com o projeto nativo

```bash
# Sempre rodar antes de abrir Xcode ou Android Studio
npx cap sync
```

### 4.2 Abrir no Xcode

```bash
npx cap open ios
```

### 4.3 Configurações obrigatórias no Xcode

No painel **Signing & Capabilities** do Xcode (`ios/App/App.xcworkspace`):

- [ ] **Team**: selecionar sua conta Apple Developer
- [ ] **Bundle Identifier**: confirmar `br.com.nutrigestao.app`
- [ ] **Deployment Target**: iOS 16.0 mínimo
- [ ] Marcar **Automatically manage signing** (recomendado para começar)

### 4.4 Permissões de câmera (obrigatório para aprovação da App Store)

No arquivo `ios/App/App/Info.plist`, adicionar:
```xml
<key>NSCameraUsageDescription</key>
<string>O NutriGestão usa a câmera para registrar fotos nas visitas e checklists de auditoria.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>O NutriGestão acessa a galeria para anexar fotos às visitas e checklists.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>O NutriGestão salva fotos das visitas na sua galeria.</string>
```

> ⚠️ A Apple rejeita apps que não expliquem claramente o motivo de cada permissão.

### 4.5 Testar no simulador e dispositivo físico

```bash
# Simulador
npx cap run ios

# Dispositivo físico (conectar iPhone por USB)
npx cap run ios --target=<device-id>
```

### 4.6 Criar Archive para envio à App Store

No Xcode:
1. Menu **Product → Archive**
2. Aguardar o build (pode demorar 5–15 minutos)
3. Na janela **Organizer**, clicar em **Distribute App**
4. Escolher **App Store Connect**
5. Seguir o wizard → Upload

---

## FASE 5 — Build e Configuração Android

### 5.1 Abrir no Android Studio

```bash
npx cap open android
```

### 5.2 Gerar o Keystore (GUARDAR COM VIDA — não pode perder!)

```bash
keytool -genkey -v \
  -keystore nutrigestao-release.keystore \
  -alias nutrigestao \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

> 🔴 **CRÍTICO:** guardar o arquivo `.keystore` e as senhas em local seguro (ex: 1Password, Bitwarden).
> Perder o keystore = **não conseguir mais atualizar o app no Google Play**. Nunca commitar no Git.

Adicionar ao `.gitignore`:
```
*.keystore
*.jks
```

### 5.3 Configurar assinatura no `android/app/build.gradle`

```groovy
android {
    signingConfigs {
        release {
            storeFile file('../nutrigestao-release.keystore')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias 'nutrigestao'
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 5.4 Permissões de câmera no Android

No arquivo `android/app/src/main/AndroidManifest.xml`, verificar se existem:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="29" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 5.5 Gerar AAB (Android App Bundle) para o Google Play

No Android Studio:
1. Menu **Build → Generate Signed Bundle / APK**
2. Escolher **Android App Bundle**
3. Informar o keystore e senhas
4. Variant: **release**
5. O arquivo `.aab` será gerado em `android/app/release/`

---

## FASE 6 — Publicação na App Store (Apple)

### 6.1 Criar o app no App Store Connect

Acessar https://appstoreconnect.apple.com → **My Apps → (+) New App**

- [ ] **Platform**: iOS
- [ ] **Name**: NutriGestão
- [ ] **Primary Language**: Portuguese (Brazil)
- [ ] **Bundle ID**: `br.com.nutrigestao.app`
- [ ] **SKU**: `nutrigestao-ios-1` (código interno, qualquer string)

### 6.2 Preencher informações do listing

- [ ] **Descrição** (PT-BR, máx 4.000 caracteres)
- [ ] **Palavras-chave** (máx 100 caracteres): `nutrição, dietista, auditoria, checklist, visita, HACCP`
- [ ] **URL de Suporte**: `https://seudominio.com.br/suporte`
- [ ] **URL de Política de Privacidade**: `https://seudominio.com.br/privacidade` ← OBRIGATÓRIO
- [ ] **Categoria principal**: Business ou Medical
- [ ] **Classificação etária**: 4+

### 6.3 Screenshots obrigatórias

Você precisará de screenshots nos seguintes tamanhos:
- **6.9" Display** (iPhone 16 Pro Max): 1320×2868px — obrigatório
- **6.5" Display** (iPhone 14 Plus): 1284×2778px — obrigatório
- **iPad Pro 13"**: 2064×2752px — se quiser suporte a iPad

Dica: tirar screenshots direto no Simulador do Xcode com os tamanhos certos.

### 6.4 Enviar para review

- [ ] Selecionar o build enviado via Xcode (Fase 4.6)
- [ ] Preencher informações de **Content Rights** e **Advertising Identifier**
- [ ] Clicar em **Submit for Review**

> ⏱️ Review da Apple: normalmente 1–3 dias úteis. Apps com dados de saúde podem levar mais.

---

## FASE 7 — Publicação no Google Play

### 7.1 Criar o app no Play Console

Acessar https://play.google.com/console → **Create app**

- [ ] **App name**: NutriGestão
- [ ] **Default language**: Portuguese (Brazil)
- [ ] **App or game**: App
- [ ] **Free or paid**: Free (ou Paid)

### 7.2 Preencher informações do listing

- [ ] **Descrição curta** (máx 80 caracteres)
- [ ] **Descrição completa** (máx 4.000 caracteres)
- [ ] **Ícone**: 512×512px PNG
- [ ] **Feature graphic**: 1024×500px (banner no topo da página)
- [ ] **Screenshots**: mínimo 2, recomendado 4–8 (1080×1920px portrait)
- [ ] **Categoria**: Business ou Medical
- [ ] **Política de privacidade**: URL obrigatória

### 7.3 Configurar Data Safety (obrigatório desde 2022)

No Play Console → **Policy → Data safety**:

Declarar quais dados o app coleta. Para o NutriGestão:
- [ ] Dados pessoais (nome, email) — coletado, enviado ao servidor
- [ ] Fotos — coletado opcionalmente, enviado ao servidor
- [ ] Dados de saúde — coletado (pacientes, avaliações nutricionais)

> ⚠️ Dados de saúde exigem declaração especial. Preencher com cuidado.

### 7.4 Fazer upload do AAB

- [ ] Play Console → **Release → Production → Create new release**
- [ ] Upload do `.aab` gerado na Fase 5.5
- [ ] Preencher **Release notes** (o que há de novo)
- [ ] Clicar em **Review release → Start rollout**

> ⏱️ Review do Google: normalmente algumas horas a 2 dias úteis.

---

## FASE 8 — Política de Privacidade (OBRIGATÓRIA para ambas as stores)

Criar uma página pública em `https://seudominio.com.br/privacidade` com:

- [ ] Quais dados são coletados (nome, email, dados de pacientes, fotos)
- [ ] Como são usados (prestação do serviço)
- [ ] Como são armazenados (Supabase, Brasil/EUA)
- [ ] Direitos do titular (acesso, correção, exclusão — LGPD)
- [ ] Contato do DPO / responsável
- [ ] Data de última atualização

---

## CHECKLIST FINAL — Antes de submeter

### iOS
- [ ] Bundle ID correto: `br.com.nutrigestao.app`
- [ ] Ícone 1024×1024px sem transparência
- [ ] Screenshots nos tamanhos obrigatórios
- [ ] Permissões de câmera com descrições em PT-BR no Info.plist
- [ ] Versão no Xcode: 1.0.0 (build 1)
- [ ] Política de privacidade publicada e com URL válida
- [ ] Testado em dispositivo físico iOS 16+
- [ ] Upload feito via Xcode → App Store Connect

### Android
- [ ] Keystore salvo em local seguro (fora do Git)
- [ ] Bundle ID correto: `br.com.nutrigestao.app`
- [ ] Ícone adaptativo configurado
- [ ] Screenshots mínimas (2) enviadas
- [ ] Data Safety preenchido no Play Console
- [ ] Política de privacidade publicada
- [ ] AAB assinado com keystore de release
- [ ] Testado em dispositivo físico Android 10+
- [ ] Upload do `.aab` no Play Console

---

## 🔄 FLUXO DE ATUALIZAÇÃO (após publicação)

```
1. Fazer mudanças no código Next.js
2. Deploy no servidor (Vercel, Railway, etc.)
3. npx cap sync  ← só se mudou plugins nativos ou config
4. Incrementar versão:
   - iOS: no Xcode, campo "Version" e "Build"
   - Android: em android/app/build.gradle, campos versionName e versionCode
5. Gerar novo build (Archive no Xcode / AAB no Android Studio)
6. Upload nas stores → submit for review
```

> 💡 **Dica:** Se apenas o código web mudou (sem alterações nativas),
> não é necessário submeter nova versão às stores — o WebView já carrega
> o código atualizado do servidor automaticamente.

---

## 📞 SUPORTE E LINKS ÚTEIS

| Recurso | Link |
|---|---|
| Documentação Capacitor | https://capacitorjs.com/docs |
| App Store Connect | https://appstoreconnect.apple.com |
| Google Play Console | https://play.google.com/console |
| Apple Developer | https://developer.apple.com |
| Capacitor Camera Plugin | https://capacitorjs.com/docs/apis/camera |
| Capacitor Push Notifications | https://capacitorjs.com/docs/apis/push-notifications |
| Gerador de assets | https://github.com/ionic-team/capacitor-assets |
