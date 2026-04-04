import { clientBusinessSegmentLabel } from "@/lib/constants/client-business-segment";
import { clientLifecycleBadgeLabel } from "@/lib/constants/client-lifecycle";
import { cn } from "@/lib/utils";
import type {
  ClientBusinessSegment,
  ClientKind,
  ClientLifecycleStatus,
} from "@/lib/types/clients";

const patientBadgeClass =
  "border border-primary/35 bg-primary/10 text-primary";

const empresaFallbackClass =
  "border border-violet-500/25 bg-violet-500/10 text-violet-900 dark:text-violet-100";

const segmentBadgeClass: Record<ClientBusinessSegment, string> = {
  padaria:
    "border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
  mercado:
    "border border-lime-500/30 bg-lime-500/10 text-lime-950 dark:text-lime-100",
  escola:
    "border border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100",
  hospital:
    "border border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-100",
  clinica:
    "border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-950 dark:text-fuchsia-100",
  restaurante:
    "border border-orange-500/30 bg-orange-500/10 text-orange-950 dark:text-orange-100",
  hotel:
    "border border-indigo-500/30 bg-indigo-500/10 text-indigo-950 dark:text-indigo-100",
  industria_alimenticia:
    "border border-teal-500/30 bg-teal-500/10 text-teal-950 dark:text-teal-100",
  lar_idosos:
    "border border-cyan-500/30 bg-cyan-500/10 text-cyan-950 dark:text-cyan-100",
  empresa: empresaFallbackClass,
  outro:
    "border border-muted-foreground/25 bg-muted text-muted-foreground",
};

const lifecycleMeta: Record<ClientLifecycleStatus, { className: string }> = {
  ativo: {
    className:
      "border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  },
  inativo: {
    className:
      "border border-amber-500/35 bg-amber-500/12 text-amber-950 dark:text-amber-100",
  },
  finalizado: {
    className:
      "border border-muted-foreground/25 bg-muted text-muted-foreground",
  },
};

function badgeBase() {
  return "inline-flex max-w-full shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide";
}

function categoryBadgeContent(
  kind: ClientKind,
  businessSegment: ClientBusinessSegment | null,
): { label: string; title: string; className: string } {
  if (kind === "pf") {
    return {
      label: "Paciente",
      title: "Cliente pessoa física",
      className: patientBadgeClass,
    };
  }
  if (businessSegment) {
    return {
      label: clientBusinessSegmentLabel[businessSegment],
      title: clientBusinessSegmentLabel[businessSegment],
      className: segmentBadgeClass[businessSegment],
    };
  }
  return {
    label: "Empresa",
    title: "Pessoa jurídica — defina a categoria do negócio na ficha",
    className: empresaFallbackClass,
  };
}

export function ClientesListBadges({
  kind,
  businessSegment,
  lifecycleStatus,
}: {
  kind: ClientKind;
  businessSegment: ClientBusinessSegment | null;
  lifecycleStatus: ClientLifecycleStatus;
}) {
  const cat = categoryBadgeContent(kind, businessSegment);
  const life = lifecycleMeta[lifecycleStatus];
  const statusTitle = clientLifecycleBadgeLabel[lifecycleStatus];

  return (
    <div
      className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:max-w-[min(100%,20rem)]"
      aria-label={`Categoria ${cat.label}, situação ${statusTitle}`}
    >
      <span title={cat.title} className={cn(badgeBase(), cat.className)}>
        <span className="truncate">{cat.label}</span>
      </span>
      <span
        title={statusTitle}
        className={cn(badgeBase(), life.className)}
      >
        {clientLifecycleBadgeLabel[lifecycleStatus]}
      </span>
    </div>
  );
}
