/**
 * Aviso de CNPJ/CPF repetido no cadastro de cliente — sem bloquear.
 *
 * POR QUE NÃO É UMA CONSTRAINT: uma empresa com um único CNPJ pode ter várias
 * unidades, e é assim que o sistema é usado. Em produção (2026-08-31) existem
 * três plantas da mesma indústria sob o mesmo CNPJ de matriz, cada uma com os
 * seus checklists. Um índice único em (owner_user_id, document_id) impediria
 * cadastrar a Planta 4.
 *
 * A unicidade que faz sentido no negócio é por UNIDADE — e unidade é o
 * estabelecimento, não o cliente. Então aqui só avisamos: quem cadastra decide
 * se é uma unidade nova ou uma duplicação por engano.
 */
export type DuplicateDocumentClient = {
  id: string;
  legal_name: string;
  trade_name: string | null;
};

export type DuplicateDocumentWarning = {
  kind: "duplicate_document";
  documentLabel: string;
  existing: DuplicateDocumentClient[];
  message: string;
};

/** Como cada cadastro existente aparece na lista do aviso. */
export function describeExistingClient(c: DuplicateDocumentClient): string {
  const fantasia = c.trade_name?.trim();
  return fantasia && fantasia !== c.legal_name
    ? `${c.legal_name} (${fantasia})`
    : c.legal_name;
}

export function buildDuplicateDocumentWarning(
  documentLabel: string,
  existing: DuplicateDocumentClient[],
): DuplicateDocumentWarning | null {
  if (existing.length === 0) return null;

  const lista = existing.map(describeExistingClient).join(", ");
  const message =
    existing.length === 1
      ? `Já existe um cliente com o documento ${documentLabel} nesta conta: ${lista}. Se for outra unidade da mesma empresa, pode continuar.`
      : `Já existem ${existing.length} clientes com o documento ${documentLabel} nesta conta: ${lista}. Se for outra unidade da mesma empresa, pode continuar.`;

  return { kind: "duplicate_document", documentLabel, existing, message };
}
