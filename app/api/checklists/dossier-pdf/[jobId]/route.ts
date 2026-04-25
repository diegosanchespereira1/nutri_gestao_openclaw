import { NextResponse } from "next/server";

import {
  contentDispositionWithFilename,
  resolveChecklistDossierPdfFilename,
} from "@/lib/checklist-dossier-pdf-filename";
import { CHECKLIST_DOSSIER_PDFS_BUCKET } from "@/lib/constants/checklist-dossier-pdf";
import { createClient } from "@/lib/supabase/server";

/**
 * Entrega o PDF do dossiê pela origem da app (sem expor URL assinada do Supabase
 * na barra de endereço ou em atributos download do cliente).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const asDownload = new URL(request.url).searchParams.get("download") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { data: row, error: rowErr } = await supabase
    .from("checklist_fill_pdf_exports")
    .select("id, status, storage_path, session_id")
    .eq("id", jobId)
    .maybeSingle();

  if (rowErr || !row || row.status !== "ready" || !row.storage_path) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from(CHECKLIST_DOSSIER_PDFS_BUCKET)
    .download(row.storage_path as string);

  if (dlErr || !blob) {
    return NextResponse.json(
      { error: "Não foi possível obter o ficheiro." },
      { status: 500 },
    );
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  const filename =
    (await resolveChecklistDossierPdfFilename(supabase, jobId)) ??
    `dossie-checklist-${String(row.session_id ?? "export")
      .replace(/[^a-z0-9-]/gi, "-")
      .slice(0, 36)}.pdf`;
  const dispositionKind = asDownload ? "attachment" : "inline";

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionWithFilename(
        dispositionKind,
        filename,
      ),
      "Cache-Control": "private, no-store",
    },
  });
}
