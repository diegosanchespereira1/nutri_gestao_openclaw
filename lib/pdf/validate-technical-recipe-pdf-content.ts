import { pdfContainsText } from "./pdf-literal-text";

const CLASSIFICATION_PDF_LABELS: Record<string, string> = {
  bebida: "Bebida",
  entrada: "Entrada",
  "prato-principal": "Prato principal",
  sobremesa: "Sobremesa",
};

export type SavedRecipeSnapshot = {
  name: string;
  classification: string;
  sector: string;
  portionsYield: string;
  cmvPercent: string;
  lines: Array<{
    ingredient: string;
    quantity: string;
    notes: string;
  }>;
};

function normalizeQuantityForPdf(qty: string): string {
  const n = parseFloat(qty.replace(",", "."));
  if (!Number.isFinite(n)) return qty.trim();
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Valida que o PDF da ficha técnica contém os dados salvos da receita. */
export async function validateTechnicalRecipePdfContent(
  pdfBytes: Buffer,
  saved: SavedRecipeSnapshot,
): Promise<void> {
  const missing: string[] = [];

  if (pdfBytes.byteLength <= 500) {
    missing.push("PDF vazio ou inválido");
  } else if (
    String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]) !==
    "%PDF"
  ) {
    missing.push("cabeçalho %PDF ausente");
  }

  async function requireText(label: string, needle: string) {
    if (!(await pdfContainsText(pdfBytes, needle))) {
      missing.push(`${label} ("${needle}")`);
    }
  }

  await requireText("subtítulo da ficha", "Ficha técnica de preparação");
  await requireText("secção Itens do preparo", "Itens do preparo");
  await requireText("nome da receita", saved.name);
  await requireText("setor", saved.sector);
  await requireText("estado publicado", "Produto de venda");

  const classificationLabel =
    CLASSIFICATION_PDF_LABELS[saved.classification] ?? saved.classification;
  if (classificationLabel.trim()) {
    await requireText("classificação", classificationLabel);
  }

  await requireText("rendimento", saved.portionsYield);

  for (const [index, line] of saved.lines.entries()) {
    await requireText(`ingrediente ${index + 1}`, line.ingredient);
    await requireText(
      `quantidade ${index + 1}`,
      normalizeQuantityForPdf(line.quantity),
    );
    if (line.notes.trim()) {
      await requireText(`notas ${index + 1}`, line.notes);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `PDF da ficha técnica não contém os dados esperados: ${missing.join("; ")}`,
    );
  }
}
