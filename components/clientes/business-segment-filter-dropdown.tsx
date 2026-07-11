"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import scrollStyles from "@/components/ui/scroll-area.module.css";
import {
  CLIENT_BUSINESS_SEGMENTS,
  clientBusinessSegmentLabel,
} from "@/lib/constants/client-business-segment";
import type { ClientBusinessSegment } from "@/lib/types/clients";
import { touchMinHeight } from "@/lib/touch-targets";
import { cn } from "@/lib/utils";

interface BusinessSegmentFilterDropdownProps {
  defaultSegmentos?: ClientBusinessSegment[];
  showLabel?: boolean;
}

type PanelPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function usePanelPosition(
  anchorRef: React.RefObject<HTMLDivElement | null>,
  open: boolean,
) {
  const [position, setPosition] = React.useState<PanelPosition | null>(null);

  React.useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const top = rect.bottom + 4;
      const spaceBelow = window.innerHeight - top - 8;

      setPosition({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(240, Math.max(160, spaceBelow)),
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, open]);

  return open ? position : null;
}

export function BusinessSegmentFilterDropdown({
  defaultSegmentos = [],
  showLabel = true,
}: BusinessSegmentFilterDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<ClientBusinessSegment>>(
    new Set(defaultSegmentos),
  );
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const panelPosition = usePanelPosition(dropdownRef, isOpen);

  const handleCheckChange = (segment: ClientBusinessSegment) => {
    const newSelected = new Set(selected);
    if (newSelected.has(segment)) {
      newSelected.delete(segment);
    } else {
      newSelected.add(segment);
    }
    setSelected(newSelected);
  };

  const handleSelectAll = () => {
    if (selected.size === CLIENT_BUSINESS_SEGMENTS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(CLIENT_BUSINESS_SEGMENTS));
    }
  };

  const handleClear = () => {
    setSelected(new Set());
  };

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedCount = selected.size;
  const displayLabel =
    selectedCount === 0
      ? "Categoria"
      : selectedCount === 1
        ? clientBusinessSegmentLabel[Array.from(selected)[0]!]
        : `${selectedCount} categorias`;

  const panel =
    isOpen && panelPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            className="border-border bg-popover text-popover-foreground fixed z-50 overflow-hidden rounded-md border p-1 shadow-md"
            style={{
              top: panelPosition.top,
              left: panelPosition.left,
              width: panelPosition.width,
            }}
            role="listbox"
            aria-multiselectable="true"
            aria-label="Categorias"
          >
            <div className="flex gap-1 border-b border-border p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 flex-1 px-2 text-xs"
              >
                {selected.size === CLIENT_BUSINESS_SEGMENTS.length
                  ? "Desmarcar todos"
                  : "Marcar todos"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 flex-1 px-2 text-xs"
              >
                Limpar
              </Button>
            </div>

            <div
              className={cn(scrollStyles.scroll, "max-h-60 overflow-y-auto py-0.5 pr-0.5")}
              style={{ maxHeight: panelPosition.maxHeight }}
            >
              {CLIENT_BUSINESS_SEGMENTS.map((segment) => (
                <label
                  key={segment}
                  className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-sm transition-colors"
                >
                  <Checkbox
                    checked={selected.has(segment)}
                    onCheckedChange={() => handleCheckChange(segment)}
                    className="max-lg:box-border max-lg:m-0 max-lg:p-0 [@media(pointer:coarse)]:box-border [@media(pointer:coarse)]:m-0 [@media(pointer:coarse)]:p-0"
                  />
                  <span className="flex-1 text-left">{clientBusinessSegmentLabel[segment]}</span>
                </label>
              ))}
            </div>

            <div className="hidden">
              {Array.from(selected).map((segment) => (
                <input key={segment} type="hidden" name="segmentos" value={segment} />
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn("w-full", showLabel && "space-y-2")}>
      {showLabel && <Label>Categoria</Label>}
      <div ref={dropdownRef} className="relative w-full">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className={cn(
            "border-input bg-background text-foreground placeholder:text-muted-foreground flex h-9 w-full min-w-0 touch-manipulation items-center justify-between rounded-md border px-3 py-1.5 text-base shadow-xs transition-colors md:text-sm",
            touchMinHeight,
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            isOpen && "ring-2 ring-ring ring-offset-1",
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Filtrar por categoria"
        >
          <span
            className={cn(
              "truncate text-left",
              selectedCount === 0 && "text-muted-foreground",
            )}
          >
            {displayLabel}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" aria-hidden />
        </button>
        {panel}
      </div>
    </div>
  );
}
