import Link from "next/link";
import { cookies } from "next/headers";
import { ClipboardList } from "lucide-react";

import { ChecklistInProgressList } from "@/components/checklists/checklist-in-progress-list";
import { ChecklistInProgressLiveRefresh } from "@/components/dashboard/checklist-in-progress-live-refresh";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { parseProfileContextCookie } from "@/lib/auth/profile-context-cookie";
import { CHECKLISTS_IN_PROGRESS_LIST_LIMIT } from "@/lib/dashboard/checklists-in-progress";
import { loadChecklistsInProgress } from "@/lib/dashboard/load-checklists-in-progress";
import {
  APP_DASHBOARD_PATH,
  CHECKLISTS_A_VENCER_PATH,
  CHECKLISTS_VENCIDOS_PATH,
} from "@/lib/routes";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { DEFAULT_PROFILE_TIME_ZONE, normalizeAppTimeZone } from "@/lib/timezones";
import { canViewAllWorkspaceVisits } from "@/lib/visits/agenda-access";
import { isWorkspaceGestaoMember } from "@/lib/workspace";
import { cn } from "@/lib/utils";

export async function ChecklistInProgressListPage() {
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

  const summary = await loadChecklistsInProgress({
    timeZone: tz,
    role: profileCtx?.role,
    isGestor,
    limit: CHECKLISTS_IN_PROGRESS_LIST_LIMIT,
  });

  return (
    <PageLayout>
      <ChecklistInProgressLiveRefresh />
      <PageHeader
        title="Checklists em andamento"
        description={
          isGestor
            ? "Sessões abertas da equipe, ainda sem dossiê aprovado. Toque para continuar."
            : "As suas sessões abertas, ainda sem dossiê aprovado. Toque para continuar."
        }
        back={{ href: APP_DASHBOARD_PATH, label: "Dashboard" }}
        actions={
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href={CHECKLISTS_VENCIDOS_PATH}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "min-h-11 w-full justify-center sm:w-auto",
              )}
            >
              Vencidos
            </Link>
            <Link
              href={CHECKLISTS_A_VENCER_PATH}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "min-h-11 w-full justify-center sm:w-auto",
              )}
            >
              A vencer
            </Link>
            <Link
              href="/checklists"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "min-h-11 w-full justify-center sm:w-auto",
              )}
            >
              Catálogo
            </Link>
          </div>
        }
      />

      <div
        className="grid grid-cols-2 gap-3 sm:max-w-md"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="border-border rounded-xl border bg-card p-3 shadow-xs">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Em andamento
          </p>
          <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
            {summary.inProgressCount}
          </p>
        </div>
        <div className="border-border rounded-xl border bg-card p-3 shadow-xs">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Hoje
          </p>
          <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
            {summary.todayCount}
          </p>
        </div>
      </div>

      {summary.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum checklist em andamento"
          description="Quando um preenchimento começar, ele aparece aqui até o dossiê ser aprovado."
          action={
            <Link
              href="/checklists"
              className={cn(
                buttonVariants({ size: "sm" }),
                "min-h-11 justify-center",
              )}
            >
              Abrir catálogo
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {summary.truncated ? (
            <p className="text-muted-foreground text-xs">
              A mostrar os {summary.items.length} mais recentes de{" "}
              {summary.inProgressCount}.
            </p>
          ) : null}
          <ChecklistInProgressList
            items={summary.items}
            timeZone={tz}
            showProfessional={isGestor}
          />
        </div>
      )}
    </PageLayout>
  );
}
