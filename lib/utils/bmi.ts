/** IMC = kg / m²; devolve null se altura ou peso inválidos. */
export function computeBmi(heightCm: number, weightKg: number): number | null {
  if (
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm <= 0 ||
    weightKg <= 0
  ) {
    return null;
  }
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  if (!Number.isFinite(bmi)) return null;
  return Math.round(bmi * 10) / 10;
}
