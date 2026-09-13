import Link from "next/link";

import {
  buildInProgressContinueHref,
} from "@/lib/dashboard/checklists-in-progress";
import type { ChecklistInProgressItem } from "@/lib/dashboard/checklists-in-progress";
import { formatDateTimeShort } from "@/lib/datetime/calendar-tz";
import { CHECKLISTS_EM_ANDAMENTO_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Props = {
  item: ChecklistInProgressItem;
  timeZone: string;
  showProfessional: boolean;
  returnTo?: string;
};

export function ChecklistInProgressItemLink({
  item,
  timeZone,
  showProfessional,
  returnTo = CHECKLISTS_EM_ANDAMENTO_PATH,
}: Props) {
  const when = formatDateTimeShort(item.updatedAt, timeZone);
  const metaParts = [
    item.establishmentName,
    showProfessional ? item.professionalLabel : null,
    when,
  ].filter((part): part is string => Boolean(part));
  const href = buildInProgressContinueHref(item.sessionId, returnTo);
  if (!href) return null;

  const ariaLabel = `Continuar checklist ${item.checklistName} de ${item.clientName}`;

  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={ariaLabel}
      className={cn(
        "border-border flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2.5",
        "hover:border-primary/35 hover:bg-background/80",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "border-l-[3px] border-l-primary bg-primary/5",
      )}
    >
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          item.touchedToday ? "bg-primary animate-pulse" : "bg-muted-foreground/50",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm font-medium leading-5">
          {item.clientName}
        </span>
        <span className="text-foreground/90 block truncate text-xs font-medium leading-4">
          {item.checklistName}
        </span>
        <span className="text-muted-foreground block truncate text-xs leading-4">
          {metaParts.join(" · ")}
        </span>
      </span>
      <span className="text-primary mt-0.5 shrink-0 text-xs font-semibold">
        Continuar
      </span>
    </Link>
  );
}
