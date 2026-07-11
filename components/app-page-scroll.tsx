import type { ReactNode } from "react";

import { PersistentScrollArea } from "@/components/ui/persistent-scroll-area";
import { cn } from "@/lib/utils";

export const APP_PAGE_SCROLL_ID = "app-page-scroll";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Scroll vertical com barra sempre visível em tablet/desktop.
 * No telemóvel mantém o fluxo natural da página (scroll do documento).
 */
export function AppPageScroll({ children, className }: Props) {
  return (
    <PersistentScrollArea
      id={APP_PAGE_SCROLL_ID}
      className={cn("min-h-0 min-w-0 overflow-x-hidden md:flex-1", className)}
    >
      {children}
    </PersistentScrollArea>
  );
}
