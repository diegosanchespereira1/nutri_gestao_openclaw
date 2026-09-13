"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { DropdownMenuScroll } from "@/components/ui/dropdown-menu-scroll";
import type { EstablishmentAreaOption } from "@/lib/types/establishment-areas";
import { cn } from "@/lib/utils";

type Props = {
  areas: EstablishmentAreaOption[];
  selectedAreaIds: string[];
  onChange: (ids: string[]) => void;
  /** Catálogo flutuante abre para cima; picker da visita abre para baixo. */
  panelPlacement?: "above" | "below";
  className?: string;
};

export function EstablishmentAreaMultiSelect({
  areas,
  selectedAreaIds,
  onChange,
  panelPlacement = "above",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (areas.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className={cn("relative flex shrink-0 flex-col gap-1", className)}
    >
      <label className="text-xs font-medium text-muted-foreground">Área</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-48 items-center justify-between gap-2 rounded-lg border px-3 text-sm shadow-xs outline-none transition-colors",
          "bg-background text-foreground",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1",
          open
            ? "border-primary ring-1 ring-primary/30"
            : selectedAreaIds.length === 0
              ? "border-amber-400"
              : "border-input",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-left">
          {selectedAreaIds.length === 0 ? (
            <span className="text-muted-foreground">Selecione as áreas…</span>
          ) : selectedAreaIds.length === 1 ? (
            (areas.find((a) => a.id === selectedAreaIds[0])?.name ?? "1 área")
          ) : (
            `${selectedAreaIds.length} áreas selecionadas`
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 z-50 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-lg",
            panelPlacement === "above" ? "bottom-9 mb-2" : "top-full mt-2",
          )}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Áreas do estabelecimento"
        >
          <DropdownMenuScroll className="max-h-52 py-1 pr-0.5">
            {areas.map((area) => {
              const picked = selectedAreaIds.includes(area.id);
              return (
                <button
                  key={area.id}
                  type="button"
                  role="option"
                  aria-selected={picked}
                  onClick={() =>
                    onChange(
                      picked
                        ? selectedAreaIds.filter((id) => id !== area.id)
                        : [...selectedAreaIds, area.id],
                    )
                  }
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/60",
                    picked && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                      picked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {picked ? <Check className="size-3" aria-hidden /> : null}
                  </span>
                  <span
                    className={cn(
                      "truncate",
                      picked && "font-medium text-foreground",
                    )}
                  >
                    {area.name}
                  </span>
                </button>
              );
            })}
          </DropdownMenuScroll>
          <div className="border-t border-border px-3 py-1.5">
            {selectedAreaIds.length === 0 ? (
              <p className="text-[11px] font-medium text-amber-600">
                Selecione ao menos uma área
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {selectedAreaIds.length} selecionada
                {selectedAreaIds.length !== 1 ? "s" : ""}
                {selectedAreaIds.length > 1 ? " · uma sessão por área" : ""}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
