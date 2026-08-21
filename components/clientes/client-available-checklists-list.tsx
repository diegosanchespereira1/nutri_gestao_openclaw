"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";

import { ExpandableTemplateSections } from "@/components/checklists/expandable-template-sections";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { loadCustomTemplatePreviewAction } from "@/lib/actions/checklist-custom";
import { loadWorkspaceTemplatePreviewAction } from "@/lib/actions/checklist-workspace";
import { loadChecklistTemplatePreviewAction } from "@/lib/actions/checklists";
import {
  buildApplyChecklistHref,
  type ClientAvailableChecklist,
} from "@/lib/checklists/client-available-templates";
import { cn } from "@/lib/utils";

const SEARCH_THRESHOLD = 8;

type Props = {
  clientId: string;
  establishment: { id: string; name: string } | null;
  items: ClientAvailableChecklist[];
};

function previewLoader(item: ClientAvailableChecklist) {
  if (item.source === "workspace") {
    return () => loadWorkspaceTemplatePreviewAction(item.id);
  }
  if (item.source === "custom") {
    return () => loadCustomTemplatePreviewAction(item.id);
  }
  return () => loadChecklistTemplatePreviewAction(item.id);
}

export function ClientAvailableChecklistsList({
  clientId,
  establishment,
  items,
}: Props) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sourceLabel.toLowerCase().includes(q) ||
        item.scopeLabel.toLowerCase().includes(q),
    );
  }, [items, query]);

  if (!establishment) {
    return (
      <section
        className="rounded-xl border border-border bg-white p-4 shadow-xs"
        aria-labelledby="client-available-checklists-heading"
      >
        <h3
          id="client-available-checklists-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          Checklists disponíveis
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Cadastre o estabelecimento deste cliente para ver os modelos
          aplicáveis.
        </p>
        <Link
          href={`/clientes/${clientId}/editar?tab=dados&formTab=pj-estabelecimento`}
          className={cn(buttonVariants({ size: "sm" }), "mt-3")}
        >
          Ir para o estabelecimento
        </Link>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-border bg-white p-4 shadow-xs"
      aria-labelledby="client-available-checklists-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            id="client-available-checklists-heading"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            Checklists disponíveis
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Modelos que podem ser aplicados em {establishment.name}.
          </p>
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">
          {items.length} modelo{items.length === 1 ? "" : "s"}
        </p>
      </div>

      {items.length > SEARCH_THRESHOLD ? (
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modelo…"
            className="pl-8"
            aria-label="Buscar checklists disponíveis"
          />
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum checklist aplicável a este estabelecimento. Crie um modelo da
          equipe vinculado a este cliente ou use o catálogo oficial da UF.
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum modelo encontrado para "{query.trim()}".
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {visible.map((item) => (
            <li key={`${item.source}-${item.id}`}>
              <AvailableChecklistCard
                item={item}
                establishmentId={establishment.id}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AvailableChecklistCard({
  item,
  establishmentId,
}: {
  item: ClientAvailableChecklist;
  establishmentId: string;
}) {
  const applyHref = buildApplyChecklistHref(establishmentId, item);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-xs",
        item.exclusiveToClient
          ? "border-primary/40"
          : "border-border",
      )}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {item.sourceLabel}
            </span>
            <span
              className={cn(
                "inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[11px] font-medium",
                item.exclusiveToClient
                  ? "bg-primary/10 text-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {item.scopeLabel}
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-foreground">
            {item.name}
          </p>
          {item.itemCount != null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {item.requiredItemCount ?? 0}
              </span>{" "}
              obrigatório{(item.requiredItemCount ?? 0) !== 1 ? "s" : ""}
              <span className="text-muted-foreground/40"> · </span>
              <span className="font-semibold text-foreground">
                {item.itemCount}
              </span>{" "}
              {item.itemCount === 1 ? "item" : "itens"}
            </p>
          ) : null}
        </div>
        <Link
          href={applyHref}
          className={cn(
            buttonVariants({ size: "sm" }),
            "w-full shrink-0 sm:w-auto",
          )}
        >
          <ClipboardList className="size-3.5" />
          Aplicar
        </Link>
      </div>
      <ExpandableTemplateSections loadSections={previewLoader(item)} />
    </article>
  );
}
