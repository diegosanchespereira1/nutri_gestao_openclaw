"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { deleteClientAction } from "@/lib/actions/clients";

export function ClientRowActions({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/clientes/${clientId}/editar`}
        aria-label="Editar cliente"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-4" />
      </Link>

      <div className="relative">
        <button
          type="button"
          aria-label="Mais ações"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-md">
            <form action={deleteClientAction}>
              <input type="hidden" name="id" value={clientId} />
              <button
                type="submit"
                onClick={(e) => {
                  if (
                    !window.confirm(
                      "Eliminar este cliente? Esta ação não pode ser anulada.",
                    )
                  ) {
                    e.preventDefault();
                  }
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                Eliminar cliente
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
