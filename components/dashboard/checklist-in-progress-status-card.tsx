import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { ChecklistInProgressItemLink } from "@/components/dashboard/checklist-in-progress-item";
import { ChecklistInProgressLiveRefresh } from "@/components/dashboard/checklist-in-progress-live-refresh";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { buttonVariants } from "@/components/ui/button-variants";
import type { ChecklistsInProgressSummary } from "@/lib/dashboard/checklists-in-progress";
import { APP_DASHBOARD_PATH, CHECKLISTS_EM_ANDAMENTO_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Props = {
  summary: ChecklistsInProgressSummary;
  timeZone: string;
  isGestor: boolean;
};

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="border-border min-w-0 rounded-lg border bg-background/70 px-3 py-2">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-0.5 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
}

export function ChecklistInProgressStatusCard({
  summary,
  timeZone,
  isGestor,
}: Props) {
  const live = summary.inProgressCount;
  const today = summary.todayCount;
  const preview = summary.items;

  return (
    <DashboardSectionCard
      id="dashboard-checklists-andamento"
      title="Checklists em andamento"
      description={
        isGestor
          ? "Trabalho aberto da equipe — o que ainda não tem dossiê."
          : "O que você ainda não fechou. Continue de onde parou."
      }
      actions={
        <Link
          href={CHECKLISTS_EM_ANDAMENTO_PATH}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "min-h-11 w-full justify-center sm:w-auto",
          )}
        >
          Ver todos
        </Link>
      }
    >
      <ChecklistInProgressLiveRefresh />
      <div className="space-y-4">
        <div
          className="grid grid-cols-2 gap-2"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <Metric
            label="Em andamento"
            value={live}
            hint={live === 1 ? "checklist aberto" : "checklists abertos"}
          />
          <Metric
            label="Hoje"
            value={today}
            hint={
              today === 1 ? "com movimento neste dia" : "com movimento neste dia"
            }
          />
        </div>

        {preview.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum checklist em andamento. Quando começar um preenchimento, ele
            aparece aqui.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Checklists em andamento">
            {preview.map((item) => (
              <li key={item.sessionId}>
                <ChecklistInProgressItemLink
                  item={item}
                  timeZone={timeZone}
                  showProfessional={isGestor}
                  returnTo={APP_DASHBOARD_PATH}
                />
              </li>
            ))}
          </ul>
        )}

        {summary.truncated ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ClipboardList className="size-3.5" aria-hidden />
            A mostrar os {preview.length} mais recentes de {live}.
          </p>
        ) : null}
      </div>
    </DashboardSectionCard>
  );
}
