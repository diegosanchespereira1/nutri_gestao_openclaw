import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

import styles from "./scroll-area.module.css";

type ScrollAreaVariant = "default" | "gutter";

type ScrollAreaProps = ComponentPropsWithoutRef<"div"> & {
  /** `gutter` reserva espaço à direita e mantém a barra visível em telas grandes. */
  variant?: ScrollAreaVariant;
};

/** Container com barra de scroll estilizada do design system. */
export function ScrollArea({
  className,
  variant = "default",
  ...props
}: ScrollAreaProps) {
  return (
    <div
      className={cn(
        variant === "gutter" ? styles.scrollGutter : styles.scroll,
        className,
      )}
      {...props}
    />
  );
}
