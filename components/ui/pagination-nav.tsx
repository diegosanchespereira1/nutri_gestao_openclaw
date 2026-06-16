"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

interface PaginationNavProps {
  page: number;
  total: number;
  pageSize: number;
  /** SearchParams atuais — para preservar filtros na URL */
  searchParams: Record<string, string | string[] | undefined>;
  className?: string;
}

function buildFullUrl(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
  targetPage: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page") continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  if (targetPage > 1) params.set("page", String(targetPage));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function PaginationNav({
  page,
  total,
  pageSize,
  searchParams,
  className,
}: PaginationNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const delta = 2;
  const start = Math.max(1, page - delta);
  const end = Math.min(totalPages, page + delta);
  const pageNumbers: number[] = [];
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  function goTo(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) return;
    const href = buildFullUrl(pathname, searchParams, targetPage);
    startTransition(() => {
      router.push(href, { scroll: false });
    });
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
      aria-busy={isPending}
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {isPending ? (
        <Loader2
          className="text-muted-foreground mr-1 size-4 shrink-0 animate-spin"
          aria-hidden
        />
      ) : null}

      <button
        type="button"
        aria-label="Página anterior"
        disabled={!hasPrev || isPending}
        onClick={() => goTo(page - 1)}
        className={cn(btnClass, (!hasPrev || isPending) && "opacity-40")}
      >
        <ChevronLeft className="size-4" />
      </button>

      {start > 1 && (
        <>
          <button
            type="button"
            disabled={isPending}
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
          disabled={isPending || n === page}
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
            disabled={isPending}
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
        disabled={!hasNext || isPending}
        onClick={() => goTo(page + 1)}
        className={cn(btnClass, (!hasNext || isPending) && "opacity-40")}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
