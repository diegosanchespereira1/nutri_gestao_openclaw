import { NextResponse } from "next/server";

import {
  loadEstablishmentPickerOptionById,
  loadOwnerChecklistEstablishmentsDropdown,
  searchOwnerEstablishments,
} from "@/lib/establishments/picker-query";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const dropdown = searchParams.get("dropdown") === "1";
  const q = searchParams.get("q")?.trim() ?? "";

  if (id) {
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }
    const row = await loadEstablishmentPickerOptionById(id);
    return NextResponse.json({ row });
  }

  if (dropdown) {
    const limit = Number(searchParams.get("limit") ?? "80");
    const offset = Number(searchParams.get("offset") ?? "0");
    const result = await loadOwnerChecklistEstablishmentsDropdown({
      limit: Number.isFinite(limit) ? limit : 80,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    return NextResponse.json(result);
  }

  if (q.length < 3) {
    return NextResponse.json({ rows: [] });
  }

  const limit = Number(searchParams.get("limit") ?? "12");
  const result = await searchOwnerEstablishments({
    query: q,
    limit: Number.isFinite(limit) ? limit : 12,
  });
  return NextResponse.json(result);
}
