import { isNativeApp, getNativePlatform } from '@/lib/mobile/platform';
import { syncNativeSafeAreaInsets } from '@/lib/mobile/safe-area-insets';

/** Mesma cor do capacitor.config.ts / globals.css */
export const STATUS_BAR_BG = '#F4F9F8';

/** Reaplica a barra após o splash nativo (iOS costuma resetar overlay/estilo). */
export const NATIVE_SPLASH_DURATION_MS = 1200;

/**
 * Android 15+ edge-to-edge: chamadas ao plugin StatusBar (show, setStyle, overlay)
 * costumam fazer o inset “sumir” após o carregamento da página. No Android só
 * sincronizamos CSS; ícones escuros vêm do tema nativo (styles.xml).
 */
export async function configureNativeStatusBar(): Promise<void> {
  if (!isNativeApp()) return;

  if (getNativePlatform() === 'android') {
    await syncNativeSafeAreaInsets();
    return;
  }

  const { Animation, StatusBar, Style } = await import('@capacitor/status-bar');

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    // versões antigas
  }

  try {
    await StatusBar.setBackgroundColor({ color: STATUS_BAR_BG });
  } catch {
    // opcional
  }

  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.show({ animation: Animation.None });

  await syncNativeSafeAreaInsets(StatusBar);
}

/** Esconde o splash nativo e reaplica a barra — chamado após o loading web. */
export async function hideNativeSplashAndConfigureStatusBar(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    // Splash já oculto ou plugin indisponível
  }

  await configureNativeStatusBar();
}
