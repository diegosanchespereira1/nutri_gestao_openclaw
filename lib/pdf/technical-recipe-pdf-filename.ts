import { formatChecklistDossierApprovalDate } from "@/lib/checklist-dossier-pdf-filename";

function sanitizeRecipeNameForFilename(raw: string, maxLen: number): string {
  const cleaned = raw
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const cut = cleaned.slice(0, maxLen).trim();
  return cut.length > 0 ? cut : "Receita";
}

/** Nome do ficheiro: «Nome da receita DD-MM-AAAA.pdf» (data = última modificação, SP). */
export function buildTechnicalRecipePdfFilename(input: {
  recipeName: string;
  updatedAtIso: string;
}): string {
  const namePart = sanitizeRecipeNameForFilename(input.recipeName, 100);
  const datePart = formatChecklistDossierApprovalDate(input.updatedAtIso);
  return `${namePart} ${datePart}.pdf`;
}
