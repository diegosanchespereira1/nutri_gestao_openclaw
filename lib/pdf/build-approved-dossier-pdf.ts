import type { SupabaseClient } from "@supabase/supabase-js";

import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
import { buildDossierPdfBytes, foldTextForPdf } from "@/lib/pdf/dossier-pdf";
import type { FillResponsesMap } from "@/lib/types/checklist-fill";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

export function formatApprovedAtForDossierPdf(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-PT", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export type ApprovedDossierPdfBundleInput = {
  template: ChecklistTemplateWithSections;
  responses: FillResponsesMap;
  establishmentLabel: string;
  dossierApprovedAtIso: string;
  itemPhotos?: Record<string, ChecklistFillPhotoView[]>;
};

async function downloadImageAsJpeg(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (e) {
    console.error("Erro ao baixar imagem:", e);
    return null;
  }
}

export async function buildApprovedDossierPdfBytes(
  supabase: SupabaseClient,
  userId: string,
  input: ApprovedDossierPdfBundleInput,
): Promise<Uint8Array> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, crn")
    .eq("id", userId)
    .maybeSingle();

  const professionalName = foldTextForPdf(
    String(profile?.full_name ?? "").trim() || "Profissional",
  );
  const crn = foldTextForPdf(String(profile?.crn ?? "").trim());

  const pdfInput = {
    templateName: input.template.name,
    establishmentLabel: input.establishmentLabel,
    approvedAtLabel: formatApprovedAtForDossierPdf(input.dossierApprovedAtIso),
    professionalName,
    crn,
    sections: await Promise.all(
      input.template.sections.map(async (sec) => ({
        title: sec.title,
        items: await Promise.all(
          sec.items.map(async (it) => {
            const r = input.responses[it.id] ?? {
              outcome: null,
              note: null,
              annotation: null,
            };
            const photos = input.itemPhotos?.[it.id] ?? [];
            
            // Baixar imagens
            const photoBuffers: Buffer[] = [];
            for (const photo of photos) {
              const buffer = await downloadImageAsJpeg(photo.url);
              if (buffer) {
                photoBuffers.push(buffer);
              }
            }
            
            return {
              description: it.description,
              outcome: r.outcome,
              note: r.note,
              annotation: r.annotation,
              photoBuffers,
            };
          }),
        ),
      })),
    ),
  };

  return buildDossierPdfBytes(pdfInput);
}
