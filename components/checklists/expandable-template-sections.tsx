"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import type { ChecklistTemplateSectionWithItems } from "@/lib/types/checklists";

import { TemplateItemRow } from "./template-item-row";

type Props = {
  loadSections: () => Promise<ChecklistTemplateSectionWithItems[] | null>;
};

export function ExpandableTemplateSections({ loadSections }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [sections, setSections] = useState<
    ChecklistTemplateSectionWithItems[] | null
  >(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (!willOpen || sections) return;

    setLoading(true);
    try {
      const loaded = await loadSections();
      if (loaded) setSections(loaded);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="border-t border-border/50">
        <button
          type="button"
          onClick={handleToggle}
          className="flex w-full items-center justify-between rounded-b-xl px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          aria-expanded={isOpen}
        >
          <span>{isOpen ? "Ocultar seções e itens" : "Ver seções e itens"}</span>
          {isOpen ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
      </div>

      {isOpen ? (
        <div
          className="space-y-3 border-t border-border/50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div
              className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="size-4 animate-spin" />
              Carregando seções e itens…
            </div>
          ) : sections && sections.length > 0 ? (
            sections.map((sec) => (
              <div key={sec.id}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
                  {sec.title}
                </h3>
                <ul className="divide-y divide-border/30 rounded-lg border border-border/50 px-3">
                  {sec.items.map((it) => (
                    <TemplateItemRow
                      key={it.id}
                      description={it.description}
                      isRequired={it.is_required}
                    />
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma seção encontrada neste modelo.
            </p>
          )}
        </div>
      ) : null}
    </>
  );
}
