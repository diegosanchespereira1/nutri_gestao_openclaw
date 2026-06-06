import { getNativePlatform } from '@/lib/mobile/platform';

/** Fallback Android quando env(safe-area-*) e getInfo() retornam 0 (edge-to-edge). */
export const ANDROID_STATUS_BAR_FALLBACK_PX = 28;

const NATIVE_SAFE_AREA_STYLE_ID = 'nutrigestao-native-safe-area';

/**
 * Persiste insets num <style> no <head> — a hidratação do React sobrescreve
 * html.style e html.className, apagando variáveis/classes definidas pelo bootstrap.
 */
export function persistNativeSafeAreaStyle(heightPx: number): void {
  if (heightPx <= 0 || typeof document === 'undefined') return;

  let el = document.getElementById(NATIVE_SAFE_AREA_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = NATIVE_SAFE_AREA_STYLE_ID;
    document.head.appendChild(el);
  }

  el.textContent = `:root{--status-bar-height:${heightPx}px;}
html[data-ng-platform="android"],html.native-android{--safe-area-top:max(env(safe-area-inset-top,0px),var(--status-bar-height,0px),${ANDROID_STATUS_BAR_FALLBACK_PX}px);}`;
}

export function applyNativePlatformClasses(): void {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.add('native-app');

  const platform = getNativePlatform();
  if (platform === 'android') {
    document.documentElement.classList.add('native-android');
    document.documentElement.setAttribute('data-ng-platform', 'android');
    ensureStatusBarHeight(ANDROID_STATUS_BAR_FALLBACK_PX);
  } else if (platform === 'ios') {
    document.documentElement.classList.add('native-ios');
  }
}

/** Mantém o maior valor conhecido — evita “piscar” ao atualizar insets. */
export function ensureStatusBarHeight(heightPx: number): void {
  if (heightPx <= 0 || typeof document === 'undefined') return;

  const current = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--status-bar-height') || '0',
  );

  const next = !Number.isFinite(current) || heightPx > current ? heightPx : current;
  persistNativeSafeAreaStyle(next);
}

/** Reaplica classes + insets após a hidratação do React limpar o <html>. */
export function restoreNativeSafeAreaAfterHydration(): void {
  if (typeof document === 'undefined') return;

  const isAndroidWebView =
    /Android/i.test(navigator.userAgent) && /; wv\)/.test(navigator.userAgent);
  const isCapacitorNative =
    !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform?.();

  if (!isCapacitorNative && !isAndroidWebView) return;

  applyNativePlatformClasses();

  if (isAndroidWebView || getNativePlatform() === 'android') {
    document.documentElement.setAttribute('data-ng-platform', 'android');
    ensureStatusBarHeight(ANDROID_STATUS_BAR_FALLBACK_PX);
  }
}

/** Mede env(safe-area-inset-top) via elemento temporário. */
export function measureEnvSafeAreaTop(): number {
  if (typeof document === 'undefined') return 0;

  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
  document.documentElement.appendChild(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height;
}

/** Sincroniza --status-bar-height a partir do plugin + fallbacks. */
export async function syncNativeSafeAreaInsets(
  statusBar?: {
    getInfo: () => Promise<{ height: number }>;
  },
): Promise<void> {
  restoreNativeSafeAreaAfterHydration();

  const envTop = measureEnvSafeAreaTop();
  if (envTop > 0) ensureStatusBarHeight(envTop);

  if (statusBar) {
    try {
      const info = await statusBar.getInfo();
      if (info.height > 0) ensureStatusBarHeight(info.height);
    } catch {
      // getInfo opcional
    }
  }

  if (getNativePlatform() === 'android') {
    ensureStatusBarHeight(ANDROID_STATUS_BAR_FALLBACK_PX);
  }
}
