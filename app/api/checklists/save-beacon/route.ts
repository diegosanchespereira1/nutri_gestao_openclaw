import { NextResponse } from "next/server";

import { saveFillResponsesBatch } from "@/lib/actions/checklist-fill";

export const runtime = "nodejs";

/**
 * Endpoint chamado por `navigator.sendBeacon` quando o utilizador fecha a aba
 * ou recarrega a página durante o preenchimento de um checklist.
 *
 * sendBeacon envia POST com Content-Type application/json e corpo em texto;
 * o browser garante a entrega mesmo após o evento `beforeunload`.
 *
 * Retorna sempre 204 para não bloquear o beacon (a resposta é ignorada pelo browser).
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    const text = await request.text();
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  if (!body || typeof body !== "object") {
    return new NextResponse(null, { status: 204 });
  }

  const {
    sessionId,
    itemResponseSource,
    entries,
  } = body as Record<string, unknown>;

  if (
    typeof sessionId !== "string" ||
    (itemResponseSource !== "global" &&
      itemResponseSource !== "custom" &&
      itemResponseSource !== "workspace") ||
    !Array.isArray(entries)
  ) {
    return new NextResponse(null, { status: 204 });
  }

  // Executa de forma best-effort — falhas não retornam erro ao beacon.
  try {
    await saveFillResponsesBatch({
      sessionId,
      itemResponseSource,
      entries: entries as Parameters<typeof saveFillResponsesBatch>[0]["entries"],
      persistMode: "merge",
      withRevalidate: false,
    });
  } catch (err) {
    console.error("[save-beacon] erro ao salvar rascunho via beacon", err);
  }

  return new NextResponse(null, { status: 204 });
}
