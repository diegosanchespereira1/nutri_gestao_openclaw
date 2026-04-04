/** Remove tudo exceto dígitos. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function cpfCheckDigit(base: string, factorStart: number): number {
  let sum = 0;
  let factor = factorStart;
  for (let i = 0; i < base.length; i++) {
    sum += parseInt(base[i]!, 10) * factor;
    factor -= 1;
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function isValidCpf(digits: string): boolean {
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const d1 = cpfCheckDigit(digits.slice(0, 9), 10);
  if (d1 !== parseInt(digits[9]!, 10)) return false;
  const d2 = cpfCheckDigit(digits.slice(0, 10), 11);
  return d2 === parseInt(digits[10]!, 10);
}

function cnpjCheckDigit(base: string, factors: number[]): number {
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    sum += parseInt(base[i]!, 10) * factors[i]!;
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const f1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const f2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = cnpjCheckDigit(digits.slice(0, 12), f1);
  if (d1 !== parseInt(digits[12]!, 10)) return false;
  const d2 = cnpjCheckDigit(digits.slice(0, 13), f2);
  return d2 === parseInt(digits[13]!, 10);
}
