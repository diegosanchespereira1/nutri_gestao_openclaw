"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

export function RecipePagination({ page, totalPages, total, pageSize }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/ficha-tecnica?${params.toString()}`);
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Generate visible page numbers (window of 5 around current page)
  const visiblePages: number[] = [];
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);
  for (let i = start; i <= end; i++) visiblePages.push(i);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-xs">
        Mostrando{" "}
        <span className="text-foreground font-medium">
          {from}–{to}
        </span>{" "}
        de{" "}
        <span className="text-foreground font-medium">{total}</span> resultado
        {total !== 1 ? "s" : ""}
      </p>

      <nav
        role="navigation"
        aria-label="Paginação de receitas"
        className="flex items-center gap-1"
      >
        {/* Previous */}
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "px-2",
            page <= 1 && "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeft className="size-4" />
        </button>

        {/* First page + ellipsis */}
        {start > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(1)}
              aria-label="Página 1"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-w-[2rem]")}
            >
              1
            </button>
            {start > 2 && (
              <span className="text-muted-foreground px-1 text-sm select-none">
                …
              </span>
            )}
          </>
        )}

        {/* Page window */}
        {visiblePages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => goTo(p)}
            aria-label={`Página ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              buttonVariants({
                variant: p === page ? "default" : "outline",
                size: "sm",
              }),
              "min-w-[2rem]",
            )}
          >
            {p}
          </button>
        ))}

        {/* Last page + ellipsis */}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <span className="text-muted-foreground px-1 text-sm select-none">
                …
              </span>
            )}
            <button
              type="button"
              onClick={() => goTo(totalPages)}
              aria-label={`Página ${totalPages}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "min-w-[2rem]",
              )}
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next */}
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          aria-label="Próxima página"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "px-2",
            page >= totalPages && "pointer-events-none opacity-40",
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      </nav>
    </div>
  );
}
