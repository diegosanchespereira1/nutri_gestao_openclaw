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
