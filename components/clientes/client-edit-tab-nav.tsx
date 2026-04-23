import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  clientEditTabHref,
  type ClientEditTabValue,
  resolveClientEditTab,
} from "@/lib/clientes/client-edit-tab";

type SearchSnap = {
  tab?: string;
  contractErr?: string;
  est?: string;
  status?: string;
  page?: string;
};

type Props = {
  clientId: string;
  kind: "pf" | "pj";
  searchParams: SearchSnap;
};

export function ClientEditTabNav({ clientId, kind, searchParams }: Props) {
  const active = resolveClientEditTab(searchParams.tab, kind);
  const contractErr = searchParams.contractErr;
  const checklistSnap = {
    est: searchParams.est,
    status: searchParams.status,
    page: searchParams.page,
  };

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
    <nav
      className="border-border bg-muted/70 mb-6 inline-flex min-h-10 w-full max-w-full flex-wrap gap-1 rounded-lg border p-1 shadow-inner"
      aria-label="Secções do cliente"
    >
      {tabs.map(({ value, label }) => {
        const href = clientEditTabHref(clientId, value, {
          contractErr,
          checklist: value === "checklists" ? checklistSnap : undefined,
        });
        const isActive = active === value;
        return (
          <Link
            key={value}
            href={href}
            scroll={false}
            className={cn(
              "ring-offset-background focus-visible:ring-ring inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-center text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:flex-none",
              "border-border/80 bg-card text-foreground/80 shadow-xs touch-manipulation",
              "hover:border-primary/45 hover:bg-primary/18 hover:text-foreground",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground"
                : "",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
