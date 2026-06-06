'use client';

import { useEffect } from 'react';

import {
  configureNativeStatusBar,
  hideNativeSplashAndConfigureStatusBar,
  NATIVE_SPLASH_DURATION_MS,
} from '@/lib/mobile/native-status-bar';
import { getNativePlatform, isNativeApp } from '@/lib/mobile/platform';

/**
 * Configura a barra de status nativa na abertura e reaplica após o splash
 * nativo (immersive) esconder — momento em que iOS/Android costumam resetar
 * overlay + cor dos ícones para branco.
 */
export function CapacitorStatusBar() {
  useEffect(() => {
    if (!isNativeApp()) return;

    if (getNativePlatform() === 'android') {
      void hideNativeSplashAndConfigureStatusBar();
    } else {
      void configureNativeStatusBar();
    }

    // iOS: fallback após splash nativo
    const afterSplash =
      getNativePlatform() === 'ios'
        ? window.setTimeout(() => {
            void hideNativeSplashAndConfigureStatusBar();
          }, NATIVE_SPLASH_DURATION_MS)
        : undefined;

    // iOS: splash pode resetar overlay — Android usa só CSS (evita “sumir” o inset)
    const afterSplashRetry =
      getNativePlatform() === 'ios'
        ? window.setTimeout(() => {
            void configureNativeStatusBar();
          }, NATIVE_SPLASH_DURATION_MS + 800)
        : undefined;

    let removeAppListener: (() => void) | undefined;

    if (getNativePlatform() === 'ios') {
      void import('@capacitor/app').then(({ App }) => {
        void App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void configureNativeStatusBar();
        }).then((handle) => {
          removeAppListener = () => void handle.remove();
        });
      });
    }

    return () => {
      if (afterSplash !== undefined) window.clearTimeout(afterSplash);
      if (afterSplashRetry !== undefined) window.clearTimeout(afterSplashRetry);
      removeAppListener?.();
    };
  }, []);

  return null;
}
