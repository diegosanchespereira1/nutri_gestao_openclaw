"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ListChecks, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenuScroll } from "@/components/ui/dropdown-menu-scroll";
import {
  ESTABLISHMENT_TYPES,
  establishmentTypeLabel,
} from "@/lib/constants/establishment-types";
import { touchMinHeight, touchMinTarget } from "@/lib/touch-targets";
import type { EstablishmentType } from "@/lib/types/establishments";
import { cn } from "@/lib/utils";
import type { VisitTemplateSourceFilter } from "@/lib/visits/visit-checklist-options";

const SOURCE_FILTERS: Array<{ id: VisitTemplateSourceFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "system", label: "Sistema" },
  { id: "workspace", label: "Equipe" },
  { id: "custom", label: "Personalizados" },
];

type DropdownPanelPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function useDropdownPanelPosition(
  anchorRef: React.RefObject<HTMLDivElement | null>,
  open: boolean,
  minWidth = 168,
) {
  const [position, setPosition] = useState<DropdownPanelPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(Math.max(rect.width, minWidth), viewportWidth - 16);
      const left = Math.min(Math.max(8, rect.left), viewportWidth - width - 8);
      const top = rect.bottom + 4;
      const spaceBelow = viewportHeight - top - 8;
      const maxHeight = Math.min(208, Math.max(120, spaceBelow));

      setPosition({ top, left, width, maxHeight });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, open, minWidth]);

  return open ? position : null;
}

type Props = {
  visibleCount: number;
  selectedLabel?: string | null;
  sourceFilter: VisitTemplateSourceFilter;
  onSourceFilterChange: (next: VisitTemplateSourceFilter) => void;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onApplySearch: (value?: string) => void;
  typeFilter: EstablishmentType[];
  onToggleType: (type: EstablishmentType) => void;
  ufFilter: string[];
  ufOptions: string[];
  onToggleUf: (uf: string) => void;
  onClearFilters: () => void;
};

export function ChecklistTemplateChoiceCard({
  visibleCount,
  selectedLabel,
  sourceFilter,
  onSourceFilterChange,
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  typeFilter,
  onToggleType,
  ufFilter,
  ufOptions,
  onToggleUf,
  onClearFilters,
}: Props) {
  const [typeFilterDropdownOpen, setTypeFilterDropdownOpen] = useState(false);
  const [ufFilterDropdownOpen, setUfFilterDropdownOpen] = useState(false);
  const typeFilterDropdownRef = useRef<HTMLDivElement>(null);
  const typeFilterPanelRef = useRef<HTMLDivElement>(null);
  const ufFilterDropdownRef = useRef<HTMLDivElement>(null);
  const ufFilterPanelRef = useRef<HTMLDivElement>(null);

  const typeFilterPanelPosition = useDropdownPanelPosition(
    typeFilterDropdownRef,
    typeFilterDropdownOpen,
    220,
  );
  const ufFilterPanelPosition = useDropdownPanelPosition(
    ufFilterDropdownRef,
    ufFilterDropdownOpen,
    136,
  );

  const hasActiveFilters = Boolean(
    searchDraft ||
      typeFilter.length > 0 ||
      ufFilter.length > 0 ||
      sourceFilter !== "all",
  );

  const typeFilterLabel = useMemo(() => {
    if (typeFilter.length === 0) return "Todos os tipos";
    return typeFilter.map((type) => establishmentTypeLabel[type]).join(", ");
  }, [typeFilter]);

  const ufFilterLabel = useMemo(() => {
    if (ufFilter.length === 0) return "Todas as UFs";
    if (ufFilter.length === 1) return ufFilter[0]!;
    return `${ufFilter.length} UFs selecionadas`;
  }, [ufFilter]);

  useEffect(() => {
    if (!typeFilterDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        typeFilterDropdownRef.current?.contains(target) ||
        typeFilterPanelRef.current?.contains(target)
      ) {
        return;
      }
      setTypeFilterDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [typeFilterDropdownOpen]);

  useEffect(() => {
    if (!ufFilterDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ufFilterDropdownRef.current?.contains(target) ||
        ufFilterPanelRef.current?.contains(target)
      ) {
        return;
      }
      setUfFilterDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ufFilterDropdownOpen]);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        selectedLabel
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card shadow-sm",
      )}
    >
      <div className="min-w-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Escolha um template de checklist
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Filtre por origem, tipo ou UF
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {visibleCount} template{visibleCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Origem do modelo"
        >
          {SOURCE_FILTERS.map((option) => {
            const active = sourceFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSourceFilterChange(option.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors touch-manipulation",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar por nome, portaria…"
                value={searchDraft}
                onChange={(e) => onSearchDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onApplySearch();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    onApplySearch("");
                  }
                }}
                className={cn(
                  "h-9 w-full rounded-md border pl-8 pr-8 text-sm shadow-xs outline-none",
                  "border-input bg-background text-foreground placeholder:text-muted-foreground",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1",
                  touchMinHeight,
                )}
                aria-label="Buscar template de checklist"
              />
              {searchDraft ? (
                <button
                  type="button"
                  onClick={() => onApplySearch("")}
                  className={cn(
                    "absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground touch-manipulation",
                    touchMinTarget,
                  )}
                  aria-label="Limpar busca"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => onApplySearch()}
            >
              Buscar
            </Button>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:shrink-0">
            <div ref={typeFilterDropdownRef} className="relative min-w-0 flex-1 sm:w-[11rem] sm:flex-none">
              <button
                type="button"
                onClick={() => {
                  setUfFilterDropdownOpen(false);
                  setTypeFilterDropdownOpen((open) => !open);
                }}
                className={cn(
                  "flex h-9 w-full min-w-0 items-center justify-between gap-1.5 rounded-md border px-2.5 text-sm shadow-xs outline-none transition-colors touch-manipulation",
                  "bg-background text-foreground",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1",
                  touchMinHeight,
                  typeFilterDropdownOpen || typeFilter.length > 0
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-input",
                )}
                aria-haspopup="listbox"
                aria-expanded={typeFilterDropdownOpen}
                aria-label="Filtrar por tipo de estabelecimento"
              >
                <span
                  className={cn(
                    "truncate text-left text-xs sm:text-sm",
                    typeFilter.length === 0 && "text-muted-foreground",
                  )}
                >
                  {typeFilter.length === 0 ? "Tipo" : typeFilterLabel}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground transition-transform",
                    typeFilterDropdownOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            </div>

            {ufOptions.length > 0 ? (
              <div
                ref={ufFilterDropdownRef}
                className="relative min-w-0 w-[5.5rem] shrink-0 sm:w-[6.5rem]"
              >
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilterDropdownOpen(false);
                    setUfFilterDropdownOpen((open) => !open);
                  }}
                  className={cn(
                    "flex h-9 w-full min-w-0 items-center justify-between gap-1 rounded-md border px-2 text-sm shadow-xs outline-none transition-colors touch-manipulation",
                    "bg-background text-foreground",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1",
                    touchMinHeight,
                    ufFilterDropdownOpen || ufFilter.length > 0
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-input",
                  )}
                  aria-haspopup="listbox"
                  aria-expanded={ufFilterDropdownOpen}
                  aria-label="Filtrar por UF"
                >
                  <span
                    className={cn(
                      "truncate text-left text-xs sm:text-sm",
                      ufFilter.length === 0 && "text-muted-foreground",
                    )}
                  >
                    {ufFilter.length === 0 ? "UF" : ufFilterLabel}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-transform",
                      ufFilterDropdownOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
              </div>
            ) : null}

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onClearFilters}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1 rounded-md border border-transparent px-2 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground touch-manipulation",
                  touchMinHeight,
                )}
                title="Limpar filtros"
              >
                <X className="size-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            ) : null}
          </div>
        </div>

        {typeFilterDropdownOpen && typeFilterPanelPosition
          ? createPortal(
              <div
                ref={typeFilterPanelRef}
                className="border-border bg-popover text-popover-foreground fixed z-[120] overflow-hidden rounded-md border p-1 shadow-lg"
                style={{
                  top: typeFilterPanelPosition.top,
                  left: typeFilterPanelPosition.left,
                  width: typeFilterPanelPosition.width,
                }}
                role="listbox"
                aria-multiselectable="true"
                aria-label="Tipos de estabelecimento"
              >
                <DropdownMenuScroll
                  className="py-1 pr-0.5"
                  style={{ maxHeight: typeFilterPanelPosition.maxHeight }}
                >
                  {ESTABLISHMENT_TYPES.map((type) => {
                    const picked = typeFilter.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        role="option"
                        aria-selected={picked}
                        onClick={() => onToggleType(type)}
                        className={cn(
                          "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-sm transition-colors",
                          picked && "bg-primary/5",
                          touchMinHeight,
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                            picked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border",
                          )}
                        >
                          {picked ? <Check className="size-3" aria-hidden /> : null}
                        </span>
                        <span className={cn("truncate text-left", picked && "font-medium")}>
                          {establishmentTypeLabel[type]}
                        </span>
                      </button>
                    );
                  })}
                </DropdownMenuScroll>
                <div className="border-border border-t px-3 py-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    {typeFilter.length === 0
                      ? "Nenhum filtro de tipo aplicado"
                      : `${typeFilter.length} tipo${typeFilter.length !== 1 ? "s" : ""} selecionado${typeFilter.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>,
              document.body,
            )
          : null}

        {ufFilterDropdownOpen && ufFilterPanelPosition
          ? createPortal(
              <div
                ref={ufFilterPanelRef}
                className="border-border bg-popover text-popover-foreground fixed z-[120] overflow-hidden rounded-md border p-1 shadow-lg"
                style={{
                  top: ufFilterPanelPosition.top,
                  left: ufFilterPanelPosition.left,
                  width: ufFilterPanelPosition.width,
                }}
                role="listbox"
                aria-multiselectable="true"
                aria-label="UFs"
              >
                <DropdownMenuScroll
                  className="py-1 pr-0.5"
                  style={{ maxHeight: ufFilterPanelPosition.maxHeight }}
                >
                  {ufOptions.map((uf) => {
                    const picked = ufFilter.includes(uf);
                    return (
                      <button
                        key={uf}
                        type="button"
                        role="option"
                        aria-selected={picked}
                        onClick={() => onToggleUf(uf)}
                        className={cn(
                          "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-sm transition-colors",
                          picked && "bg-primary/5",
                          touchMinHeight,
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                            picked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border",
                          )}
                        >
                          {picked ? <Check className="size-3" aria-hidden /> : null}
                        </span>
                        <span className={cn("truncate text-left", picked && "font-medium")}>
                          {uf}
                        </span>
                      </button>
                    );
                  })}
                </DropdownMenuScroll>
                <div className="border-border border-t px-3 py-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    {ufFilter.length === 0
                      ? "Nenhum filtro de UF aplicado"
                      : `${ufFilter.length} UF${ufFilter.length !== 1 ? "s" : ""} selecionada${ufFilter.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>,
              document.body,
            )
          : null}

        {selectedLabel ? (
          <p className="flex items-center gap-1 text-xs font-medium text-primary">
            <ListChecks className="size-3 shrink-0" />
            Template selecionado: {selectedLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
