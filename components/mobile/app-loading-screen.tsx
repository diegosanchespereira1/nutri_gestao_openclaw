'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { PageLoadingScreen } from '@/components/ui/page-loading-screen';
import { hideNativeSplashAndConfigureStatusBar } from '@/lib/mobile/native-status-bar';
import { isNativeApp } from '@/lib/mobile/platform';

function subscribeClient(onChange: () => void) {
  onChange();
  return () => {};
}

/**
 * Splash inicial do app — mesmo visual do loading padrão, com fade após hidratação.
 */
export function AppLoadingScreen() {
  const isClient = useSyncExternalStore(
    subscribeClient,
    () => true,
    () => false,
  );
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!isClient) return;

    if (isNativeApp()) {
      void hideNativeSplashAndConfigureStatusBar();
    }

    const showMs = isNativeApp() ? 450 : 1200;
    const fadeMs = isNativeApp() ? 250 : 500;

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), fadeMs);
    }, showMs);

    return () => clearTimeout(timer);
  }, [isClient]);

  if (!isClient || !visible) return null;

  return (
    <PageLoadingScreen
      mode="overlay"
      fading={fading}
      className="z-[9999]"
    />
  );
}
