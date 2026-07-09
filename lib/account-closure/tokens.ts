import crypto from "crypto";

export const ACCOUNT_CLOSURE_CONFIRMATION_HOURS = 24;

export function hashClosureToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function createClosureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function closureTokenExpiresAt(
  hours = ACCOUNT_CLOSURE_CONFIRMATION_HOURS,
): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
