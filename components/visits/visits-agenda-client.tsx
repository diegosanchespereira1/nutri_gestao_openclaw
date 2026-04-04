"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
} from "lucide-react";

import { useAppTimeZone } from "@/components/app-timezone-provider";
import { buttonVariants } from "@/components/ui/button-variants";
import { visitPriorityAgendaSurface, visitPriorityLabel } from "@/lib/constants/visit-priorities";
import { visitStatusLabel } from "@/lib/constants/visit-status";
import {
  addCalendarDays,
  formatDateTimeShort,
  formatMonthYearTitle,
  formatTimeShort,
  formatWeekRangeLabel,
  formatWeekdayShortDay,
  isSameCalendarDay,
  monthCalendarCells,
  startOfIsoWeekMonday,
  visitDayKey,
  weekDayKeysFromMonday,
} from "@/lib/datetime/calendar-tz";
import { VisitQuickDetailDialog } from "@/components/visits/visit-quick-detail-dialog";
import { VisitWeekTimeGrid } from "@/components/visits/visit-week-time-grid";
import { visitKindLabel } from "@/lib/constants/visit-kinds";
import { teamJobRoleLabel } from "@/lib/constants/team-roles";
import type { TeamJobRole } from "@/lib/types/team-members";
import type { ScheduledVisitWithTargets, VisitKind, VisitPriority } from "@/lib/types/visits";
import { visitDisplayTitle } from "@/lib/visits/display-title";
import { compareScheduledVisitsForDashboard } from "@/lib/visits/sort-scheduled-visits-dashboard";
import { cn } from "@/lib/utils";

type PriorityFilter = VisitPriority | "all";

const PRIORITY_FILTERS: { value: PriorityFilter; label: string; className: string }[] = [
  { value: "all", label: "Todas", className: "bg-muted/80 text-foreground border-border" },
  { value: "urgent", label: "Urgente", className: "border-destructive/30 bg-destructive/10 text-destructive" },
  { value: "high", label: "Alta", className: "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100" },
  { value: "normal", label: "Normal", className: "border-primary/30 bg-primary/10 text-foreground" },
  { value: "low", label: "Baixa", className: "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100" },
];

type Props = {
  visits: ScheduledVisitWithTargets[];
  /** Chave civil de «hoje» no fuso do perfil, calculada no servidor. */
  todayKey: string;
};

function groupVisitsByDay(
  list: ScheduledVisitWithTargets[],
  timeZone: string,
): Map<string, ScheduledVisitWithTargets[]> {
  const map = new Map<string, ScheduledVisitWithTargets[]>();
  for (const v of list) {
    const k = visitDayKey(v.scheduled_start, timeZone);
    const arr = map.get(k) ?? [];
    arr.push(v);
    map.set(k, arr);
  }
  for (const arr of map.values()) {
    arr.sort(compareScheduledVisitsForDashboard);
  }
  return map;
}

function visitMatchesFilter(v: ScheduledVisitWithTargets, f: PriorityFilter): boolean {
  if (f === "all") return true;
  return v.priority === f;
}

type ScheduleView = "week" | "list";

export function VisitsAgendaClient({ visits, todayKey }: Props) {
  const tz = useAppTimeZone();

  const byDay = useMemo(
    () => groupVisitsByDay(visits, tz),
    [visits, tz],
  );

  const initialMonday = useMemo(
    () => startOfIsoWeekMonday(todayKey, tz),
    [todayKey, tz],
  );

  const [weekMonday, setWeekMonday] = useState(initialMonday);
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [miniMonthAnchor, setMiniMonthAnchor] = useState(todayKey);
  const [scheduleView, setScheduleView] = useState<ScheduleView>("week");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const weekKeys = useMemo(
    () => weekDayKeysFromMonday(weekMonday, tz),
    [weekMonday, tz],
  );

  const getVisitsForDay = useCallback(
    (dayKey: string) =>
      (byDay.get(dayKey) ?? []).filter((v) =>
        visitMatchesFilter(v, priorityFilter),
      ),
    [byDay, priorityFilter],
  );

  /** Dia em foco na UI: mantém-se coerente ao mudar de semana sem efeitos. */
  const effectiveDayKey = useMemo(() => {
    if (weekKeys.includes(selectedDayKey)) return selectedDayKey;
    return weekMonday;
  }, [weekKeys, selectedDayKey, weekMonday]);

  const effectiveSelectedVisitId = useMemo(() => {
    if (!selectedVisitId) return null;
    const v = visits.find((x) => x.id === selectedVisitId);
    if (!v) return null;
    const dk = visitDayKey(v.scheduled_start, tz);
    if (!weekKeys.includes(dk)) return null;
    return selectedVisitId;
  }, [weekKeys, selectedVisitId, visits, tz]);

  const weekVisits = useMemo(() => {
    const set = new Set(weekKeys);
    return visits.filter((v) => set.has(visitDayKey(v.scheduled_start, tz)));
  }, [visits, weekKeys, tz]);

  const weekVisitsForList = useMemo(
    () =>
      [...weekVisits]
        .filter((v) => visitMatchesFilter(v, priorityFilter))
        .sort(
          (a, b) =>
            new Date(a.scheduled_start).getTime() -
            new Date(b.scheduled_start).getTime(),
        ),
    [weekVisits, priorityFilter],
  );

  const stats = useMemo(() => {
    const todayList = byDay.get(todayKey) ?? [];
    const urgentWeek = weekVisits.filter((v) => v.priority === "urgent").length;
    return {
      todayCount: todayList.length,
      weekCount: weekVisits.length,
      urgentWeek,
    };
  }, [byDay, todayKey, weekVisits]);

  const selectedVisit = useMemo(
    () =>
      visits.find((v) => v.id === effectiveSelectedVisitId) ?? null,
    [visits, effectiveSelectedVisitId],
  );

  const dayVisitsSelected = useMemo(() => {
    const raw = byDay.get(effectiveDayKey) ?? [];
    return raw.filter((v) => visitMatchesFilter(v, priorityFilter));
  }, [byDay, effectiveDayKey, priorityFilter]);

  const goWeek = useCallback((delta: number) => {
    setWeekMonday((m) => addCalendarDays(m, delta * 7, tz));
    setSelectedVisitId(null);
  }, [tz]);

  const goToday = useCallback(() => {
    const mon = startOfIsoWeekMonday(todayKey, tz);
    setWeekMonday(mon);
    setSelectedDayKey(todayKey);
    setMiniMonthAnchor(todayKey);
    setSelectedVisitId(null);
  }, [todayKey, tz]);

  const selectDay = useCallback((dayKey: string) => {
    setSelectedDayKey(dayKey);
    setMiniMonthAnchor(dayKey);
    setSelectedVisitId(null);
  }, []);

  const monthCells = useMemo(
    () => monthCalendarCells(miniMonthAnchor, tz),
    [miniMonthAnchor, tz],
  );

  const canStartVisit = useCallback(
    (v: ScheduledVisitWithTargets) =>
      (v.status === "scheduled" || v.status === "in_progress") &&
      isSameCalendarDay(v.scheduled_start, tz),
    [tz],
  );

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
      <div className="min-w-0 flex-1 space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground font-heading text-2xl font-semibold tracking-tight">
              Agenda de visitas
            </h1>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm">
              Grelha semanal hora a hora no seu fuso horário (Definições → Região).
              Selecione um bloco para ver o detalhe à direita.
            </p>
          </div>
          <Link
            href="/visitas/nova"
            className={cn(
              buttonVariants(),
              "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start",
            )}
          >
            <Plus className="size-4" aria-hidden />
            Agendar nova visita
          </Link>
        </header>

        {visits.length === 0 ? (
          <div
            role="status"
            className="border-border bg-muted/20 text-muted-foreground rounded-xl border border-dashed px-4 py-3 text-sm"
          >
            Ainda não há visitas agendadas. Use «Agendar nova visita» ou
            adicione dados em{" "}
            <Link href="/clientes" className="text-primary font-medium underline-offset-4 hover:underline">
              Clientes
            </Link>
            .
          </div>
        ) : null}

        {visits.length > 0 ? (
          <div
            role="note"
            className="border-border bg-primary/5 text-foreground rounded-lg border border-primary/20 px-4 py-3 text-sm"
          >
            <span className="font-medium">Checklist na visita: </span>
            os itens do checklist só aparecem depois de abrir{" "}
            <span className="font-medium">Iniciar visita</span> ou{" "}
            <span className="font-medium">Continuar visita</span>. Esse botão
            fica disponível no{" "}
            <span className="font-medium">dia da visita</span> (no fuso de
            Definições → Região), no detalhe da visita, no painel ao lado ou no
            cartão do dia em Início. Se houver vários modelos, escolha um antes
            do preenchimento.
          </div>
        ) : null}

        <div
          className="flex flex-wrap items-center gap-2"
          role="toolbar"
          aria-label="Filtro por prioridade"
        >
          {PRIORITY_FILTERS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setPriorityFilter(chip.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                chip.className,
                priorityFilter === chip.value
                  ? "ring-primary ring-2 ring-offset-2 ring-offset-background"
                  : "opacity-80 hover:opacity-100",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-3 shadow-xs sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goWeek(-1)}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "min-h-11 min-w-11",
                  )}
                  aria-label="Semana anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goWeek(1)}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "min-h-11 min-w-11",
                  )}
                  aria-label="Semana seguinte"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <p className="text-foreground text-sm font-semibold sm:min-w-[12rem] sm:text-center">
                {formatWeekRangeLabel(weekMonday, tz)}
              </p>
              <button
                type="button"
                onClick={goToday}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "min-h-9",
                )}
              >
                Hoje
              </button>
            </div>

            <div
              className="border-border bg-muted/40 flex flex-wrap items-center gap-0.5 rounded-lg border p-0.5"
              role="group"
              aria-label="Tipo de vista"
            >
              <button
                type="button"
                onClick={() => setScheduleView("week")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  scheduleView === "week"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Semana
              </button>
              <button
                type="button"
                disabled
                title="Brevemente"
                className="text-muted-foreground cursor-not-allowed rounded-md px-2.5 py-1.5 text-xs font-medium opacity-50"
              >
                Mês
              </button>
              <button
                type="button"
                disabled
                title="Brevemente"
                className="text-muted-foreground cursor-not-allowed rounded-md px-2.5 py-1.5 text-xs font-medium opacity-50"
              >
                Dia
              </button>
              <button
                type="button"
                onClick={() => setScheduleView("list")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  scheduleView === "list"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Lista
              </button>
            </div>
          </div>

          {scheduleView === "week" ? (
            <VisitWeekTimeGrid
              timeZone={tz}
              weekKeys={weekKeys}
              todayKey={todayKey}
              effectiveDayKey={effectiveDayKey}
              effectiveSelectedVisitId={effectiveSelectedVisitId}
              getVisitsForDay={getVisitsForDay}
              onSelectDay={selectDay}
              onSelectVisit={(dayKey, visitId) => {
                setSelectedDayKey(dayKey);
                setSelectedVisitId(visitId);
              }}
              onVisitDoubleClick={(dayKey, visitId) => {
                setSelectedDayKey(dayKey);
                setSelectedVisitId(visitId);
                setDetailDialogOpen(true);
              }}
            />
          ) : (
            <div className="border-border rounded-xl border">
              <ul
                className="divide-border max-h-[min(72vh,880px)] divide-y overflow-y-auto"
                aria-label="Visitas da semana em lista"
              >
                {weekVisitsForList.length === 0 ? (
                  <li className="text-muted-foreground px-4 py-8 text-center text-sm">
                    Nenhuma visita nesta semana com o filtro atual.
                  </li>
                ) : (
                  weekVisitsForList.map((v) => {
                    const dk = visitDayKey(v.scheduled_start, tz);
                    const active = effectiveSelectedVisitId === v.id;
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDayKey(dk);
                            setSelectedVisitId(v.id);
                          }}
                          onDoubleClick={() => {
                            setSelectedDayKey(dk);
                            setSelectedVisitId(v.id);
                            setDetailDialogOpen(true);
                          }}
                          className={cn(
                            "hover:bg-muted/50 flex w-full gap-3 px-4 py-3 text-left transition-colors",
                            active && "bg-primary/5",
                          )}
                        >
                          <div
                            aria-hidden
                            className={cn(
                              "min-h-[2.5rem] w-1.5 shrink-0 rounded-sm",
                              visitPriorityAgendaSurface[v.priority],
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-foreground font-medium">
                              {visitDisplayTitle(v)}
                            </span>
                            <span className="text-muted-foreground mt-0.5 block text-xs">
                              {formatDateTimeShort(v.scheduled_start, tz)}{" "}
                              · {visitPriorityLabel[v.priority]} ·{" "}
                              {v.target_type === "establishment"
                                ? "Estabelecimento"
                                : "Paciente"}
                            </span>
                          </div>
                          <span className="text-muted-foreground shrink-0 text-xs capitalize">
                            {formatWeekdayShortDay(dk, tz)}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>

        <section
          className="border-border xl:hidden rounded-xl border bg-card/40 p-4"
          aria-labelledby="dia-mobile-heading"
        >
          <h2
            id="dia-mobile-heading"
            className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold"
          >
            <CalendarDays className="size-4" />
            {formatWeekdayShortDay(effectiveDayKey, tz)} — compromissos
          </h2>
          {dayVisitsSelected.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma visita neste dia com o filtro atual.
            </p>
          ) : (
            <ul className="space-y-2">
              {dayVisitsSelected.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayKey(visitDayKey(v.scheduled_start, tz));
                      setSelectedVisitId(v.id);
                    }}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                      effectiveSelectedVisitId === v.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span className="font-medium">{visitDisplayTitle(v)}</span>
                    <span className="text-muted-foreground block text-xs">
                      {formatTimeShort(v.scheduled_start, tz)} ·{" "}
                      {visitPriorityLabel[v.priority]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside
        className="border-border xl:border-l xl:pl-8 space-y-5 xl:w-[min(100%,20rem)] xl:shrink-0"
        aria-label="Resumo e detalhe da visita"
      >
        <div className="grid grid-cols-3 gap-2">
          <div className="border-border bg-card rounded-xl border p-3 text-center shadow-xs">
            <ClipboardList className="text-primary mx-auto size-5 opacity-90" />
            <p className="text-foreground mt-2 text-lg font-bold tabular-nums">
              {stats.todayCount}
            </p>
            <p className="text-muted-foreground text-[0.65rem] leading-tight">
              Hoje
            </p>
          </div>
          <div className="border-border bg-card rounded-xl border p-3 text-center shadow-xs">
            <CalendarDays className="text-primary mx-auto size-5 opacity-90" />
            <p className="text-foreground mt-2 text-lg font-bold tabular-nums">
              {stats.weekCount}
            </p>
            <p className="text-muted-foreground text-[0.65rem] leading-tight">
              Semana
            </p>
          </div>
          <div className="border-border bg-card rounded-xl border p-3 text-center shadow-xs">
            <AlertCircle className="text-destructive mx-auto size-5 opacity-90" />
            <p className="text-foreground mt-2 text-lg font-bold tabular-nums">
              {stats.urgentWeek}
            </p>
            <p className="text-muted-foreground text-[0.65rem] leading-tight">
              Urgentes
            </p>
          </div>
        </div>

        <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-foreground text-sm font-semibold capitalize">
              {formatMonthYearTitle(miniMonthAnchor, tz)}
            </h2>
            <div className="flex gap-0.5">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "ghost", size: "icon-xs" }))}
                aria-label="Mês anterior"
                onClick={() => {
                  const [y, m] = miniMonthAnchor.split("-").map(Number);
                  const prev = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
                  setMiniMonthAnchor(prev);
                }}
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "ghost", size: "icon-xs" }))}
                aria-label="Mês seguinte"
                onClick={() => {
                  const [y, m] = miniMonthAnchor.split("-").map(Number);
                  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
                  setMiniMonthAnchor(next);
                }}
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="text-muted-foreground mb-1 grid grid-cols-7 gap-0.5 text-center text-[0.55rem] font-semibold leading-none">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
              <span key={label} className="truncate px-0.5">
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map(({ key, inMonth }) => {
              const count = (byDay.get(key) ?? []).length;
              const isSel = key === effectiveDayKey;
              const isTodayM = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    selectDay(key);
                    setWeekMonday(startOfIsoWeekMonday(key, tz));
                  }}
                  className={cn(
                    "relative flex aspect-square max-h-9 flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    !inMonth && "text-muted-foreground/40",
                    inMonth && "text-foreground",
                    isSel && "bg-primary text-primary-foreground",
                    !isSel && isTodayM && "ring-primary ring-2",
                    !isSel && !isTodayM && inMonth && "hover:bg-muted",
                  )}
                >
                  {Number(key.slice(8, 10))}
                  {count > 0 ? (
                    <span
                      className={cn(
                        "absolute bottom-0.5 h-1 w-1 rounded-full",
                        isSel ? "bg-primary-foreground" : "bg-primary",
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
          {selectedVisit ? (
            <>
              <h2 className="text-foreground text-sm font-semibold">
                Detalhe da visita
              </h2>
              <p className="text-foreground mt-2 text-lg font-semibold leading-snug">
                {visitDisplayTitle(selectedVisit)}
              </p>
              <dl className="text-muted-foreground mt-3 space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="min-w-[5rem] shrink-0 font-medium text-foreground/80">
                    Quando
                  </dt>
                  <dd>
                    {formatTimeShort(selectedVisit.scheduled_start, tz)} ·{" "}
                    {formatWeekdayShortDay(
                      visitDayKey(selectedVisit.scheduled_start, tz),
                      tz,
                    )}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="min-w-[5rem] shrink-0 font-medium text-foreground/80">
                    Prioridade
                  </dt>
                  <dd>{visitPriorityLabel[selectedVisit.priority]}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="min-w-[5rem] shrink-0 font-medium text-foreground/80">
                    Estado
                  </dt>
                  <dd>{visitStatusLabel[selectedVisit.status]}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="min-w-[5rem] shrink-0 font-medium text-foreground/80">
                    Tipo de visita
                  </dt>
                  <dd>
                    {visitKindLabel[
                      (selectedVisit.visit_kind ?? "other") as VisitKind
                    ]}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="min-w-[5rem] shrink-0 font-medium text-foreground/80">
                    Destino
                  </dt>
                  <dd>
                    {selectedVisit.target_type === "establishment"
                      ? "Estabelecimento"
                      : "Paciente"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="min-w-[5rem] shrink-0 font-medium text-foreground/80">
                    Profissional
                  </dt>
                  <dd>
                    {selectedVisit.team_members
                      ? `${selectedVisit.team_members.full_name} (${teamJobRoleLabel[selectedVisit.team_members.job_role as TeamJobRole] ?? selectedVisit.team_members.job_role})`
                      : "Titular da conta"}
                  </dd>
                </div>
              </dl>
              {selectedVisit.notes ? (
                <p className="text-muted-foreground mt-3 border-t pt-3 text-sm">
                  <span className="text-foreground font-medium">Notas: </span>
                  {selectedVisit.notes}
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href={`/visitas/${selectedVisit.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-center",
                  )}
                >
                  Ficha completa
                </Link>
                {canStartVisit(selectedVisit) ? (
                  <Link
                    href={`/visitas/${selectedVisit.id}/iniciar`}
                    className={cn(buttonVariants(), "w-full justify-center")}
                  >
                    {selectedVisit.status === "in_progress"
                      ? "Continuar visita"
                      : "Iniciar visita"}
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-foreground text-sm font-semibold">
                Dia selecionado
              </h2>
              <p className="text-muted-foreground mt-2 text-sm capitalize">
                {formatWeekdayShortDay(effectiveDayKey, tz)}
              </p>
              {dayVisitsSelected.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                  Sem compromissos neste dia
                  {priorityFilter !== "all" ? " com este filtro" : ""}. Agende ou
                  escolha outro dia no calendário.
                </p>
              ) : (
                <p className="text-muted-foreground mt-3 text-sm">
                  {dayVisitsSelected.length} visita
                  {dayVisitsSelected.length !== 1 ? "s" : ""} neste dia. Toque num
                  cartão na grelha para ver detalhes.
                </p>
              )}
              <Link
                href="/visitas/nova"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "mt-4 inline-flex w-full justify-center gap-2",
                )}
              >
                <Plus className="size-4" />
                Nova visita neste contexto
              </Link>
            </>
          )}
        </div>
      </aside>

      <VisitQuickDetailDialog
        visit={selectedVisit}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        canStartVisit={canStartVisit}
      />
    </div>
  );
}
