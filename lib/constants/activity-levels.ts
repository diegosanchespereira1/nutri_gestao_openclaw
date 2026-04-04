export type ActivityLevel = "sedentary" | "light" | "moderate" | "high";

export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "high",
] as const;

export const activityLevelLabel: Record<ActivityLevel, string> = {
  sedentary: "Sedentário",
  light: "Leve",
  moderate: "Moderado",
  high: "Elevado",
};

export function parseActivityLevel(raw: unknown): ActivityLevel | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  return ACTIVITY_LEVELS.includes(raw as ActivityLevel)
    ? (raw as ActivityLevel)
    : null;
}
