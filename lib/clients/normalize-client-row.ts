import type { ClientLifecycleStatus, ClientRow, ClientSocialLinks } from "@/lib/types/clients";

function normalizeSocialLinks(raw: unknown): ClientSocialLinks {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return raw as ClientSocialLinks;
}

function normalizeLifecycle(raw: unknown): ClientLifecycleStatus {
  if (raw === "inativo" || raw === "finalizado" || raw === "ativo") {
    return raw;
  }
  return "ativo";
}

/** Adapta linha vinda do Supabase ao tipo da app (migrações antigas / JSON). */
export function normalizeClientRow(raw: Record<string, unknown>): ClientRow {
  return {
    ...(raw as unknown as ClientRow),
    lifecycle_status: normalizeLifecycle(raw.lifecycle_status),
    social_links: normalizeSocialLinks(raw.social_links),
  };
}
