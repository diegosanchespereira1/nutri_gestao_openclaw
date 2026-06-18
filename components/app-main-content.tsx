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
 * Lista com paginação (?page=): mesmo pathname, só muda a página.
 * Evita overlay pesado — a tabela já tem Suspense com skeleton próprio.
 */
function isListPaginationOnly(href: string): boolean {
  try {
    const dest = new URL(href, window.location.origin);
    const current = new URL(window.location.href);
    if (dest.pathname !== current.pathname) return false;

    const destParams = new URLSearchParams(dest.search);
    const curParams = new URLSearchParams(current.search);
    if (destParams.get("page") === curParams.get("page")) return false;

    destParams.delete("page");
    curParams.delete("page");
    return destParams.toString() === curParams.toString();
  } catch {
    return false;
  }
}

/** Rotas com `loading.tsx` — evita overlay duplo (logo NutriGestão + skeleton da rota). */
function hasRouteLoadingSkeleton(pathname: string): boolean {
  return (
    pathname === "/checklists" ||
    pathname === "/clientes" ||
    pathname === "/pacientes" ||
    pathname === "/visitas"
  );
}

/**
 * Edição de cliente: mesmo pathname (`/clientes/:id/editar`), só mudam query params
 * (`tab`, `formTab`, filtros de checklists, etc.). Não deve mostrar o overlay com logo
 * — é percepção de "app avariado" sem ganho real (RSC já faz streaming na zona da aba).
 */
function isClientEditShellOnlyQueryChange(href: string): boolean {
  try {
    const dest = new URL(href, window.location.origin);
    const current = new URL(window.location.href);
    return (
      dest.pathname === current.pathname &&
      /^\/clientes\/[^/]+\/editar$/.test(dest.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Overlay de navegação na área de conteúdo — logo + pontos enquanto a rota destino carrega.
 * Dispara em cliques em links internos e em `pushWithLoading` / `signalNavigationStart`.
 *
 * Não ligamos `popstate` a `beginNavigation`: o History API dispara `popstate` em situações
 * em que o pathname do Next.js ainda não mudou (ex.: reconciliação do App Router, sentinel
 * do guarda do checklist), o que deixava o overlay até ao timeout de 45s e podia abrir o
 * modal "Salvar e sair" sem o utilizador ter premido Voltar de propósito.
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
      if (isClientEditShellOnlyQueryChange(href)) return;
      if (isListPaginationOnly(href)) return;

      let destPath = "";
      try {
        destPath = new URL(href, window.location.origin).pathname;
      } catch {
        destPath = "";
      }
      if (hasRouteLoadingSkeleton(destPath)) return;

      beginNavigation();
    }

    document.addEventListener("click", onDocumentClick, true);

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
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
