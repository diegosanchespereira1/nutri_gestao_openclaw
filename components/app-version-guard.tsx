"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  APP_BUILD_SESSION_STORAGE_KEY,
  formatAppBuildLabel,
} from "@/lib/app-build";
import { getClientAppBuildId } from "@/lib/app-build-client";
import { cn } from "@/lib/utils";

const POLL_MS = 5 * 60 * 1000;

async function fetchServerBuildId(): Promise<string | null> {
  try {
    const res = await fetch("/api/app-version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: string };
    return typeof data.buildId === "string" ? data.buildId : null;
  } catch {
    return null;
  }
}

export function AppVersionGuard() {
  const toastShownRef = useRef(false);

  const checkVersion = useCallback(async () => {
    const embedded = getClientAppBuildId();
    const serverId = (await fetchServerBuildId()) ?? embedded;
    const stored = sessionStorage.getItem(APP_BUILD_SESSION_STORAGE_KEY);

    if (!stored) {
      sessionStorage.setItem(APP_BUILD_SESSION_STORAGE_KEY, serverId);
      return;
    }

    if (stored === serverId) return;
    if (toastShownRef.current) return;

    toastShownRef.current = true;
    toast("Atualização disponível", {
      description:
        "Uma nova versão da aplicação foi publicada. Recarregue para ver as alterações.",
      duration: Infinity,
      action: {
        label: "Recarregar",
        onClick: () => {
          sessionStorage.setItem(APP_BUILD_SESSION_STORAGE_KEY, serverId);
          window.location.reload();
        },
      },
      cancel: {
        label: "Depois",
        onClick: () => {
          toastShownRef.current = false;
        },
      },
    });
  }, []);

  useEffect(() => {
    const embedded = getClientAppBuildId();
    const stored = sessionStorage.getItem(APP_BUILD_SESSION_STORAGE_KEY);
    if (!stored) {
      sessionStorage.setItem(APP_BUILD_SESSION_STORAGE_KEY, embedded);
    }

    void checkVersion();

    const interval = window.setInterval(() => {
      void checkVersion();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void checkVersion();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkVersion]);

  return null;
}

export function AppBuildLabel({ className }: { className?: string }) {
  const buildId = getClientAppBuildId();
  const label = formatAppBuildLabel(buildId);

  return (
    <p
      className={cn(
        "text-muted-foreground mt-1 px-3 text-center font-mono text-[10px] tracking-wide",
        className,
      )}
      title={`Versão: ${buildId}`}
    >
      v{label}
    </p>
  );
}
