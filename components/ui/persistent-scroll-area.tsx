"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import styles from "./persistent-scroll-area.module.css";
import scrollStyles from "./scroll-area.module.css";

const SCROLL_STEP_RATIO = 0.75;

type ThumbMetrics = {
  top: number;
  height: number;
};

type ScrollBounds = {
  canScrollUp: boolean;
  canScrollDown: boolean;
};

type Props = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: ReactNode;
  /** `full` = trilho com setas; `overflow-only` = só scroll nativo (ex.: menu lateral). */
  controls?: "full" | "overflow-only";
  /** Centra o conteúdo verticalmente quando ele for mais baixo que a área visível
   *  (ex.: telas de login/cadastro) — via `margin-block: auto` no próprio conteúdo,
   *  então continua rolando normalmente se o conteúdo crescer além da altura
   *  disponível. Não altera o comportamento default (scroll do topo). */
  centerContent?: boolean;
};

function thumbsEqual(a: ThumbMetrics, b: ThumbMetrics): boolean {
  return (
    Math.abs(a.top - b.top) < 0.5 && Math.abs(a.height - b.height) < 0.5
  );
}

function boundsEqual(a: ScrollBounds, b: ScrollBounds): boolean {
  return (
    a.canScrollUp === b.canScrollUp && a.canScrollDown === b.canScrollDown
  );
}

/**
 * Área de scroll com trilho + polegar sempre visíveis em tablet/desktop.
 * Esconde a barra nativa (que some no macOS) e reserva faixa à direita.
 */
export function PersistentScrollArea({
  children,
  className,
  id,
  controls = "full",
  centerContent = false,
  ...props
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<ThumbMetrics>({ top: 0, height: 0 });
  const [bounds, setBounds] = useState<ScrollBounds>({
    canScrollUp: false,
    canScrollDown: false,
  });
  const [isScrollable, setIsScrollable] = useState(false);

  const syncThumb = useCallback(function syncThumbImpl() {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const scrollable = scrollHeight > clientHeight + 1;

    setIsScrollable((prev) => (prev === scrollable ? prev : scrollable));

    if (!scrollable) {
      setThumb((prev) =>
        prev.top === 0 && prev.height === 0 ? prev : { top: 0, height: 0 },
      );
      setBounds((prev) =>
        !prev.canScrollUp && !prev.canScrollDown
          ? prev
          : { canScrollUp: false, canScrollDown: false },
      );
      return;
    }

    const nextBounds: ScrollBounds = {
      canScrollUp: scrollTop > 1,
      canScrollDown: scrollTop + clientHeight < scrollHeight - 1,
    };
    setBounds((prev) => (boundsEqual(prev, nextBounds) ? prev : nextBounds));

    const track = trackRef.current;
    if (!track) return;

    const trackHeight = track.clientHeight;
    if (clientHeight <= 0 || trackHeight <= 0) return;

    const thumbHeight = Math.max(
      (clientHeight / scrollHeight) * trackHeight,
      20,
    );
    const maxThumbTop = Math.max(trackHeight - thumbHeight, 0);
    const scrollRatio =
      scrollHeight > clientHeight
        ? scrollTop / (scrollHeight - clientHeight)
        : 0;

    const nextThumb: ThumbMetrics = {
      top: scrollRatio * maxThumbTop,
      height: thumbHeight,
    };
    setThumb((prev) => (thumbsEqual(prev, nextThumb) ? prev : nextThumb));
  }, []);

  const scrollByDirection = useCallback((direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const delta = viewport.clientHeight * SCROLL_STEP_RATIO * direction;
    viewport.scrollBy({ top: delta, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    syncThumb();

    viewport.addEventListener("scroll", syncThumb, { passive: true });
    window.addEventListener("resize", syncThumb, { passive: true });

    const resizeObserver = new ResizeObserver(syncThumb);
    resizeObserver.observe(viewport);
    const content = contentRef.current;
    if (content) resizeObserver.observe(content);

    return () => {
      viewport.removeEventListener("scroll", syncThumb);
      window.removeEventListener("resize", syncThumb);
      resizeObserver.disconnect();
    };
  }, [syncThumb]);

  // Coluna sempre montada no modo `full` para não oscilar o layout (monta/desmonta
  // mudava clientHeight/width e gerava Maximum update depth no sync).
  const useFullControls = controls === "full";

  useLayoutEffect(() => {
    if (!useFullControls) return;
    const track = trackRef.current;
    if (!track) return;

    syncThumb();
    const resizeObserver = new ResizeObserver(syncThumb);
    resizeObserver.observe(track);
    return () => resizeObserver.disconnect();
  }, [useFullControls, syncThumb]);

  return (
    <div className={cn(styles.persistentRoot, className)}>
      <div
        ref={viewportRef}
        id={id}
        className={cn(
          styles.persistentViewport,
          controls === "overflow-only" && styles.persistentViewportOverflowOnly,
          // No modo full, overflow fica estável no desktop (classe media-query).
          // Evita alternar natural↔scrollable, que oscilava isScrollable.
          useFullControls && styles.persistentViewportScrollable,
          controls === "overflow-only" &&
            isScrollable &&
            cn(
              scrollStyles.scroll,
              styles.persistentViewportOverflowOnlyScrollable,
            ),
          centerContent && styles.persistentViewportCenter,
        )}
        {...props}
      >
        <div ref={contentRef} className={cn(centerContent && styles.persistentContentCenter)}>
          {children}
        </div>
      </div>
      {useFullControls ? (
        <div
          className={cn(
            styles.persistentColumn,
            styles.persistentColumnVisible,
            !isScrollable && styles.persistentColumnIdle,
          )}
          role="group"
          aria-label="Barra de deslocamento"
          aria-hidden={!isScrollable}
        >
          <div className={styles.persistentRail}>
            <button
              type="button"
              className={styles.scrollButton}
              aria-label="Rolar para cima"
              disabled={!bounds.canScrollUp || !isScrollable}
              tabIndex={isScrollable ? undefined : -1}
              onClick={() => scrollByDirection(-1)}
            >
              <ChevronUp className={styles.scrollButtonIcon} aria-hidden />
            </button>
            <div
              ref={trackRef}
              className={styles.persistentTrack}
              aria-hidden="true"
            >
              <div
                className={styles.persistentThumb}
                style={{
                  height: thumb.height,
                  transform: `translateY(${thumb.top}px)`,
                }}
              />
            </div>
            <button
              type="button"
              className={styles.scrollButton}
              aria-label="Rolar para baixo"
              disabled={!bounds.canScrollDown || !isScrollable}
              tabIndex={isScrollable ? undefined : -1}
              onClick={() => scrollByDirection(1)}
            >
              <ChevronDown className={styles.scrollButtonIcon} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
