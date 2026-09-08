"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveDefaultChargeClientId } from "@/lib/financeiro/charge-form";
import { cn } from "@/lib/utils";
import type { ClientKind } from "@/lib/types/clients";

export type FinancialChargeClientPickerItem = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  kind: ClientKind;
};

function pickLabel(c: FinancialChargeClientPickerItem): string {
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

type Props = {
  id: string;
  clients: FinancialChargeClientPickerItem[];
  required?: boolean;
  /** Cliente já escolhido (ex.: filtro da URL ou ficha do cliente). */
  defaultClientId?: string;
  className?: string;
};

export function FinancialChargeClientPicker({
  id,
  clients,
  required = false,
  defaultClientId,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(() =>
    resolveDefaultChargeClientId(
      defaultClientId,
      clients.map((c) => c.id),
    ),
  );
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const requiredInputRef = useRef<HTMLInputElement>(null);
  const listId = `${id}-lista`;

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    const list =
      q.length === 0
        ? clients
        : clients.filter((c) => {
            const legal = normalize(c.legal_name);
            const trade = c.trade_name ? normalize(c.trade_name) : "";
            return legal.includes(q) || trade.includes(q);
          });

    return [...list].sort((a, b) =>
      pickLabel(a).localeCompare(pickLabel(b), "pt", { sensitivity: "base" }),
    );
  }, [clients, search]);

  const resolvedSelectedId = useMemo(
    () =>
      selectedId && clients.some((c) => c.id === selectedId) ? selectedId : "",
    [clients, selectedId],
  );

  useEffect(() => {
    const el = requiredInputRef.current;
    if (!el) return;
    el.setCustomValidity(
      required && !resolvedSelectedId
        ? "Selecione um cliente para registar a cobrança."
        : "",
    );
  }, [required, resolvedSelectedId]);

  useEffect(() => {
    if (!required) return;
    const form = rootRef.current?.closest("form");
    if (!form) return;
    function onSubmit(e: Event) {
      if (resolvedSelectedId) return;
      e.preventDefault();
      requiredInputRef.current?.reportValidity();
      setOpen(true);
    }
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [required, resolvedSelectedId]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const selected = clients.find((c) => c.id === resolvedSelectedId);
  const triggerLabel = selected
    ? pickLabel(selected)
    : "Abrir lista e escolher cliente…";

  return (
    <div ref={rootRef} className={cn("space-y-1.5", className)}>
      <input
        ref={requiredInputRef}
        id={`${id}-value`}
        name="client_id"
        value={resolvedSelectedId}
        required={required}
        tabIndex={-1}
        aria-label="Cliente selecionado"
        className="sr-only"
        onChange={() => undefined}
        onFocus={() => setOpen(true)}
      />

      <div className="relative w-full">
        <span className="text-foreground text-sm font-medium">
          Cliente
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
        <Button
          type="button"
          id={id}
          variant="outline"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-haspopup="listbox"
          aria-required={required || undefined}
          aria-invalid={required && !selected ? true : undefined}
          className={cn(
            "mt-1.5 h-auto min-h-9 w-full justify-between gap-2 px-3 py-2 text-left font-normal",
            !selected && "text-muted-foreground",
            required && !selected && "border-destructive/50",
          )}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </Button>

        {open ? (
          <div
            id={listId}
            className="border-border bg-background absolute top-full left-0 z-[80] mt-1 max-h-[min(24rem,calc(100vh-8rem))] w-full min-w-[min(100%,20rem)] overflow-hidden rounded-lg border shadow-md"
            role="listbox"
            aria-label="Resultados da pesquisa de clientes"
          >
            <div className="border-border space-y-2 border-b p-3">
              <label htmlFor={`${id}-pesquisa`} className="sr-only">
                Pesquisar cliente por nome
              </label>
              <Input
                id={`${id}-pesquisa`}
                type="search"
                autoComplete="off"
                placeholder="Pesquisar por nome ou fantasia…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>

            <ul
              className="max-h-52 overflow-y-auto overscroll-contain py-1"
              role="presentation"
            >
              {filtered.length === 0 ? (
                <li className="text-muted-foreground px-4 py-6 text-center text-sm">
                  Nenhum cliente corresponde à pesquisa.
                </li>
              ) : (
                filtered.map((c) => {
                  const active = c.id === resolvedSelectedId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={cn(
                          "hover:bg-muted/60 flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                          active && "bg-primary/10",
                        )}
                        onClick={() => {
                          setSelectedId(c.id);
                          setOpen(false);
                        }}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border",
                          )}
                          aria-hidden
                        >
                          {active ? <Check className="size-3" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground block font-medium">
                            {pickLabel(c)}
                          </span>
                          {c.trade_name?.trim() &&
                          pickLabel(c) === c.trade_name.trim() ? (
                            <span className="text-muted-foreground block text-xs">
                              {c.legal_name}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
