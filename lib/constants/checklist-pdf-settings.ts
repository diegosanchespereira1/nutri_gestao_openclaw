/** Configurações visuais padrão do PDF de dossiê. */
export type ChecklistPdfSettings = {
  headerBgColor: string;
  headerTextColor: string;
  accentColor: string;
};

export const DEFAULT_PDF_SETTINGS: ChecklistPdfSettings = {
  headerBgColor:   "#1B2A4A",
  headerTextColor: "#FFFFFF",
  accentColor:     "#0EA5E9",
};
