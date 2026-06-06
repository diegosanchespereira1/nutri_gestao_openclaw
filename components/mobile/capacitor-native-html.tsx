'use client';

import { useLayoutEffect } from 'react';

import { restoreNativeSafeAreaAfterHydration } from '@/lib/mobile/safe-area-insets';
import { getNativePlatform, isNativeApp } from '@/lib/mobile/platform';

const PLATFORM_ATTR = 'data-ng-platform';

/**
 * Restaura safe-area no <html> após hidratação e observa mutações do React
 * que removem native-android / data-ng-platform.
 */
export function CapacitorNativeHtml() {
  useLayoutEffect(() => {
    const restore = () => {
      restoreNativeSafeAreaAfterHydration();
      if (getNativePlatform() === 'android') {
        document.documentElement.setAttribute(PLATFORM_ATTR, 'android');
      } else if (isNativeApp()) {
        document.documentElement.setAttribute(PLATFORM_ATTR, 'ios');
      }
    };

    restore();

    const observer = new MutationObserver(() => {
      const html = document.documentElement;
      const needsAndroid =
        getNativePlatform() === 'android' &&
        (!html.classList.contains('native-android') ||
          html.getAttribute(PLATFORM_ATTR) !== 'android');
      const needsIos =
        getNativePlatform() === 'ios' &&
        (!html.classList.contains('native-ios') ||
          html.getAttribute(PLATFORM_ATTR) !== 'ios');

      if (needsAndroid || needsIos) restore();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    // Android: plugins Capacitor resetam <html> durante o carregamento — manter observer.
    let stop: number | undefined;
    if (getNativePlatform() !== 'android') {
      stop = window.setTimeout(() => observer.disconnect(), 30_000);
    }

    return () => {
      observer.disconnect();
      if (stop !== undefined) window.clearTimeout(stop);
    };
  }, []);

  return null;
}
