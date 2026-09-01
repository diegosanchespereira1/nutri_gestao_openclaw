/**
 * Limites por tenant — camada TypeScript.
 * Plano: docs/plano-limites-tenant-e-billing.md §5.2
 *
 * A GARANTIA é o trigger no banco (20261002120000). Este módulo existe para a
 * UX: avisar antes de tentar, com mensagem em pt-BR, e traduzir o erro do
 * Postgres quando o insert chega lá mesmo assim (importação em lote, corrida).
 *
 * A parte de decisão é pura e testável; só `loadTenantLimits` toca no banco.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantLimits = {
  tenant_user_id: string;
  clients_limit_enabled: boolean;
  clients_limit: number;
  patients_limit_enabled: boolean;
  patients_limit: number;
  team_members_enabled: boolean;
  team_members_unlimited: boolean;
  team_members_limit: number;
  /** Nota interna do super_admin — só o painel usa. */
  notes?: string | null;
};

export type LimitKind = "clients" | "patients" | "team_members";

export type LimitDecision =
  | { ok: true }
  | {
      ok: false;
      reason: "disabled" | "reached";
      used: number;
      limit: number;
    };

export const TENANT_LIMITS_COLUMNS =
  "tenant_user_id, clients_limit_enabled, clients_limit, patients_limit_enabled, patients_limit, team_members_enabled, team_members_unlimited, team_members_limit, notes";

/** Códigos levantados pelo trigger `enforce_tenant_limit()`. */
export const LIMIT_ERROR_CODES = {
  clients: "LIMITE_CLIENTES_ATINGIDO",
  patients: "LIMITE_PACIENTES_ATINGIDO",
  teamDisabled: "EQUIPE_DESABILITADA",
  teamReached: "LIMITE_EQUIPE_ATINGIDO",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Decisão (pura)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `used` é a contagem ATUAL do tenant. A decisão é sobre acrescentar mais um.
 * Sem limites conhecidos (null), não bloqueia — a mesma escolha do trigger.
 */
export function decideTenantLimit(
  kind: LimitKind,
  limits: TenantLimits | null,
  used: number,
): LimitDecision {
  if (!limits) return { ok: true };

  if (kind === "clients") {
    if (!limits.clients_limit_enabled) return { ok: true };
    return used >= limits.clients_limit
      ? { ok: false, reason: "reached", used, limit: limits.clients_limit }
      : { ok: true };
  }

  if (kind === "patients") {
    if (!limits.patients_limit_enabled) return { ok: true };
    return used >= limits.patients_limit
      ? { ok: false, reason: "reached", used, limit: limits.patients_limit }
      : { ok: true };
  }

  // team_members
  if (!limits.team_members_enabled) {
    return { ok: false, reason: "disabled", used, limit: 0 };
  }
  if (limits.team_members_unlimited) return { ok: true };
  return used >= limits.team_members_limit
    ? { ok: false, reason: "reached", used, limit: limits.team_members_limit }
    : { ok: true };
}

/** Mensagem em pt-BR para o utilizador final. */
export function tenantLimitMessage(
  kind: LimitKind,
  decision: LimitDecision,
): string | null {
  if (decision.ok) return null;

  if (kind === "clients") {
    return `Você atingiu o limite de ${decision.limit} clientes do seu plano. Fale com o suporte para ampliar.`;
  }
  if (kind === "patients") {
    return `Você atingiu o limite de ${decision.limit} pacientes do seu plano. Fale com o suporte para ampliar.`;
  }
  if (decision.reason === "disabled") {
    return "O cadastro de membros de equipe não está habilitado para a sua conta.";
  }
  return `Você atingiu o limite de ${decision.limit} membros de equipe. Adicione mais assentos para continuar.`;
}

/**
 * Traduz o erro do trigger para mensagem de utilizador.
 * Devolve null quando o erro não é de limite — o chamador trata como erro normal.
 */
export function mapPgLimitError(error: unknown): string | null {
  const message =
    typeof error === "string"
      ? error
      : typeof (error as { message?: unknown })?.message === "string"
        ? ((error as { message: string }).message)
        : "";
  if (!message) return null;

  if (message.includes(LIMIT_ERROR_CODES.clients)) {
    return "Você atingiu o limite de clientes do seu plano. Fale com o suporte para ampliar.";
  }
  if (message.includes(LIMIT_ERROR_CODES.patients)) {
    return "Você atingiu o limite de pacientes do seu plano. Fale com o suporte para ampliar.";
  }
  if (message.includes(LIMIT_ERROR_CODES.teamDisabled)) {
    return "O cadastro de membros de equipe não está habilitado para a sua conta.";
  }
  if (message.includes(LIMIT_ERROR_CODES.teamReached)) {
    return "Você atingiu o limite de membros de equipe. Adicione mais assentos para continuar.";
  }
  return null;
}

/** Quantos ainda cabem — para os badges de uso da UI. `null` = sem limite. */
export function remainingSlots(
  kind: LimitKind,
  limits: TenantLimits | null,
  used: number,
): number | null {
  if (!limits) return null;
  if (kind === "clients") {
    return limits.clients_limit_enabled
      ? Math.max(limits.clients_limit - used, 0)
      : null;
  }
  if (kind === "patients") {
    return limits.patients_limit_enabled
      ? Math.max(limits.patients_limit - used, 0)
      : null;
  }
  if (!limits.team_members_enabled) return 0;
  return limits.team_members_unlimited
    ? null
    : Math.max(limits.team_members_limit - used, 0);
}

/**
 * Estado do limite para a UI do tenant (T5): quanto usou, quanto falta, se está
 * bloqueado e a mensagem do tooltip. Pura — recebe limites e uso já carregados.
 */
export type LimitUiState = {
  used: number;
  limit: number | null;
  remaining: number | null;
  blocked: boolean;
  message: string | null;
};

function limitValue(kind: LimitKind, limits: TenantLimits | null): number | null {
  if (!limits) return null;
  if (kind === "clients") {
    return limits.clients_limit_enabled ? limits.clients_limit : null;
  }
  if (kind === "patients") {
    return limits.patients_limit_enabled ? limits.patients_limit : null;
  }
  if (!limits.team_members_enabled) return 0;
  return limits.team_members_unlimited ? null : limits.team_members_limit;
}

export function buildLimitUiState(
  kind: LimitKind,
  limits: TenantLimits | null,
  used: number,
): LimitUiState {
  const decision = decideTenantLimit(kind, limits, used);
  return {
    used,
    limit: limitValue(kind, limits),
    remaining: remainingSlots(kind, limits, used),
    blocked: !decision.ok,
    message: tenantLimitMessage(kind, decision),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// I/O
// ─────────────────────────────────────────────────────────────────────────────

export async function loadTenantLimits(
  supabase: SupabaseClient,
  tenantUserId: string,
): Promise<TenantLimits | null> {
  const { data, error } = await supabase
    .from("tenant_limits")
    .select(TENANT_LIMITS_COLUMNS)
    .eq("tenant_user_id", tenantUserId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as TenantLimits;
}

const COUNT_SOURCE: Record<LimitKind, { table: string; ownerColumn: string }> = {
  clients: { table: "clients", ownerColumn: "owner_user_id" },
  patients: { table: "patients", ownerColumn: "user_id" },
  team_members: { table: "team_members", ownerColumn: "owner_user_id" },
};

export async function countTenantUsage(
  supabase: SupabaseClient,
  tenantUserId: string,
  kind: LimitKind,
): Promise<number> {
  const { table, ownerColumn } = COUNT_SOURCE[kind];
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(ownerColumn, tenantUserId);

  // Membro inativo não ocupa assento — mesma regra do trigger.
  if (kind === "team_members") query = query.eq("is_active", true);

  const { count } = await query;
  return count ?? 0;
}

/** Pré-checagem completa: carrega limites, conta o uso e decide. */
export async function checkTenantLimit(
  supabase: SupabaseClient,
  tenantUserId: string,
  kind: LimitKind,
): Promise<LimitDecision> {
  const limits = await loadTenantLimits(supabase, tenantUserId);
  if (!limits) return { ok: true };
  const used = await countTenantUsage(supabase, tenantUserId, kind);
  return decideTenantLimit(kind, limits, used);
}
