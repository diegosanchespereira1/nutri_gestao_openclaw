"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

import styles from "./page-loading-screen.module.css";

export type PageLoadingScreenMode = "overlay" | "content-overlay" | "inline";

type Props = {
  /** `overlay` cobre a viewport; `inline` ocupa a área do conteúdo da página. */
  mode?: PageLoadingScreenMode;
  /** Texto opcional abaixo do subtítulo (ex.: "Carregando checklists…"). */
  hint?: string;
  /** Fade-out de saída (splash inicial do app). */
  fading?: boolean;
  className?: string;
};

/**
 * Loading padrão NutriGestão — logo, marca e animação de pontos.
 * Usar em `loading.tsx`, Suspense, dynamic() e transições de rota.
 */
export function PageLoadingScreen({
  mode = "inline",
  hint,
  fading = false,
  className,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={hint ?? "Carregando"}
      className={cn(
        styles.screen,
        mode === "overlay"
          ? styles.overlay
          : mode === "content-overlay"
            ? styles.contentOverlay
            : styles.inline,
        fading && styles.fading,
        className,
      )}
    >
      <Image
        src="/app-icon.png"
        alt=""
        width={120}
        height={120}
        className={styles.logo}
        style={{ width: 120, height: 120, maxWidth: 120, maxHeight: 120 }}
        priority={false}
      />

      <p className={styles.title}>NutriGestão</p>
      <p className={styles.subtitle}>GESTÃO NUTRICIONAL PROFISSIONAL</p>

      {hint ? <p className={styles.hint}>{hint}</p> : null}

      <div className={styles.dots} aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={styles.dot}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
