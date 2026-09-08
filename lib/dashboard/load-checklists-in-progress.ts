import { getServerContext } from "@/lib/supabase/get-server-user";
import {
  calendarDayUtcRangeForNow,
  CHECKLISTS_IN_PROGRESS_LIST_LIMIT,
  clampInProgressLimit,
  clientDisplayName,
  emptyChecklistsInProgressSummary,
  inProgressOwnerFilter,
  isChecklistSessionId,
  isTouchedOnCalendarDay,
  type ChecklistInProgressItem,
  type ChecklistsInProgressSummary,
} from "@/lib/dashboard/checklists-in-progress";
import { canViewAllWorkspaceVisits } from "@/lib/visits/agenda-access";
import { isWorkspaceGestaoMember } from "@/lib/workspace";
import type { ProfileRole } from "@/lib/roles";

const IN_CHUNK_SIZE = 150;
const SESSION_COLUMNS =
  "id, user_id, establishment_id, template_name_snapshot, created_at, updated_at";

type LoadArgs = {
  timeZone: string;
  role: ProfileRole | null | undefined;
  /** Se já resolvido no caller, evita um roundtrip extra a team_members. */
  isGestor?: boolean;
  limit?: number;
  now?: Date;
};

type SessionRow = {
  id: string;
  user_id: string;
  establishment_id: string;
  template_name_snapshot: string | null;
  created_at: string;
  updated_at: string;
};

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * Sessões de checklist sem dossiê aprovado, no tenant do workspace.
 * Campo: só as próprias. Gestão: todas as visíveis por RLS.
 */
export async function loadChecklistsInProgress(
  args: LoadArgs,
): Promise<ChecklistsInProgressSummary> {
  const empty = emptyChecklistsInProgressSummary();
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) return empty;

  const isGestor =
    args.isGestor ??
    canViewAllWorkspaceVisits(
      user.id,
      workspaceOwnerId,
      args.role,
      await isWorkspaceGestaoMember(supabase, user.id, workspaceOwnerId),
    );
  const ownerFilter = inProgressOwnerFilter(isGestor, user.id);
  const limit = clampInProgressLimit(
    args.limit ?? CHECKLISTS_IN_PROGRESS_LIST_LIMIT,
  );
  const now = args.now ?? new Date();
  const todayRange = calendarDayUtcRangeForNow(args.timeZone, now);
  const onlyUserId = ownerFilter?.onlyUserId ?? null;

  let countQuery = supabase
    .from("checklist_fill_sessions")
    .select("id", { count: "exact", head: true })
    .is("dossier_approved_at", null);
  if (onlyUserId) countQuery = countQuery.eq("user_id", onlyUserId);

  let todayQuery = todayRange
    ? supabase
        .from("checklist_fill_sessions")
        .select("id", { count: "exact", head: true })
        .is("dossier_approved_at", null)
        .gte("updated_at", todayRange.startIso)
        .lt("updated_at", todayRange.endExclusiveIso)
    : null;
  if (todayQuery && onlyUserId) {
    todayQuery = todayQuery.eq("user_id", onlyUserId);
  }

  let listQuery = supabase
    .from("checklist_fill_sessions")
    .select(SESSION_COLUMNS)
    .is("dossier_approved_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (onlyUserId) listQuery = listQuery.eq("user_id", onlyUserId);

  const [countResult, todayResult, listResult] = await Promise.all([
    countQuery,
    todayQuery ?? Promise.resolve({ count: 0, error: null }),
    listQuery,
  ]);

  if (countResult.error || listResult.error) {
    return empty;
  }

  const inProgressCount = countResult.count ?? 0;
  const todayCount = todayResult.error ? 0 : (todayResult.count ?? 0);
  const sessions = (listResult.data ?? []) as SessionRow[];
  if (sessions.length === 0) {
    return { ...empty, inProgressCount, todayCount };
  }

  const establishmentIds = [
    ...new Set(sessions.map((row) => row.establishment_id).filter(Boolean)),
  ];
  const userIds = [...new Set(sessions.map((row) => row.user_id).filter(Boolean))];

  const establishmentNameById = new Map<string, { name: string; clientId: string }>();
  const clientNameById = new Map<string, string>();
  const professionalByUserId = new Map<string, string>();

  for (const ids of chunk(establishmentIds, IN_CHUNK_SIZE)) {
    const { data } = await supabase
      .from("establishments")
      .select("id, name, client_id")
      .in("id", ids);
    for (const row of data ?? []) {
      const rec = asRecord(row);
      if (!rec) continue;
      const id = readString(rec.id);
      const clientId = readString(rec.client_id);
      if (!id) continue;
      establishmentNameById.set(id, {
        name: readString(rec.name, "Estabelecimento"),
        clientId,
      });
    }
  }

  const clientIds = [
    ...new Set(
      [...establishmentNameById.values()]
        .map((row) => row.clientId)
        .filter(Boolean),
    ),
  ];
  for (const ids of chunk(clientIds, IN_CHUNK_SIZE)) {
    const { data } = await supabase
      .from("clients")
      .select("id, legal_name, trade_name")
      .in("id", ids);
    for (const row of data ?? []) {
      const rec = asRecord(row);
      if (!rec) continue;
      const id = readString(rec.id);
      if (!id) continue;
      const trade = readString(rec.trade_name).trim();
      const legal = readString(rec.legal_name).trim();
      clientNameById.set(id, clientDisplayName(trade, legal));
    }
  }

  for (const ids of chunk(userIds, IN_CHUNK_SIZE)) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", ids);
    for (const row of data ?? []) {
      const rec = asRecord(row);
      if (!rec) continue;
      const id = readString(rec.user_id);
      const name = readString(rec.full_name).trim();
      if (id && name) professionalByUserId.set(id, name);
    }
  }

  const missingProfessionalIds = userIds.filter(
    (id) => !professionalByUserId.has(id),
  );
  if (missingProfessionalIds.length > 0) {
    for (const ids of chunk(missingProfessionalIds, IN_CHUNK_SIZE)) {
      const { data } = await supabase
        .from("team_members")
        .select("member_user_id, full_name")
        .eq("owner_user_id", workspaceOwnerId)
        .in("member_user_id", ids);
      for (const row of data ?? []) {
        const rec = asRecord(row);
        if (!rec) continue;
        const id = readString(rec.member_user_id);
        const name = readString(rec.full_name).trim();
        if (id && name && !professionalByUserId.has(id)) {
          professionalByUserId.set(id, name);
        }
      }
    }
  }

  const items: ChecklistInProgressItem[] = sessions.flatMap((session) => {
    if (!isChecklistSessionId(session.id)) return [];
    const establishment = establishmentNameById.get(session.establishment_id);
    const clientName = establishment
      ? clientNameById.get(establishment.clientId) ?? "Cliente"
      : "Cliente";
    const professionalLabel =
      professionalByUserId.get(session.user_id) ??
      (session.user_id === user.id ? "Você" : "Profissional");
    const checklistName =
      (session.template_name_snapshot ?? "").trim() || "Checklist";

    return [
      {
        sessionId: session.id,
        checklistName,
        clientName,
        establishmentName: establishment?.name ?? "Estabelecimento",
        professionalLabel,
        updatedAt: session.updated_at,
        createdAt: session.created_at,
        touchedToday: isTouchedOnCalendarDay(
          session.updated_at,
          args.timeZone,
          now,
        ),
      },
    ];
  });

  return {
    inProgressCount,
    todayCount,
    items,
    truncated: inProgressCount > items.length,
  };
}
