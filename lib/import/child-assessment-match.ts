// Chave de casamento paciente↔linha usada em toda a importação de avaliações
// infantis: nome normalizado + data de nascimento (AAAA-MM-DD). Compartilhada entre
// a página (Server Component, para pré-carregar avaliações existentes), o parser
// client-side (pré-visualização) e a Server Action (defesa em profundidade), para
// garantir que os três lugares casam pacientes exatamente da mesma forma.

/** Nome sem espaços nas pontas, minúsculo — não removemos acentos para não colidir nomes diferentes. */
export function matchChildKey(fullName: string, birthDate: string): string {
  return `${fullName.trim().toLowerCase()}|${birthDate}`;
}

// ── Pré-visualização: casamento + alerta de possível duplicidade ───────────
// Plano: docs/plano-preview-casamento-importacao-infantil.md
//
// A Server Action continua sendo a única fonte da verdade para o casamento real
// (sempre por matchChildKey, nunca por este "quase igual"). O que vive aqui é só
// para AVISAR o usuário antes de confirmar — nunca decide sozinho.

/** Paciente do tenant, com o suficiente para exibir e comparar vínculo na pré-visualização. */
export type ChildPatientMatchCandidate = {
  id: string;
  full_name: string;
  birth_date: string;
  client_id: string | null;
  establishment_id: string | null;
};

/** Minúsculas + sem acento + espaços colapsados — só para achar duplicidade
 *  PROVÁVEL (grafia diferente: acento, espaço extra). Nunca usado para casar
 *  automaticamente — isso continua sendo `matchChildKey` (exato). */
export function normalizeNameForFuzzyMatch(fullName: string): string {
  return fullName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export type ChildRowMatchStatus =
  | { kind: "new" }
  | { kind: "matched"; patient: ChildPatientMatchCandidate }
  | { kind: "near_duplicate"; candidate: ChildPatientMatchCandidate }
  | { kind: "cross_link"; patient: ChildPatientMatchCandidate };

/**
 * Resolve, para a pré-visualização, o que vai acontecer com uma linha:
 * - "matched": bate exatamente com um paciente já cadastrado (mesmo casamento que
 *   a Server Action vai fazer) — se o vínculo (cliente) deste lote for diferente
 *   do cliente do paciente encontrado, vira "cross_link" em vez de "matched".
 * - "near_duplicate": não bate exatamente, mas tem a mesma data de nascimento e o
 *   nome sem acento é igual a um paciente já cadastrado — provável mesma criança
 *   com grafia diferente. A Server Action, hoje, trataria isso como paciente NOVO
 *   (cadastro duplicado) — por isso o alerta.
 * - "new": não encontrou nada parecido — cadastro novo mesmo.
 */
export function resolveChildRowMatchStatus(
  row: { full_name: string; birth_date: string },
  allPatients: ChildPatientMatchCandidate[],
  patientByExactKey: Map<string, ChildPatientMatchCandidate>,
  link: { clientId: string | null; establishmentId: string | null } | null,
): ChildRowMatchStatus {
  const exact = patientByExactKey.get(matchChildKey(row.full_name, row.birth_date));
  if (exact) {
    const linkClientId = link?.clientId ?? null;
    if (exact.client_id !== linkClientId) {
      return { kind: "cross_link", patient: exact };
    }
    return { kind: "matched", patient: exact };
  }

  const normalizedRow = normalizeNameForFuzzyMatch(row.full_name);
  const candidate = allPatients.find(
    (p) =>
      p.birth_date === row.birth_date &&
      normalizeNameForFuzzyMatch(p.full_name) === normalizedRow,
  );
  if (candidate) return { kind: "near_duplicate", candidate };

  return { kind: "new" };
}
