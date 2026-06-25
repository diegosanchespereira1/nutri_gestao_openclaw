/** Mantém só dígitos do CEP (até 8). */
export function cepDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

/** Formata CEP enquanto o usuário digita (00000-000). */
export function formatCepInput(value: string): string {
  const digits = cepDigits(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
