import { NextResponse } from "next/server";

import { contentDispositionWithFilename } from "@/lib/checklist-dossier-pdf-filename";
import { buildTechnicalRecipePdfExport } from "@/lib/pdf/technical-recipe-pdf-export";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const asDownload = new URL(request.url).searchParams.get("download") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const exportResult = await buildTechnicalRecipePdfExport(id);
  if (!exportResult) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  const dispositionKind = asDownload ? "attachment" : "inline";

  return new NextResponse(Buffer.from(exportResult.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionWithFilename(
        dispositionKind,
        exportResult.filename,
      ),
      "Cache-Control": "private, no-store",
    },
  });
}
