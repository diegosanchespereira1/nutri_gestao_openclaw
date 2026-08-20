const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type WorkspaceTemplateClientScope = {
  client_id: string | null;
};

/** Nome de exibição do cliente PJ (nome fantasia, senão razão social). */
export function workspaceTemplateClientLabel(client: {
  legal_name: string;
  trade_name: string | null;
}): string {
  const trade = client.trade_name?.trim();
  return trade && trade.length > 0 ? trade : client.legal_name;
}

/**
 * Normaliza o vínculo opcional com cliente.
 * String vazia → `null` (modelo disponível para todos os clientes).
 */
export function normalizeWorkspaceTemplateClientId(
  raw: string | null | undefined,
): { ok: true; clientId: string | null } | { ok: false; error: string } {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length === 0) return { ok: true, clientId: null };
  if (!UUID_RE.test(trimmed)) {
    return { ok: false, error: "Cliente inválido." };
  }
  return { ok: true, clientId: trimmed };
}

/**
 * Catálogo: sem estabelecimento selecionado, mostra todos (com badge).
 * Com estabelecimento, só globais (`client_id` nulo) ou do mesmo cliente.
 */
export function workspaceTemplateVisibleForEstablishmentClient(
  templateClientId: string | null,
  establishmentClientId: string | null,
): boolean {
  if (templateClientId == null) return true;
  if (establishmentClientId == null) return true;
  return templateClientId === establishmentClientId;
}

export function filterWorkspaceTemplatesForEstablishmentClient<
  T extends WorkspaceTemplateClientScope,
>(templates: T[], establishmentClientId: string | null): T[] {
  if (!establishmentClientId) return templates;
  return templates.filter((tpl) =>
    workspaceTemplateVisibleForEstablishmentClient(
      tpl.client_id,
      establishmentClientId,
    ),
  );
}

/** Guard de preenchimento: estabelecimento sempre existe nesta etapa. */
export function workspaceTemplateAllowedForFill(
  templateClientId: string | null,
  establishmentClientId: string,
): boolean {
  return (
    templateClientId == null || templateClientId === establishmentClientId
  );
}
