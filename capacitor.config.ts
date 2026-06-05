import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ID único do app — NÃO ALTERAR após publicar nas stores
  appId: 'br.com.nutrigestao.app',
  appName: 'NutriGestão',

  // O app mobile é um WebView que carrega o Next.js hospedado em produção.
  // Alterar a URL abaixo para o domínio real de produção antes do build final.
  webDir: 'public',
  server: {
    url: 'https://nutricao.stratostech.com.br',
    cleartext: false,
    androidScheme: 'https',
    // Domínios que podem navegar dentro do WebView sem abrir o browser externo
    allowNavigation: [
      'nutricao.stratostech.com.br',
    ],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,  // Tempo suficiente para o WebView carregar a página
      launchAutoHide: true,
      backgroundColor: '#F4F9F8', // mesma cor do loading web — transição suave
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      saveToGallery: false,
    },
    StatusBar: {
      style: 'Default',
      backgroundColor: '#ffffff',
    },
  },

  ios: {
    // Respeita safe areas (notch, Dynamic Island, barra inferior)
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    // Scheme usado no iOS WebView
    scheme: 'nutrigestao',
    // Permite scroll com inércia nativo
    scrollEnabled: true,
    // Limitar orientações: portrait apenas
    // allowsLinkPreview: false,
  },

  android: {
    backgroundColor: '#ffffff',
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
