"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { PageLoadingScreen } from "@/components/ui/page-loading-screen";
import { RouteProgressBar } from "@/components/ui/route-progress-bar";
import { subscribeNavigationCancel, subscribeNavigationStart } from "@/lib/navigation-pending";

type Props = {
  children: React.ReactNode;
};

const SHOW_DELAY_MS = 150;
const MIN_VISIBLE_MS = 350;
const NAVIGATION_TIMEOUT_MS = 45_000;

function isInternalHref(href: string): boolean {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return false;
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      return new URL(href).origin === window.location.origin;
    } catch {
      return false;
    }
  }

  return href.startsWith("/");
}

function isSameRoute(href: string): boolean {
  try {
    const dest = new URL(href, window.location.origin);
    const current = new URL(window.location.href);
    return dest.pathname === current.pathname && dest.search === current.search;
  } catch {
    return false;
  }
}

/**
 * Overlay de navegação na área de conteúdo — logo + pontos enquanto a rota destino carrega.
 * Dispara em cliques em links internos e em `pushWithLoading` / `signalNavigationStart`.
 */
export function AppMainContent({ children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showLoading, setShowLoading] = useState(false);

  const pendingRef = useRef(false);
  const showLoadingRef = useRef(false);
  const shownAtRef = useRef(0);
  // Rastreia o caminho completo (pathname + search) para detectar navegações
  // que só alteram os search params — como a troca de abas com ?tab=…
  const prevRouteRef = useRef(`${pathname}?${searchParams.toString()}`);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const endNavigation = useCallback(() => {
    pendingRef.current = false;
    clearTimeout(showTimerRef.current);
    clearTimeout(navTimeoutRef.current);

    if (!showLoadingRef.current) return;

    const finish = () => {
      showLoadingRef.current = false;
      setShowLoading(false);
    };

    const elapsed = Date.now() - shownAtRef.current;
    if (elapsed < MIN_VISIBLE_MS) {
      hideTimerRef.current = setTimeout(finish, MIN_VISIBLE_MS - elapsed);
    } else {
      finish();
    }
  }, []);

  const beginNavigation = useCallback(() => {
    if (pendingRef.current) return;

    pendingRef.current = true;
    clearTimeout(hideTimerRef.current);
    clearTimeout(showTimerRef.current);
    clearTimeout(navTimeoutRef.current);

    showTimerRef.current = setTimeout(() => {
      if (!pendingRef.current) return;
      shownAtRef.current = Date.now();
      showLoadingRef.current = true;
      setShowLoading(true);
    }, SHOW_DELAY_MS);

    navTimeoutRef.current = setTimeout(endNavigation, NAVIGATION_TIMEOUT_MS);
  }, [endNavigation]);

  useEffect(() => {
    const route = `${pathname}?${searchParams.toString()}`;
    if (prevRouteRef.current !== route) {
      prevRouteRef.current = route;
      endNavigation();
    }
  }, [pathname, searchParams, endNavigation]);

  useEffect(() => subscribeNavigationStart(beginNavigation), [beginNavigation]);
  // Quando o guard do checklist (ou outro interceptor) cancela a navegação,
  // encerra o loading para não deixar o overlay preso indefinidamente.
  useEffect(() => subscribeNavigationCancel(endNavigation), [endNavigation]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element).closest("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !isInternalHref(href)) return;

      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;
      // Download links não causam navegação de rota — ignorar para não ativar o overlay.
      if (anchor.hasAttribute("download")) return;
      if (isSameRoute(href)) return;

      beginNavigation();
    }

    function onPopState() {
      beginNavigation();
    }

    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", onPopState);
      clearTimeout(showTimerRef.current);
      clearTimeout(hideTimerRef.current);
      clearTimeout(navTimeoutRef.current);
    };
  }, [beginNavigation]);

  return (
    <div className="relative min-h-[12rem] w-full">
      {showLoading ? (
        <>
          <RouteProgressBar />
          <PageLoadingScreen mode="content-overlay" />
        </>
      ) : null}
      {children}
    </div>
  );
}
