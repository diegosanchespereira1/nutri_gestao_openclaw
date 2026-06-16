/**
 * CMB — Circunferência Muscular do Braço (cm).
 *
 * CMB = CB − (DCT × 0,314)
 * Referência: Gurney JM & Jelliffe DB, 1973.
 *
 * @param cbCm  Circunferência do braço em centímetros.
 * @param dctMm Dobra cutânea tricipital em milímetros.
 * @returns CMB em centímetros, ou null se algum input for null.
 */
export function calcCMB(cbCm: number | null, dctMm: number | null): number | null {
  if (cbCm === null || dctMm === null) return null;
  return cbCm - dctMm * 0.314;
}
