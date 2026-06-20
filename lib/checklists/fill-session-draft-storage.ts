import type { FillResponsesMap } from "@/lib/types/checklist-fill";

const STORAGE_KEY_PREFIX = "ng_checklist_fill_draft:";

export type FillSessionDraftPayload = {
  v: 1;
  savedAt: string;
  responses: FillResponsesMap;
};

export function persistFillSessionDraft(
  sessionId: string,
  responses: FillResponsesMap,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: FillSessionDraftPayload = {
      v: 1,
      savedAt: new Date().toISOString(),
      responses,
    };
    window.localStorage.setItem(
      STORAGE_KEY_PREFIX + sessionId,
      JSON.stringify(payload),
    );
  } catch {
    // quota / modo privado
  }
}

export function loadFillSessionDraft(sessionId: string): FillSessionDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FillSessionDraftPayload;
    if (parsed?.v !== 1 || !parsed.responses) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearFillSessionDraft(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_PREFIX + sessionId);
  } catch {
    // ignore
  }
}
