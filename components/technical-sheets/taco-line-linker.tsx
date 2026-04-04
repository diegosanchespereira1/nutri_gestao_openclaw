"use client";

import { useEffect, useState } from "react";

import { searchTacoFoodsAction } from "@/lib/actions/taco-reference-foods";
import type { TacoReferenceFoodRow } from "@/lib/types/taco-reference-foods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  inputId: string;
  linked: TacoReferenceFoodRow | null;
  onLinkedChange: (
    food: TacoReferenceFoodRow | null,
    options?: { syncIngredientName?: boolean },
  ) => void;
};

export function TacoLineLinker({
  inputId,
  linked,
  onLinkedChange,
}: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<TacoReferenceFoodRow[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setHits([]);
      setPending(false);
      return;
    }

    setPending(true);
    const handle = setTimeout(() => {
      void searchTacoFoodsAction(t).then((rows) => {
        setHits(rows);
        setPending(false);
      });
    }, 320);

    return () => clearTimeout(handle);
  }, [q]);

  if (linked) {
    return (
      <div className="space-y-1.5 sm:col-span-full">
        <Label className="text-xs">TACO (referência)</Label>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-foreground">
            {linked.taco_code} — {linked.name}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onLinkedChange(null)}
          >
            Remover ligação
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 sm:col-span-full">
      <Label className="text-xs" htmlFor={inputId}>
        Ligar à TACO (pesquisar, mín. 2 caracteres)
      </Label>
      <Input
        id={inputId}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ex.: arroz, feijão, leite…"
        autoComplete="off"
      />
      {pending ? (
        <p className="text-muted-foreground text-xs">A pesquisar…</p>
      ) : null}
      {hits.length > 0 ? (
        <ul
          className="border-border bg-background max-h-36 overflow-y-auto rounded-lg border text-sm"
          role="listbox"
          aria-label="Resultados TACO"
        >
          {hits.map((h) => (
            <li key={h.id} className="border-border border-b last:border-0">
              <button
                type="button"
                className={cn(
                  "hover:bg-muted/80 w-full px-3 py-2 text-left transition-colors",
                  "focus-visible:ring-ring outline-none focus-visible:ring-2",
                )}
                onClick={() => {
                  onLinkedChange(h, { syncIngredientName: true });
                  setQ("");
                  setHits([]);
                }}
              >
                <span className="text-muted-foreground font-mono text-xs">
                  {h.taco_code}
                </span>{" "}
                <span className="text-foreground">{h.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
