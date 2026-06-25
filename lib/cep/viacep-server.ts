import type { ViaCepAddress } from "@/lib/cep/viacep";
import { cepDigits } from "@/lib/format/cep";

type ViaCepRaw = ViaCepAddress & { erro?: boolean };

/**
 * Consulta endereço pelo CEP na ViaCEP (somente servidor — sem restrição de CSP).
 */
export async function fetchAddressByCepFromViaCep(
  cep: string,
): Promise<ViaCepAddress | null> {
  const digits = cepDigits(cep);
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as ViaCepRaw;
    if (data.erro) return null;

    return {
      cep: data.cep,
      logradouro: data.logradouro ?? "",
      complemento: data.complemento ?? "",
      bairro: data.bairro ?? "",
      localidade: data.localidade ?? "",
      uf: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
