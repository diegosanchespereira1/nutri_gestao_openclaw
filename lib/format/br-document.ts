/** Formata dígitos de CPF para exibição (sem validar). */
export function formatCpfDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 11) return digits;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Formata dígitos de CNPJ para exibição (sem validar). */
export function formatCnpjDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 14) return digits;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Formata pelo tamanho: 11 dígitos = CPF, 14 = CNPJ. Outro tamanho volta cru. */
export function formatBrDocument(digits: string | null | undefined): string {
  const d = (digits ?? "").replace(/\D/g, "");
  if (d.length === 11) return formatCpfDisplay(d);
  if (d.length === 14) return formatCnpjDisplay(d);
  return d;
}

/**
 * Máscara progressiva para digitação de CPF/CNPJ.
 *
 * Diferente de `formatBrDocument`, que só formata documento completo: aqui o
 * valor parcial já sai pontuado enquanto o utilizador escreve. Quando o tipo
 * ainda não foi escolhido, até 11 dígitos assume CPF e acima disso CNPJ.
 */
export function maskBrDocumentInput(
  kind: "cpf" | "cnpj" | null | undefined,
  value: string,
): string {
  const max = kind === "cpf" ? 11 : 14;
  const d = (value ?? "").replace(/\D/g, "").slice(0, max);
  if (d.length === 0) return "";

  const asCpf = kind === "cpf" || (!kind && d.length <= 11);
  const groups: [number, string][] = asCpf
    ? [
        [3, "."],
        [3, "."],
        [3, "-"],
        [2, ""],
      ]
    : [
        [2, "."],
        [3, "."],
        [3, "/"],
        [4, "-"],
        [2, ""],
      ];

  let out = "";
  let i = 0;
  for (const [size, sep] of groups) {
    if (i >= d.length) break;
    const chunk = d.slice(i, i + size);
    out += chunk;
    i += size;
    if (i < d.length && chunk.length === size) out += sep;
  }
  return out;
}
