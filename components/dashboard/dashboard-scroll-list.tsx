"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

import styles from "./dashboard-scroll-list.module.css";

/** Altura de 5 linhas compactas + 4 intervalos de 0.5rem. */
export const DASHBOARD_FIVE_ROW_SCROLL = "max-h-[20.5rem]";

const SCROLL_EDGE_PX = 2;
const SCROLL_STEP_RATIO = 0.75;

type ScrollHints = {
  canScrollUp: boolean;
  canScrollDown: boolean;
};

type Props = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function DashboardScrollList({ label, children, className }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [hints, setHints] = useState<ScrollHints>({
    canScrollUp: false,
    canScrollDown: false,
  });

  const syncHints = useCallback(function syncHintsImpl() {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const next: ScrollHints = {
      canScrollUp: scrollTop > SCROLL_EDGE_PX,
      canScrollDown: scrollTop + clientHeight < scrollHeight - SCROLL_EDGE_PX,
    };

    setHints((prev) =>
      prev.canScrollUp === next.canScrollUp &&
      prev.canScrollDown === next.canScrollDown
        ? prev
        : next,
    );
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    syncHints();
    viewport.addEventListener("scroll", syncHints, { passive: true });
    window.addEventListener("resize", syncHints, { passive: true });

    const resizeObserver = new ResizeObserver(syncHints);
    resizeObserver.observe(viewport);
    for (const child of viewport.children) {
      resizeObserver.observe(child);
    }

    return () => {
      viewport.removeEventListener("scroll", syncHints);
      window.removeEventListener("resize", syncHints);
      resizeObserver.disconnect();
    };
  }, [syncHints, children]);

  const scrollByDirection = useCallback((direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({
      top: viewport.clientHeight * SCROLL_STEP_RATIO * direction,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="relative min-h-0">
      <div
        ref={viewportRef}
        role="region"
        aria-label={label}
        className={cn(
          DASHBOARD_FIVE_ROW_SCROLL,
          styles.hideBar,
          "min-h-0 space-y-2 overflow-y-auto overscroll-contain",
          className,
        )}
      >
        {children}
      </div>
      {hints.canScrollUp ? (
        <ScrollHintButton
          direction="up"
          onClick={() => scrollByDirection(-1)}
        />
      ) : null}
      {hints.canScrollDown ? (
        <ScrollHintButton
          direction="down"
          onClick={() => scrollByDirection(1)}
        />
      ) : null}
    </div>
  );
}

function ScrollHintButton({
  direction,
  onClick,
}: {
  direction: "up" | "down";
  onClick: () => void;
}) {
  const isDown = direction === "down";
  const Icon = isDown ? ChevronDown : ChevronUp;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 flex justify-center",
        isDown
          ? "bottom-0 bg-gradient-to-t from-white/15 to-transparent pt-6 pb-1.5 dark:from-card/15"
          : "top-0 bg-gradient-to-b from-white/15 to-transparent pt-1.5 pb-6 dark:from-card/15",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "border-border/50 bg-white/15 text-primary pointer-events-auto",
          "flex size-8 items-center justify-center rounded-full border shadow-sm",
          "hover:bg-white/25 focus-visible:ring-ring",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "dark:bg-white/15",
        )}
        aria-label={
          isDown ? "Ver mais itens abaixo" : "Ver itens acima"
        }
      >
        <Icon className="size-4 opacity-75" aria-hidden />
      </button>
    </div>
  );
}
