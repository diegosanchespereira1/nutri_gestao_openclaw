import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

function buildUrl(
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
  return qs ? `?${qs}` : "?";
}

export function PaginationNav({
  page,
  total,
  pageSize,
  searchParams,
  className,
}: PaginationNavProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Mostra no máximo 5 páginas ao redor da atual
  const delta = 2;
  const start = Math.max(1, page - delta);
  const end = Math.min(totalPages, page + delta);
  const pageNumbers: number[] = [];
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  return (
    <nav
      aria-label="Navegação de páginas"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <Link
        href={buildUrl(searchParams, page - 1)}
        aria-label="Página anterior"
        aria-disabled={!hasPrev}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          !hasPrev && "pointer-events-none opacity-40",
        )}
      >
        <ChevronLeft className="size-4" />
      </Link>

      {start > 1 && (
        <>
          <Link
            href={buildUrl(searchParams, 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-w-9")}
          >
            1
          </Link>
          {start > 2 && (
            <span className="px-1 text-muted-foreground text-sm">…</span>
          )}
        </>
      )}

      {pageNumbers.map((n) => (
        <Link
          key={n}
          href={buildUrl(searchParams, n)}
          aria-current={n === page ? "page" : undefined}
          className={cn(
            buttonVariants({ size: "sm" }),
            "min-w-9",
            n === page
              ? "pointer-events-none"
              : "bg-transparent text-foreground hover:bg-muted border border-input shadow-none",
          )}
        >
          {n}
        </Link>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-muted-foreground text-sm">…</span>
          )}
          <Link
            href={buildUrl(searchParams, totalPages)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-w-9")}
          >
            {totalPages}
          </Link>
        </>
      )}

      <Link
        href={buildUrl(searchParams, page + 1)}
        aria-label="Próxima página"
        aria-disabled={!hasNext}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          !hasNext && "pointer-events-none opacity-40",
        )}
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
