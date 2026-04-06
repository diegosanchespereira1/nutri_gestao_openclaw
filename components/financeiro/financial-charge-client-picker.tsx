"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CLIENT_BUSINESS_SEGMENTS,
  clientBusinessSegmentLabel,
} from "@/lib/constants/client-business-segment";
import { cn } from "@/lib/utils";
import type {
  ClientBusinessSegment,
  ClientKind,
} from "@/lib/types/clients";

export type FinancialChargeClientPickerItem = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  business_segment: ClientBusinessSegment | null;
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

const SEGMENT_ALL = "";
const SEGMENT_NONE = "__sem_categoria__";

const segmentSelectClassName =
  "border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full max-w-xl rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

type Props = {
  id: string;
  clients: FinancialChargeClientPickerItem[];
  required?: boolean;
  className?: string;
};

/**
 * Filtro de segmento é um select à parte (não dentro do painel de clientes).
 * O painel flutuante contém apenas pesquisa + lista.
 */
export function FinancialChargeClientPicker({
  id,
  clients,
  required = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [segmentFilter, setSegmentFilter] = useState(SEGMENT_ALL);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = `${id}-lista`;

  const filtered = useMemo(() => {
    let list = clients;

    if (segmentFilter === SEGMENT_NONE) {
      list = list.filter((c) => c.business_segment == null);
    } else if (segmentFilter !== SEGMENT_ALL) {
      list = list.filter((c) => c.business_segment === segmentFilter);
    }

    const q = normalize(search.trim());
    if (q.length > 0) {
      list = list.filter((c) => {
        const legal = normalize(c.legal_name);
        const trade = c.trade_name ? normalize(c.trade_name) : "";
        return legal.includes(q) || trade.includes(q);
      });
    }

    return [...list].sort((a, b) =>
      pickLabel(a).localeCompare(pickLabel(b), "pt", { sensitivity: "base" }),
    );
  }, [clients, segmentFilter, search]);

  useEffect(() => {
    if (selectedId && !filtered.some((c) => c.id === selectedId)) {
      setSelectedId("");
    }
  }, [filtered, selectedId]);

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

  const selected = clients.find((c) => c.id === selectedId);
  const triggerLabel = selected ? pickLabel(selected) : "Abrir lista e escolher cliente…";

  return (
    <div ref={rootRef} className={cn("space-y-4", className)}>
      <input type="hidden" name="client_id" value={selectedId} required={required} />

      <div className="space-y-2">
        <Label htmlFor={`${id}-segmento`} className="text-sm font-medium">
          Categoria do cliente
        </Label>
        <p className="text-muted-foreground text-xs leading-snug">
          Reduza a lista antes de pesquisar. Isto não altera dados do cliente.
        </p>
        <select
          id={`${id}-segmento`}
          className={segmentSelectClassName}
          value={
            segmentFilter === SEGMENT_ALL
              ? SEGMENT_ALL
              : segmentFilter === SEGMENT_NONE
                ? SEGMENT_NONE
                : segmentFilter
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === SEGMENT_ALL) setSegmentFilter(SEGMENT_ALL);
            else if (v === SEGMENT_NONE) setSegmentFilter(SEGMENT_NONE);
            else setSegmentFilter(v as ClientBusinessSegment);
          }}
          aria-label="Filtrar clientes por categoria"
        >
          <option value={SEGMENT_ALL}>Todas as categorias</option>
          <option value={SEGMENT_NONE}>Sem categoria</option>
          {CLIENT_BUSINESS_SEGMENTS.map((seg) => (
            <option key={seg} value={seg}>
              {clientBusinessSegmentLabel[seg]}
            </option>
          ))}
        </select>
      </div>

      <div className="relative w-full max-w-xl space-y-1.5">
        <span className="text-foreground text-sm font-medium">Cliente</span>
        <Button
          type="button"
          id={id}
          variant="outline"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-haspopup="listbox"
          className={cn(
            "h-auto min-h-9 w-full justify-between gap-2 px-3 py-2 text-left font-normal",
            !selected && "text-muted-foreground",
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
            className="border-border bg-background absolute top-full left-0 z-50 mt-1 max-h-[min(24rem,calc(100vh-8rem))] w-full min-w-[min(100%,20rem)] overflow-hidden rounded-lg border shadow-md"
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
                Nenhum cliente corresponde ao filtro e à pesquisa.
              </li>
            ) : (
              filtered.map((c) => {
                const active = c.id === selectedId;
                const seg = c.business_segment
                  ? clientBusinessSegmentLabel[c.business_segment]
                  : "Sem categoria";
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
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {seg}
                          {c.kind === "pf" ? " · PF" : " · PJ"}
                        </span>
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
