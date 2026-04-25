/**
 * Encadeamento de sessões quando o utilizador inicia o mesmo checklist para várias áreas.
 * Os IDs são gravados no sessionStorage ao criar o lote (catálogo); após aprovar um dossiê,
 * o wizard pergunta se deseja abrir a próxima sessão.
 */

const STORAGE_KEY = "nutrigestao_checklist_fill_batch";

export type ChecklistFillBatchItem = {
  sessionId: string;
  areaId: string | null;
  areaName: string | null;
};

export type ChecklistFillBatchPayload = {
  templateId: string;
  establishmentId: string;
  items: ChecklistFillBatchItem[];
};

export function saveChecklistFillBatch(payload: ChecklistFillBatchPayload): void {
  if (typeof window === "undefined") return;
  if (payload.items.length < 2) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function loadChecklistFillBatch(): ChecklistFillBatchPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ChecklistFillBatchPayload;
    if (!p?.items?.length || p.items.length < 2) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearChecklistFillBatch(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Próximo item do lote após a sessão atual (ordem de criação). */
export function getNextBatchItemAfterSession(
  currentSessionId: string,
): ChecklistFillBatchItem | null {
  const batch = loadChecklistFillBatch();
  if (!batch) return null;
  const idx = batch.items.findIndex((i) => i.sessionId === currentSessionId);
  if (idx < 0 || idx >= batch.items.length - 1) return null;
  return batch.items[idx + 1] ?? null;
}
