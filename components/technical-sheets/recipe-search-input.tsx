"use client";

import { Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { useFilterNavigation } from "@/lib/navigation/use-filter-navigation";

type RecipeSearchInputProps = {
  basePath?: string;
  placeholder?: string;
  "aria-label"?: string;
};

export function RecipeSearchInput({
  basePath = "/ficha-tecnica",
  placeholder = "Buscar receita por nome…",
  "aria-label": ariaLabel = "Buscar ficha técnica por nome",
}: RecipeSearchInputProps) {
  const { isPending, navigate } = useFilterNavigation();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(initialQ);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    queueMicrotask(() => setValue(q));
  }, [searchParams]);

  const pushQ = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim().length > 0) {
        params.set("q", q.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      const qs = params.toString();
      navigate(qs ? `${basePath}?${qs}` : basePath);
    },
    [basePath, navigate, searchParams],
  );

  function handleClear() {
    setValue("");
    pushQ("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") handleClear();
    if (e.key === "Enter") {
      e.preventDefault();
      pushQ(value);
    }
  }

  return (
    <div className="relative w-full max-w-sm">
      <Search
        className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-8 pr-8"
        aria-label={ariaLabel}
        aria-busy={isPending}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpar busca"
          className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
