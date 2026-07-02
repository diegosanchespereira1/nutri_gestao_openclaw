"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const delta = 2;
  const start = Math.max(1, page - delta);
  const end = Math.min(totalPages, page + delta);
  const pageNumbers: number[] = [];
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  function goTo(targetPage: number) {
    if (disabled || targetPage < 1 || targetPage > totalPages || targetPage === page) return;
    onPageChange(targetPage);
  }

  const btnClass = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "min-h-11 min-w-11 touch-manipulation",
  );
  const pageBtnClass = (active: boolean) =>
    cn(
      buttonVariants({ size: "sm" }),
      "min-h-11 min-w-11 touch-manipulation",
      active
        ? "pointer-events-none"
        : "bg-transparent text-foreground hover:bg-muted border border-input shadow-none",
    );

  return (
    <nav
      aria-label="Navegação de páginas"
      aria-busy={disabled}
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <button
        type="button"
        aria-label="Página anterior"
        disabled={!hasPrev || disabled}
        onClick={() => goTo(page - 1)}
        className={cn(btnClass, (!hasPrev || disabled) && "opacity-40")}
      >
        <ChevronLeft className="size-4" />
      </button>

      {start > 1 && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => goTo(1)}
            className={pageBtnClass(page === 1)}
          >
            1
          </button>
          {start > 2 && (
            <span className="px-1 text-muted-foreground text-sm">…</span>
          )}
        </>
      )}

      {pageNumbers.map((n) => (
        <button
          key={n}
          type="button"
          aria-current={n === page ? "page" : undefined}
          disabled={disabled || n === page}
          onClick={() => goTo(n)}
          className={pageBtnClass(n === page)}
        >
          {n}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-muted-foreground text-sm">…</span>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => goTo(totalPages)}
            className={pageBtnClass(page === totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        aria-label="Próxima página"
        disabled={!hasNext || disabled}
        onClick={() => goTo(page + 1)}
        className={cn(btnClass, (!hasNext || disabled) && "opacity-40")}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
