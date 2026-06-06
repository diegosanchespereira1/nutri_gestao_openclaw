'use client';

import { ANDROID_STATUS_BAR_FALLBACK_PX } from '@/lib/mobile/safe-area-insets';
import { getNativePlatform, isNativeApp } from '@/lib/mobile/platform';

/** Android WebView/Capacitor — inclui fase antes do bridge injetar `window.Capacitor`. */
function isAndroidNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNativeApp() && getNativePlatform() === 'android') return true;
  return /Android/i.test(navigator.userAgent) && /; wv\)/.test(navigator.userAgent);
}

/**
 * Espaçador fixo no layout React — não depende de classes no <html> nem de padding
 * no WebView (que o SplashScreen/StatusBar do Capacitor costuma resetar ao carregar).
 */
export function AndroidTopInset({ className }: { className?: string }) {
  if (!isAndroidNativeShell()) return null;

  return (
    <div
      aria-hidden
      className={className ?? 'shrink-0'}
      style={{
        height: `${ANDROID_STATUS_BAR_FALLBACK_PX}px`,
        minHeight: `${ANDROID_STATUS_BAR_FALLBACK_PX}px`,
        flexShrink: 0,
      }}
    />
  );
}
