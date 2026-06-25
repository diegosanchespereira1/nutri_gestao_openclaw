import { NextResponse } from "next/server";

import { fetchAddressByCepFromViaCep } from "@/lib/cep/viacep-server";
import { cepDigits } from "@/lib/format/cep";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cep: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { cep } = await context.params;
  const digits = cepDigits(cep);
  if (digits.length !== 8) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  const address = await fetchAddressByCepFromViaCep(digits);
  if (!address) {
    return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
  }

  return NextResponse.json(address, {
    headers: {
      "cache-control": "private, max-age=3600",
    },
  });
}
