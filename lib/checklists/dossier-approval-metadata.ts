/** Data e hora da aprovação do dossiê (fuso America/Sao_Paulo). */
export function formatDossierApprovedAtPtBr(
  iso: string,
  options?: { includeSeconds?: boolean },
): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(options?.includeSeconds ? { second: "2-digit" } : {}),
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Linha de auditoria: data/hora + IP do dispositivo no momento da aprovação. */
export function formatDossierApprovalAuditLine(
  iso: string,
  clientIp?: string | null,
): string {
  const when = formatDossierApprovedAtPtBr(iso, { includeSeconds: true });
  const ip = clientIp?.trim() || "desconhecido";
  return `${when} · IP ${ip}`;
}
