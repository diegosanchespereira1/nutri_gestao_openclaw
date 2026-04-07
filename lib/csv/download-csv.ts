/** Gera ficheiro .csv (UTF-8 com BOM) e inicia descarga no browser. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  separator: "," | ";" = ",",
): void {
  const esc = (cell: string | number) =>
    `"${String(cell).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(separator),
    ...rows.map((r) => r.map(esc).join(separator)),
  ];
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
