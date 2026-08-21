import { NextResponse } from "next/server";

import { loadAreasForEstablishment } from "@/lib/actions/establishment-areas";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const rows = await loadAreasForEstablishment(id);
  return NextResponse.json({ rows });
}
