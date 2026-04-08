import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  /**
   * "default"  → max-w-7xl, para páginas de listagem e dashboard
   * "form"     → max-w-3xl, para formulários e páginas de configuração
   * "wide"     → sem max-w, para páginas com tabelas muito largas
   */
  variant?: "default" | "form" | "wide";
  className?: string;
}

const variantClass = {
  default: "max-w-7xl",
  form: "max-w-3xl",
  wide: "",
};

/**
 * Wrapper de conteúdo de página.
 *
 * Garante:
 * - max-width consistente por tipo de página
 * - espaçamento vertical entre seções (space-y-6)
 */
export function PageLayout({
  children,
  variant = "default",
  className,
}: PageLayoutProps) {
  return (
    <div
      className={cn("w-full space-y-6", variantClass[variant], className)}
    >
      {children}
    </div>
  );
}
