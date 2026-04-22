import { CLIENT_EXAMS_BUCKET } from "@/lib/constants/client-exams-storage";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: doc, error } = await supabase
    .from("client_exam_documents")
    .select("storage_path, client_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("owner_user_id")
    .eq("id", doc.client_id)
    .maybeSingle();

  if (!clientRow || clientRow.owner_user_id !== workspaceOwnerId) {
    return NextResponse.json({ error: "Proibido." }, { status: 403 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(CLIENT_EXAMS_BUCKET)
    .createSignedUrl(doc.storage_path, 120);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "Armazenamento." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
