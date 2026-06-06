import type { CapacitorConfig } from '@capacitor/cli';

/** Para testar no device físico com código local: CAPACITOR_SERVER_URL=http://192.168.x.x:3000 */
const devServerUrl = process.env.CAPACITOR_SERVER_URL;
const productionServerUrl = 'https://nutricao.stratostech.com.br';

const config: CapacitorConfig = {
  // ID único do app — NÃO ALTERAR após publicar nas stores
  appId: 'br.com.nutrigestao.app',
  appName: 'NutriGestão',

  // O app mobile é um WebView que carrega o Next.js hospedado em produção.
  // Alterar a URL abaixo para o domínio real de produção antes do build final.
  webDir: 'public',
  server: devServerUrl
    ? {
        url: devServerUrl,
        cleartext: devServerUrl.startsWith('http://'),
        androidScheme: devServerUrl.startsWith('https') ? 'https' : 'http',
      }
    : {
        url: productionServerUrl,
        cleartext: false,
        androidScheme: 'https',
        allowNavigation: [new URL(productionServerUrl).hostname],
      },

  plugins: {
    SplashScreen: {
      launchShowDuration: 800,   // fallback curto — o JS esconde antes quando possível
      launchAutoHide: true,
      backgroundColor: '#F4F9F8', // mesma cor do loading web — transição suave
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      // Immersive esconde a status bar e, ao terminar, restaura overlay + ícones brancos.
      splashImmersive: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      saveToGallery: false,
    },
    StatusBar: {
      // LIGHT = ícones/texto escuros em fundo claro (Style.Light no plugin).
      style: 'LIGHT',
      backgroundColor: '#F4F9F8',
      overlaysWebView: false,
    },
  },

  ios: {
    // Respeita safe areas (notch, Dynamic Island, barra inferior)
    contentInset: 'automatic',
    backgroundColor: '#F4F9F8',
    // Scheme usado no iOS WebView
    scheme: 'nutrigestao',
    // Permite scroll com inércia nativo
    scrollEnabled: true,
    // Limitar orientações: portrait apenas
    // allowsLinkPreview: false,
  },

  android: {
    backgroundColor: '#F4F9F8',
    // Não permite conteúdo HTTP dentro do app HTTPS
    allowMixedContent: false,
    // Suporte a back button nativo
    captureInput: true,
    // Inspeção remota da WebView via chrome://inspect (DevTools).
    // SEGURANÇA/LGPD: NUNCA pode ir como `true` em builds de release/loja —
    // exporia tokens, requisições e dados de saúde a quem tiver o aparelho.
    // Por isso o padrão é `false`; só liga com opt-in explícito em dev:
    //   CAP_WEBVIEW_DEBUG=true npx cap sync android
    // Builds de release (sem a env) saem sempre com `false`.
    webContentsDebuggingEnabled: process.env.CAP_WEBVIEW_DEBUG === 'true',
  },
};

export default config;
