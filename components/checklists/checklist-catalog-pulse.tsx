import { cookies } from "next/headers";
import Link from "next/link";

import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { parseProfileContextCookie } from "@/lib/auth/profile-context-cookie";
import { loadChecklistValidityAlerts } from "@/lib/actions/checklist-validity-alerts";
import { VALIDITY_ALERTS_LIST_LIMIT } from "@/lib/checklists/validity-alerts-balance";
import {
  buildInProgressAriaLabel,
  buildInProgressKpiHint,
} from "@/lib/dashboard/checklists-in-progress";
import { loadChecklistsInProgress } from "@/lib/dashboard/load-checklists-in-progress";
import {
  CHECKLISTS_A_VENCER_PATH,
  CHECKLISTS_EM_ANDAMENTO_PATH,
  CHECKLISTS_VENCIDOS_PATH,
} from "@/lib/routes";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { DEFAULT_PROFILE_TIME_ZONE, normalizeAppTimeZone } from "@/lib/timezones";
import { canViewAllWorkspaceVisits } from "@/lib/visits/agenda-access";
import { isWorkspaceGestaoMember } from "@/lib/workspace";
import { cn } from "@/lib/utils";

type PulseTone = "live" | "danger" | "warning" | "default";

function PulseCard({
  href,
  label,
  value,
  hint,
  tone,
  ariaLabel,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  tone: PulseTone;
  ariaLabel: string;
}) {
  const urgent = value > 0;

  return (
    <Link
      href={href}
      prefetch
      aria-label={ariaLabel}
      className={cn(
        "min-h-11 rounded-xl border border-border bg-card p-3 text-left shadow-xs transition-colors",
        "hover:border-primary/35 hover:bg-background/80 hover:shadow-sm",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        tone === "danger" && "border-l-4 border-l-destructive",
        tone === "warning" && "border-l-4 border-l-warning",
        tone === "live" && "border-l-4 border-l-primary",
        tone === "default" && "border-l-4 border-l-border",
      )}
    >
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase sm:text-xs">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tracking-tight tabular-nums",
          urgent && tone === "danger" && "text-destructive",
          urgent && tone === "warning" && "text-amber-700 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      <p className="text-muted-foreground mt-1 hidden text-xs sm:block">{hint}</p>
    </Link>
  );
}

export function ChecklistCatalogPulseSkeleton() {
  return (
    <div
      className="grid grid-cols-3 gap-2 sm:gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="A carregar pulso de checklists"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-[4.75rem] animate-pulse rounded-xl bg-muted sm:h-[5.75rem]"
        />
      ))}
    </div>
  );
}

export async function ChecklistCatalogPulse() {
  const [cookieStore, { user, supabase, workspaceOwnerId }] = await Promise.all([
    cookies(),
    getServerContext(),
  ]);
  const profileCtx = parseProfileContextCookie(
    cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value,
  );
  const tz = profileCtx?.timeZone
    ? normalizeAppTimeZone(profileCtx.timeZone)
    : DEFAULT_PROFILE_TIME_ZONE;

  const isGestaoMember =
    user && workspaceOwnerId
      ? await isWorkspaceGestaoMember(supabase, user.id, workspaceOwnerId)
      : false;
  const isGestor = Boolean(
    user &&
      workspaceOwnerId &&
      canViewAllWorkspaceVisits(
        user.id,
        workspaceOwnerId,
        profileCtx?.role,
        isGestaoMember,
      ),
  );

  const [inProgress, vencidos, proximos] = await Promise.all([
    loadChecklistsInProgress({
      timeZone: tz,
      role: profileCtx?.role,
      isGestor,
      limit: 1,
    }),
    loadChecklistValidityAlerts(tz, {
      status: "vencido",
      limit: VALIDITY_ALERTS_LIST_LIMIT,
    }),
    loadChecklistValidityAlerts(tz, {
      status: "proximo",
      limit: VALIDITY_ALERTS_LIST_LIMIT,
    }),
  ]);

  const vencidosCount = vencidos.length;
  const proximosCount = proximos.length;
  const vencidosNoun = vencidosCount === 1 ? "checklist vencido" : "checklists vencidos";
  const proximosNoun =
    proximosCount === 1 ? "checklist a vencer" : "checklists a vencer";

  return (
    <div
      className="grid grid-cols-3 gap-2 sm:gap-3"
      aria-label="Pulso de checklists"
    >
      <PulseCard
        href={CHECKLISTS_EM_ANDAMENTO_PATH}
        label="Em andamento"
        value={inProgress.inProgressCount}
        hint={buildInProgressKpiHint(inProgress.todayCount)}
        tone={inProgress.inProgressCount > 0 ? "live" : "default"}
        ariaLabel={buildInProgressAriaLabel({
          inProgressCount: inProgress.inProgressCount,
          todayCount: inProgress.todayCount,
        })}
      />
      <PulseCard
        href={CHECKLISTS_VENCIDOS_PATH}
        label="Vencidos"
        value={vencidosCount}
        hint="último ano · ver todos"
        tone={vencidosCount > 0 ? "danger" : "default"}
        ariaLabel={`Ver ${vencidosCount} ${vencidosNoun}`}
      />
      <PulseCard
        href={CHECKLISTS_A_VENCER_PATH}
        label="A vencer"
        value={proximosCount}
        hint="próximos 90 dias · ver todos"
        tone={proximosCount > 0 ? "warning" : "default"}
        ariaLabel={`Ver ${proximosCount} ${proximosNoun}`}
      />
    </div>
  );
}
