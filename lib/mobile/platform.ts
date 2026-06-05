'use client';

/**
 * Detecta se o app está rodando dentro do shell nativo do Capacitor
 * (iOS ou Android) ou no browser web normal.
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();
}

export function getNativePlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const platform = cap?.getPlatform?.();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}
