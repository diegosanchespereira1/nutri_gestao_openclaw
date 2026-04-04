import { z } from "zod";

import { MAX_DOSSIER_EMAIL_RECIPIENTS } from "@/lib/constants/dossier-email";

const emailSchema = z.string().trim().toLowerCase().email().max(320);

/**
 * Extrai lista única de emails a partir de texto (vírgula, ponto e vírgula ou quebras de linha).
 */
export function parseDossierRecipientEmailsFromText(raw: string): {
  ok: true;
  emails: string[];
} | {
  ok: false;
  error: string;
} {
  const chunk = raw
    .split(/[\s,;]+/u)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of chunk) {
    const r = emailSchema.safeParse(part);
    if (!r.success) {
      return { ok: false, error: `Endereço inválido: ${part}` };
    }
    if (seen.has(r.data)) continue;
    seen.add(r.data);
    emails.push(r.data);
    if (emails.length > MAX_DOSSIER_EMAIL_RECIPIENTS) {
      return {
        ok: false,
        error: `No máximo ${MAX_DOSSIER_EMAIL_RECIPIENTS} destinatários.`,
      };
    }
  }

  return { ok: true, emails };
}
