/** Configurações do dossiê de checklist por workspace. */
export type ChecklistPdfSettings = {
  headerBgColor: string;
  headerTextColor: string;
  accentColor: string;
  /** Quando true, exige assinatura do cliente/responsável ao aprovar o dossiê. */
  clientSignatureRequired: boolean;
};

export const DEFAULT_PDF_SETTINGS: ChecklistPdfSettings = {
  headerBgColor:   "#1B2A4A",
  headerTextColor: "#FFFFFF",
  accentColor:     "#0EA5E9",
  clientSignatureRequired: true,
};
