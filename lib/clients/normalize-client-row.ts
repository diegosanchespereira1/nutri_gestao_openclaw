import { isClientBusinessSegment } from "@/lib/constants/client-business-segment";
import type {
  ClientBusinessSegment,
  ClientLifecycleStatus,
  ClientRow,
  ClientSocialLinks,
} from "@/lib/types/clients";

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

function normalizeBusinessSegment(
  raw: unknown,
): ClientBusinessSegment | null {
  if (typeof raw === "string" && isClientBusinessSegment(raw)) {
    return raw;
  }
  return null;
}

/** Adapta linha vinda do Supabase ao tipo da app (migrações antigas / JSON). */
export function normalizeClientRow(raw: Record<string, unknown>): ClientRow {
  return {
    ...(raw as unknown as ClientRow),
    lifecycle_status: normalizeLifecycle(raw.lifecycle_status),
    business_segment: normalizeBusinessSegment(raw.business_segment),
    social_links: normalizeSocialLinks(raw.social_links),
  };
}
