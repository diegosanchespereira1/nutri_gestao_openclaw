'use client';

import { useEffect } from 'react';

import { isNativeApp } from '@/lib/mobile/platform';

const STATUS_BAR_BG = '#F4F9F8';

/**
 * Configura a barra de status nativa (ícones escuros + fundo claro) e expõe
 * a altura para o CSS via --status-bar-height (Android quando safe-area = 0).
 */
export function CapacitorStatusBar() {
  useEffect(() => {
    if (!isNativeApp()) return;

    document.documentElement.classList.add('native-app');

    async function setup() {
      const { Animation, StatusBar, Style } = await import('@capacitor/status-bar');

      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {
        // Android 15+: API removida — usa safe-area / --status-bar-height no CSS.
      }

      try {
        await StatusBar.setBackgroundColor({ color: STATUS_BAR_BG });
      } catch {
        // Android 15+: cor controlada pelo sistema; ícones via setStyle.
      }

      // Style.Light = texto/ícones escuros em fundo claro (não confundir com Style.Dark).
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.show({ animation: Animation.None });

      try {
        const info = await StatusBar.getInfo();
        if (info.height > 0) {
          document.documentElement.style.setProperty(
            '--status-bar-height',
            `${info.height}px`,
          );
        }
      } catch {
        // getInfo opcional
      }
    }

    void setup();
  }, []);

  return null;
}
