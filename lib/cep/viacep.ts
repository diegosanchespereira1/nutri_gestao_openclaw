import { cepDigits } from "@/lib/format/cep";

export type ViaCepAddress = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
};

/**
 * Consulta endereço pelo CEP via rota interna `/api/cep` (respeita CSP do app).
 */
export async function lookupCepByViaCep(
  cep: string,
): Promise<ViaCepAddress | null> {
  const digits = cepDigits(cep);
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`/api/cep/${digits}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) return null;

    return (await res.json()) as ViaCepAddress;
  } catch {
    return null;
  }
}
