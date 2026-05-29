"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  APP_VERSION_SESSION_STORAGE_KEY,
  formatAppVersionLabel,
  formatAppVersionTitle,
} from "@/lib/app-version";
import { getClientAppVersion } from "@/lib/app-version-client";
import { cn } from "@/lib/utils";

const POLL_MS = 5 * 60 * 1000;

async function fetchServerAppVersion(): Promise<string | null> {
  try {
    const res = await fetch("/api/app-version", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string; buildId?: string };
    return typeof data.version === "string"
      ? data.version
      : typeof data.buildId === "string"
        ? data.buildId
        : null;
  } catch {
    return null;
  }
}

export function AppVersionGuard() {
  const toastShownRef = useRef(false);

  const checkVersion = useCallback(async () => {
    const embedded = getClientAppVersion();
    const serverVersion = (await fetchServerAppVersion()) ?? embedded;
    const stored = sessionStorage.getItem(APP_VERSION_SESSION_STORAGE_KEY);

    if (!stored) {
      sessionStorage.setItem(APP_VERSION_SESSION_STORAGE_KEY, serverVersion);
      return;
    }

    if (stored === serverVersion) return;
    if (toastShownRef.current) return;

    toastShownRef.current = true;
    toast("Atualização disponível", {
      description: `Nova versão ${formatAppVersionTitle(serverVersion)}. Recarregue para continuar.`,
      duration: Infinity,
      action: {
        label: "Recarregar",
        onClick: () => {
          sessionStorage.setItem(APP_VERSION_SESSION_STORAGE_KEY, serverVersion);
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
    const embedded = getClientAppVersion();
    const stored = sessionStorage.getItem(APP_VERSION_SESSION_STORAGE_KEY);
    if (!stored) {
      sessionStorage.setItem(APP_VERSION_SESSION_STORAGE_KEY, embedded);
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
  const version = getClientAppVersion();
  const label = formatAppVersionLabel(version);

  return (
    <p
      className={cn(
        "text-muted-foreground mt-1 px-3 text-center font-mono text-[10px] tracking-wide",
        className,
      )}
      title={formatAppVersionTitle(version)}
    >
      {label}
    </p>
  );
}
