"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  clientEditTabHref,
  type ClientEditTabValue,
} from "@/lib/clientes/client-edit-tab";

export type ClientEditTabShellPanels = {
  dados: React.ReactNode;
  financeiro: React.ReactNode;
  checklists?: React.ReactNode | null;
};

type Props = {
  clientId: string;
  kind: "pf" | "pj";
  initialTab: ClientEditTabValue;
  contractErr?: string;
  checklistQuery?: { est?: string; status?: string; page?: string };
  panels: ClientEditTabShellPanels;
};

const TAB_BTN =
  "ring-offset-background focus-visible:ring-ring inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-center text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:flex-none border-border/80 bg-card text-foreground/80 shadow-xs touch-manipulation hover:border-primary/45 hover:bg-primary/18 hover:text-foreground";

function panelVisibleClass(active: ClientEditTabValue, panel: ClientEditTabValue) {
  return active === panel ? "block" : "hidden";
}

export function ClientEditTabShell({
  clientId,
  kind,
  initialTab,
  contractErr,
  checklistQuery,
  panels,
}: Props) {
  const [tab, setTab] = useState<ClientEditTabValue>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const checklistOpts = useMemo(
    () => ({ est: checklistQuery?.est, status: checklistQuery?.status, page: checklistQuery?.page }),
    [checklistQuery?.est, checklistQuery?.page, checklistQuery?.status],
  );

  const replaceUrlForTab = useCallback(
    (next: ClientEditTabValue) => {
      const href = clientEditTabHref(clientId, next, {
        contractErr,
        checklist: next === "checklists" ? checklistOpts : undefined,
      });
      window.history.replaceState(null, "", href);
    },
    [checklistOpts, clientId, contractErr],
  );

  const goTab = useCallback(
    (next: ClientEditTabValue) => {
      setTab(next);
      replaceUrlForTab(next);
    },
    [replaceUrlForTab],
  );

  useEffect(() => {
    const onPopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const raw = sp.get("tab");
      const resolved =
        raw === "contratos"
          ? "financeiro"
          : raw === "estabelecimento"
            ? "dados"
            : raw === "financeiro" || raw === "checklists"
              ? raw
              : "dados";
      const allowed: ClientEditTabValue[] =
        kind === "pj" ? ["dados", "financeiro", "checklists"] : ["dados", "financeiro"];
      setTab(allowed.includes(resolved as ClientEditTabValue) ? (resolved as ClientEditTabValue) : "dados");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [kind]);

  const tabs: { value: ClientEditTabValue; label: string }[] =
    kind === "pj"
      ? [
          { value: "dados", label: "Dados do cliente" },
          { value: "financeiro", label: "Financeiro" },
          { value: "checklists", label: "Checklists" },
        ]
      : [
          { value: "dados", label: "Dados do cliente" },
          { value: "financeiro", label: "Financeiro" },
        ];

  return (
    <div className="space-y-6">
      <nav
        className="border-border bg-muted/70 mb-6 inline-flex min-h-10 w-full max-w-full flex-wrap gap-1 rounded-lg border p-1 shadow-inner"
        aria-label="Secções do cliente"
      >
        {tabs.map(({ value, label }) => {
          const isActive = tab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => goTab(value)}
              className={cn(
                TAB_BTN,
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  : "",
              )}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <div className={panelVisibleClass(tab, "dados")}>{panels.dados}</div>
      <div className={panelVisibleClass(tab, "financeiro")}>{panels.financeiro}</div>
      {kind === "pj" && panels.checklists != null ? (
        <div className={panelVisibleClass(tab, "checklists")}>{panels.checklists}</div>
      ) : null}
    </div>
  );
}
