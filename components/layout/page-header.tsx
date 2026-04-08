import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

interface PageHeaderProps {
  /** Título principal da página (h1) */
  title: string;
  /** Descrição curta abaixo do título */
  description?: string;
  /** Link de volta: { href, label } */
  back?: { href: string; label: string };
  /** Ações no canto direito (botões, links) */
  actions?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho de página padronizado — DS 2.0.
 *
 * Layout: [back link (opcional)]
 *         [título]  [ações]
 *         [descrição]
 */
export function PageHeader({
  title,
  description,
  back,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {back && (
        <Link
          href={back.href}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground hover:text-foreground -ml-2 mb-1 h-auto gap-1 px-2 py-1",
          )}
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
      )}
    </div>
  );
}
