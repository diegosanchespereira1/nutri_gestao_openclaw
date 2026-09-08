"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  clientEditTabActiveClassName,
  clientEditTabButtonClassName,
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
  /** Link para a lista de pacientes do estabelecimento — null quando o cliente
   *  PJ ainda não tem estabelecimento cadastrado, ou o cliente é PF (nesse caso
   *  os pacientes ficam na própria aba "Dados do cliente"). */
  pacientesHref?: string | null;
  /** Escola: atalho para o consolidado nutricional no mesmo trilho de abas. */
  showNutritionOverview?: boolean;
  panels: ClientEditTabShellPanels;
};

function panelVisibleClass(active: ClientEditTabValue, panel: ClientEditTabValue) {
  return active === panel ? "block" : "hidden";
}

export function ClientEditTabShell({
  clientId,
  kind,
  initialTab,
  contractErr,
  checklistQuery,
  pacientesHref,
  showNutritionOverview = false,
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
                clientEditTabButtonClassName,
                isActive ? clientEditTabActiveClassName : "",
              )}
            >
              {label}
            </button>
          );
        })}
        {showNutritionOverview ? (
          <Link
            href={`/clientes/${clientId}/visao-nutricional`}
            className={cn(clientEditTabButtonClassName, "gap-1.5")}
          >
            Visão nutricional
          </Link>
        ) : null}
        {kind === "pj" ? (
          <Link
            href={`/ficha-tecnica?cliente=${encodeURIComponent(clientId)}`}
            className={cn(clientEditTabButtonClassName, "gap-1.5")}
          >
            <ClipboardList className="size-3.5" aria-hidden />
            Ficha técnica
          </Link>
        ) : null}
        {pacientesHref ? (
          <Link href={pacientesHref} className={cn(clientEditTabButtonClassName, "gap-1.5")}>
            <Users className="size-3.5" aria-hidden />
            Pacientes
          </Link>
        ) : null}
      </nav>

      <div className={panelVisibleClass(tab, "dados")}>{panels.dados}</div>
      <div className={panelVisibleClass(tab, "financeiro")}>{panels.financeiro}</div>
      {kind === "pj" && panels.checklists != null ? (
        <div className={panelVisibleClass(tab, "checklists")}>{panels.checklists}</div>
      ) : null}
    </div>
  );
}
