"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 350;

export function RecipeSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(initialQ);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronizar com a URL (ex.: voltar/avançar no browser) sem setState síncrono no effect
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
      // Reset to page 1 on new search
      params.delete("page");
      router.push(`/ficha-tecnica?${params.toString()}`);
    },
    [router, searchParams],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => pushQ(v), DEBOUNCE_MS);
  }

  function handleClear() {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    pushQ("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") handleClear();
    if (e.key === "Enter") {
      if (timerRef.current) clearTimeout(timerRef.current);
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
        placeholder="Buscar template por nome…"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="pl-8 pr-8"
        aria-label="Buscar ficha técnica por nome"
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
