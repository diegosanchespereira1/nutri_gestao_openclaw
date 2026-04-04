import type { SupabaseClient } from "@supabase/supabase-js";

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
};

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
    sections: input.template.sections.map((sec) => ({
      title: sec.title,
      items: sec.items.map((it) => {
        const r = input.responses[it.id] ?? {
          outcome: null,
          note: null,
          annotation: null,
        };
        return {
          description: it.description,
          outcome: r.outcome,
          note: r.note,
          annotation: r.annotation,
        };
      }),
    })),
  };

  return buildDossierPdfBytes(pdfInput);
}
