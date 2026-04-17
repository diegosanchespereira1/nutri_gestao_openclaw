"use client";

import { useState } from "react";
import { LayoutTemplate, Star } from "lucide-react";

import {
  loadTemplatesForPickerAction,
  type TemplatePickerRow,
} from "@/lib/actions/technical-recipes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  /** Um dos dois: estabelecimento ou cliente (catálogo). */
  pickerQuery: { establishmentId?: string; clientId?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: string) => void;
};

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function RecipeTemplatePickerDialog({
  pickerQuery,
  open,
  onOpenChange,
  onSelectTemplate,
}: Props) {
  const [listLoading, setListLoading] = useState(false);
  const [rows, setRows] = useState<TemplatePickerRow[]>([]);
  const [error, setError] = useState<string>("");
  const [q, setQ] = useState("");

  function loadList() {
    const est = pickerQuery.establishmentId?.trim() ?? "";
    const cli = pickerQuery.clientId?.trim() ?? "";
    if (!est && !cli) {
      setError("Selecione estabelecimento ou cliente (catálogo).");
      return;
    }
    if (est && cli) {
      setError("Contexto inválido.");
      return;
    }
    setError("");
    setListLoading(true);
    void (async () => {
      try {
        const result = await loadTemplatesForPickerAction(
          est ? { establishmentId: est } : { clientId: cli },
        );
        if (!result.ok) {
          setRows([]);
          setError(result.error);
          return;
        }
        setRows(result.rows);
      } finally {
        setListLoading(false);
      }
    })();
  }

  const filtered = q.trim()
    ? rows.filter((r) =>
        r.name.toLowerCase().includes(q.trim().toLowerCase()),
      )
    : rows;

  const favorites = filtered.filter((r) => r.is_favorite);
  const others = filtered.filter((r) => !r.is_favorite);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) loadList();
      }}
    >
      <DialogContent className="max-h-[min(90dvh,640px)] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-border shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-5" aria-hidden />
            Utilizar template
          </DialogTitle>
          <DialogDescription>
            Escolha um template do mesmo cliente PJ (estabelecimento ou
            catálogo). Os campos serão preenchidos para editar antes de salvar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 overflow-y-auto px-6 py-4">
          <Input
            placeholder="Filtrar por nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filtrar templates"
          />
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {listLoading && rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">A carregar…</p>
          ) : null}
          {!listLoading && rows.length === 0 && !error ? (
            <p className="text-muted-foreground text-sm">
              Nenhum template para este cliente.
            </p>
          ) : null}

          {favorites.length > 0 ? (
            <div className="space-y-2">
              <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
                Favoritos
              </p>
              <ul className="space-y-1">
                {favorites.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={cn(
                        "border-border hover:bg-muted/80 flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      )}
                      onClick={() => {
                        onSelectTemplate(r.id);
                        onOpenChange(false);
                      }}
                    >
                      <Star
                        className="text-primary mt-0.5 size-4 shrink-0 fill-current"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground font-medium">
                          {r.name}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {r.establishment_name} · {r.portions_yield} porções ·{" "}
                          {formatUpdatedAt(r.updated_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {others.length > 0 ? (
            <div className="space-y-2">
              {favorites.length > 0 ? (
                <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
                  Todos os templates
                </p>
              ) : null}
              <ul className="space-y-1">
                {others.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={cn(
                        "border-border hover:bg-muted/80 flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      )}
                      onClick={() => {
                        onSelectTemplate(r.id);
                        onOpenChange(false);
                      }}
                    >
                      <LayoutTemplate
                        className="text-muted-foreground mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground font-medium">
                          {r.name}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {r.establishment_name} · {r.portions_yield} porções ·{" "}
                          {formatUpdatedAt(r.updated_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {filtered.length === 0 && rows.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum resultado para o filtro.
            </p>
          ) : null}
        </div>
        <div className="border-border flex shrink-0 justify-end border-t px-6 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
