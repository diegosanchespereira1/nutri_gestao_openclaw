"use client";

import { useEffect } from "react";

import { useSessionKeepAlive, refreshSessionIfNeeded } from "@/hooks/use-session-keep-alive";
import { persistNativeClientCookie } from "@/lib/mobile/persist-native-client-cookie";
import { isNativeApp } from "@/lib/mobile/platform";

/**
 * Sessão persistente no app nativo (iOS/Android):
 * - Marca o dispositivo para o middleware não aplicar timeout curto de inactividade.
 * - Renova o JWT ao retomar o app (Capacitor suspende timers em background).
 */
export function NativeSessionKeepAlive() {
  useSessionKeepAlive();

  useEffect(() => {
    if (!isNativeApp()) return;

    persistNativeClientCookie();

    let removeAppListener: (() => void) | undefined;

    void import("@capacitor/app").then(({ App }) => {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          persistNativeClientCookie();
          void refreshSessionIfNeeded(true);
        }
      }).then((handle) => {
        removeAppListener = () => void handle.remove();
      });
    });

    return () => {
      removeAppListener?.();
    };
  }, []);

  return null;
}
