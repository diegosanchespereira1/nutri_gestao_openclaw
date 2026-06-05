'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { PageLoadingScreen } from '@/components/ui/page-loading-screen';

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
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 500);
    }, 1200);
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
