import { NextResponse } from "next/server";

import { runUploadChecklistFillPhoto } from "@/lib/server/checklist-fill-photos-core";

export const runtime = "nodejs";

/**
 * Upload de foto de checklist via multipart (evita erro de Server Action
 * "was not found on the server" em Docker/Traefik ou após deploy com cache antigo).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { ok: false as const, error: "Content-Type inválido." },
      { status: 415 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false as const, error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const result = await runUploadChecklistFillPhoto(formData);
  const status = result.ok ? 200 : 400;
  return NextResponse.json(result, { status });
}
