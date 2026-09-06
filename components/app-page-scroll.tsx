import type { ReactNode } from "react";

import { PersistentScrollArea } from "@/components/ui/persistent-scroll-area";
import { cn } from "@/lib/utils";

export const APP_PAGE_SCROLL_ID = "app-page-scroll";

type Props = {
  children: ReactNode;
  className?: string;
  /** Ver `PersistentScrollArea` — centra o conteúdo verticalmente quando ele
   *  for mais baixo que a área visível (ex.: telas de login/cadastro). */
  centerContent?: boolean;
};

/**
 * Scroll vertical com barra sempre visível em tablet/desktop.
 * No telemóvel mantém o fluxo natural da página (scroll do documento).
 */
export function AppPageScroll({ children, className, centerContent = false }: Props) {
  return (
    <PersistentScrollArea
      id={APP_PAGE_SCROLL_ID}
      className={cn("min-h-0 min-w-0 overflow-x-hidden md:flex-1", className)}
      centerContent={centerContent}
    >
      {children}
    </PersistentScrollArea>
  );
}
