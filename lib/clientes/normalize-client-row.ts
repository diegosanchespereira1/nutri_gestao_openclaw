import { isClientBusinessSegment } from "@/lib/constants/client-business-segment";
import type {
  ClientBusinessSegment,
  ClientKind,
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

function normalizeClientKind(raw: unknown): ClientKind {
  if (raw === "pj" || raw === "pf") return raw;
  return "pf";
}

/** Dados leves para cabeçalho / tabs — query rápida na fase 1 da edição. */
export type ClientEditShell = Pick<
  ClientRow,
  "id" | "kind" | "legal_name" | "lifecycle_status" | "logo_storage_path"
>;

export function normalizeClientEditShell(
  raw: Record<string, unknown>,
): ClientEditShell {
  return {
    id: typeof raw.id === "string" ? raw.id : String(raw.id ?? ""),
    kind: normalizeClientKind(raw.kind),
    legal_name:
      typeof raw.legal_name === "string" ? raw.legal_name : String(raw.legal_name ?? ""),
    lifecycle_status: normalizeLifecycle(raw.lifecycle_status),
    logo_storage_path:
      typeof raw.logo_storage_path === "string" ? raw.logo_storage_path : null,
  };
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
    responsible_team_member_id:
      typeof raw.responsible_team_member_id === "string"
        ? raw.responsible_team_member_id
        : null,
  };
}
