export type ClientEditTabValue = "dados" | "financeiro" | "checklists";

export const clientEditTabButtonClassName =
  "ring-offset-background focus-visible:ring-ring inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-center text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:flex-none border-border/80 bg-card text-foreground/80 shadow-xs touch-manipulation hover:border-primary/45 hover:bg-primary/18 hover:text-foreground";

export const clientEditTabActiveClassName =
  "border-primary bg-primary text-primary-foreground shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground";

const VALID_PF: ClientEditTabValue[] = ["dados", "financeiro"];
const VALID_PJ: ClientEditTabValue[] = ["dados", "financeiro", "checklists"];

export function resolveClientEditTab(
  tab: string | undefined | null,
  kind: "pf" | "pj",
): ClientEditTabValue {
  if (tab === "contratos") return "financeiro";
  if (tab === "estabelecimento") return "dados";
  const allowed = kind === "pj" ? VALID_PJ : VALID_PF;
  if (tab && (allowed as string[]).includes(tab)) {
    return tab as ClientEditTabValue;
  }
  return "dados";
}

export function clientEditTabHref(
  clientId: string,
  target: ClientEditTabValue,
  options: {
    contractErr?: string;
    /** Preservar filtros só quando o destino é checklists */
    checklist?: { est?: string; status?: string; page?: string };
  } = {},
): string {
  const p = new URLSearchParams();
  if (options.contractErr) p.set("contractErr", options.contractErr);
  if (target !== "dados") p.set("tab", target);
  if (target === "checklists" && options.checklist) {
    const { est, status, page } = options.checklist;
    if (est) p.set("est", est);
    if (status) p.set("status", status);
    if (page) p.set("page", page);
  }
  const qs = p.toString();
  return `/clientes/${clientId}/editar${qs ? `?${qs}` : ""}`;
}
