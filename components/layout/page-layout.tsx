import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  /**
   * "default"  → largura total da área de conteúdo (listagens e dashboard)
   * "form"     → max-w-3xl, para formulários e páginas de configuração
   * "wide"     → alias de default (compatibilidade)
   */
  variant?: "default" | "form" | "wide";
  className?: string;
}

const variantClass = {
  default: "w-full",
  form: "max-w-3xl",
  wide: "w-full",
};

/**
 * Wrapper de conteúdo de página.
 *
 * Garante:
 * - largura total (default/wide) ou max-width em formulários (form)
 * - espaçamento vertical entre seções (space-y-6)
 */
export function PageLayout({
  children,
  variant = "default",
  className,
}: PageLayoutProps) {
  return (
    <div
      className={cn("min-w-0 w-full max-w-full space-y-6", variantClass[variant], className)}
    >
      {children}
    </div>
  );
}
