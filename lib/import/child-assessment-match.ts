// Chave de casamento paciente↔linha usada em toda a importação de avaliações
// infantis: nome normalizado + data de nascimento (AAAA-MM-DD). Compartilhada entre
// a página (Server Component, para pré-carregar avaliações existentes), o parser
// client-side (pré-visualização) e a Server Action (defesa em profundidade), para
// garantir que os três lugares casam pacientes exatamente da mesma forma.

/** Nome sem espaços nas pontas, minúsculo — não removemos acentos para não colidir nomes diferentes. */
export function matchChildKey(fullName: string, birthDate: string): string {
  return `${fullName.trim().toLowerCase()}|${birthDate}`;
}
