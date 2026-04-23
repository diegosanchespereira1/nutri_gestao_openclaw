export type ClientEditTabValue = "dados" | "financeiro" | "checklists";

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
