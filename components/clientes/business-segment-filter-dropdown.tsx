"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CLIENT_BUSINESS_SEGMENTS,
  clientBusinessSegmentLabel,
} from "@/lib/constants/client-business-segment";
import type { ClientBusinessSegment } from "@/lib/types/clients";
import { cn } from "@/lib/utils";

interface BusinessSegmentFilterDropdownProps {
  defaultSegmentos?: ClientBusinessSegment[];
}

export function BusinessSegmentFilterDropdown({
  defaultSegmentos = [],
}: BusinessSegmentFilterDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<ClientBusinessSegment>>(
    new Set(defaultSegmentos)
  );
  const dropdownRef = React.useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const selectedCount = selected.size;
  const displayLabel =
    selectedCount === 0
      ? "Todos os tipos"
      : selectedCount === 1
        ? Array.from(selected)[0]
        : `${selectedCount} tipos selecionados`;

  return (
    <div className="w-full space-y-2">
      <Label>Tipo de Negócio</Label>
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "border-input bg-white ring-offset-background focus-visible:ring-ring flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:bg-card",
            isOpen && "ring-2 ring-ring ring-offset-1"
          )}
        >
          <span className="text-foreground">
            {clientBusinessSegmentLabel[displayLabel as ClientBusinessSegment] ||
              displayLabel}
          </span>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 opacity-50 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="border-border bg-popover text-popover-foreground absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border shadow-md">
            <div className="space-y-2 p-3">
              {/* Select All / Clear buttons */}
              <div className="flex gap-2 pb-2 border-b border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex-1 h-8"
                >
                  {selected.size === CLIENT_BUSINESS_SEGMENTS.length
                    ? "Desmarcar todos"
                    : "Marcar todos"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="flex-1 h-8"
                >
                  Limpar
                </Button>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                {CLIENT_BUSINESS_SEGMENTS.map((segment) => (
                  <label
                    key={segment}
                    className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selected.has(segment)}
                      onCheckedChange={() => handleCheckChange(segment)}
                    />
                    <span className="text-sm text-foreground flex-1">
                      {clientBusinessSegmentLabel[segment]}
                    </span>
                  </label>
                ))}
              </div>

              {/* Hidden inputs for form submission */}
              <div className="hidden">
                {Array.from(selected).map((segment) => (
                  <input
                    key={segment}
                    type="hidden"
                    name="segmentos"
                    value={segment}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
