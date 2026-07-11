"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  useCallback,
  useEffect,
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
};

/**
 * Área de scroll com trilho + polegar sempre visíveis em tablet/desktop.
 * Esconde a barra nativa (que some no macOS) e reserva faixa à direita.
 */
export function PersistentScrollArea({
  children,
  className,
  id,
  controls = "full",
  ...props
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<ThumbMetrics>({ top: 0, height: 0 });
  const [bounds, setBounds] = useState<ScrollBounds>({
    canScrollUp: false,
    canScrollDown: false,
  });
  const [isScrollable, setIsScrollable] = useState(false);

  const syncThumb = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const scrollable = scrollHeight > clientHeight + 1;
    setIsScrollable(scrollable);

    if (!scrollable) {
      setThumb({ top: 0, height: 0 });
      setBounds({ canScrollUp: false, canScrollDown: false });
      return;
    }

    if (controls === "full" && !track) {
      requestAnimationFrame(() => syncThumb());
      return;
    }

    if (!track) return;

    const trackHeight = track.clientHeight;
    if (clientHeight <= 0 || trackHeight <= 0) return;

    setBounds({
      canScrollUp: scrollTop > 1,
      canScrollDown: scrollTop + clientHeight < scrollHeight - 1,
    });

    const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 20);
    const maxThumbTop = Math.max(trackHeight - thumbHeight, 0);
    const scrollRatio = scrollTop / (scrollHeight - clientHeight);

    setThumb({
      top: scrollRatio * maxThumbTop,
      height: thumbHeight,
    });
  }, [controls]);

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
    const track = trackRef.current;
    if (track) resizeObserver.observe(track);
    const content = viewport.firstElementChild;
    if (content) resizeObserver.observe(content);

    return () => {
      viewport.removeEventListener("scroll", syncThumb);
      window.removeEventListener("resize", syncThumb);
      resizeObserver.disconnect();
    };
  }, [syncThumb, children, isScrollable]);

  const showScrollbar = isScrollable && controls === "full";

  return (
    <div className={cn(styles.persistentRoot, className)}>
      <div
        ref={viewportRef}
        id={id}
        className={cn(
          styles.persistentViewport,
          !isScrollable && styles.persistentViewportNatural,
          isScrollable &&
            controls === "full" &&
            styles.persistentViewportScrollable,
          isScrollable &&
            controls === "overflow-only" &&
            cn(
              scrollStyles.scroll,
              "md:overflow-y-auto md:overscroll-y-contain",
            ),
        )}
        {...props}
      >
        {children}
      </div>
      {showScrollbar ? (
        <div
          className={cn(styles.persistentColumn, styles.persistentColumnVisible)}
          role="group"
          aria-label="Barra de deslocamento"
        >
          <div className={styles.persistentRail}>
            <button
              type="button"
              className={styles.scrollButton}
              aria-label="Rolar para cima"
              disabled={!bounds.canScrollUp}
              onClick={() => scrollByDirection(-1)}
            >
              <ChevronUp className={styles.scrollButtonIcon} aria-hidden />
            </button>
            <div ref={trackRef} className={styles.persistentTrack} aria-hidden="true">
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
              disabled={!bounds.canScrollDown}
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
