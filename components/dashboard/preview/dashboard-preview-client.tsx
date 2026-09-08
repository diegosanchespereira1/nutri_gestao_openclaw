"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Clock3,
  Users,
} from "lucide-react";

import { VisitsPerformedChartCard } from "@/components/dashboard/visits-performed-chart-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import type { VisitPerformedInput } from "@/lib/dashboard/visits-performed";
import { addCalendarDays, todayKey } from "@/lib/datetime/calendar-tz";
import { DEFAULT_PROFILE_TIME_ZONE } from "@/lib/timezones";
import type { TeamMemberRow } from "@/lib/types/team-members";
import { cn } from "@/lib/utils";

type PreviewRole = "gestor" | "campo";

type SectionTone = "default" | "urgent" | "financial";

const TAB_BTN =
  "ring-offset-background focus-visible:ring-ring inline-flex min-h-11 flex-1 items-center justify-center rounded-md border px-3 py-2 text-center text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:flex-none border-border/80 bg-card text-foreground/80 shadow-xs touch-manipulation hover:border-primary/45 hover:bg-primary/18 hover:text-foreground";

const PREVIEW_ANA_ID = "preview-member-ana";
const PREVIEW_PEDRO_ID = "preview-member-pedro";
const PREVIEW_ME_ID = "preview-member-me";
const PREVIEW_ANA_USER = "preview-user-ana";
const PREVIEW_PEDRO_USER = "preview-user-pedro";
const PREVIEW_ME_USER = "preview-user-me";

const PREVIEW_TEAM_MEMBERS: TeamMemberRow[] = [
  previewTeamMember(PREVIEW_ANA_ID, PREVIEW_ANA_USER, "Ana Souza"),
  previewTeamMember(PREVIEW_PEDRO_ID, PREVIEW_PEDRO_USER, "Pedro Lima"),
  previewTeamMember(PREVIEW_ME_ID, PREVIEW_ME_USER, "Diego"),
];

function previewTeamMember(
  id: string,
  memberUserId: string,
  fullName: string,
): TeamMemberRow {
  return {
    id,
    owner_user_id: "preview-owner",
    member_user_id: memberUserId,
    full_name: fullName,
    email: null,
    phone: null,
    professional_area: "nutrition",
    job_role: "nutricionista",
    crn: null,
    notes: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

const WEEKDAYS_PT = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

function formatPreviewDateLabel(referenceIso: string): string {
  const key = todayKey(new Date(referenceIso), DEFAULT_PROFILE_TIME_ZONE);
  const [year, month, day] = key.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return `${WEEKDAYS_PT[utcNoon.getUTCDay()]}, ${day} de ${MONTHS_PT[month - 1]}`;
}

function isoOnCalendarDay(dayKey: string, hourUtc: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hourUtc, 0, 0)).toISOString();
}

function previewVisit(
  dayKey: string,
  hourUtc: number,
  input: {
    memberId: string;
    userId: string;
    professional: string;
    target: string;
    kind: string;
    priority: string;
  },
): VisitPerformedInput {
  return {
    scheduled_start: isoOnCalendarDay(dayKey, hourUtc),
    status: "completed",
    assigned_team_member_id: input.memberId,
    user_id: input.userId,
    team_members: { full_name: input.professional },
    creator_full_name: input.professional,
    target_type: "establishment",
    target_name: input.target,
    visit_kind_label: input.kind,
    priority_label: input.priority,
    professional_label: input.professional,
  };
}

function buildPreviewCompletedVisits(referenceIso: string): VisitPerformedInput[] {
  const today = todayKey(new Date(referenceIso), DEFAULT_PROFILE_TIME_ZONE);
  const day = (offset: number) =>
    addCalendarDays(today, -offset, DEFAULT_PROFILE_TIME_ZONE);

  return [
    previewVisit(day(0), 12, {
      memberId: PREVIEW_ME_ID,
      userId: PREVIEW_ME_USER,
      professional: "Diego",
      target: "Colégio Jardim das Flores",
      kind: "Inspeção",
      priority: "Alta",
    }),
    previewVisit(day(0), 17, {
      memberId: PREVIEW_ANA_ID,
      userId: PREVIEW_ANA_USER,
      professional: "Ana Souza",
      target: "Clínica Vida Plena",
      kind: "Rotina",
      priority: "Normal",
    }),
    previewVisit(day(1), 14, {
      memberId: PREVIEW_PEDRO_ID,
      userId: PREVIEW_PEDRO_USER,
      professional: "Pedro Lima",
      target: "Lar São José",
      kind: "Checklist",
      priority: "Alta",
    }),
    previewVisit(day(2), 11, {
      memberId: PREVIEW_ME_ID,
      userId: PREVIEW_ME_USER,
      professional: "Diego",
      target: "Escola Solar",
      kind: "Rotina",
      priority: "Normal",
    }),
    previewVisit(day(2), 18, {
      memberId: PREVIEW_ANA_ID,
      userId: PREVIEW_ANA_USER,
      professional: "Ana Souza",
      target: "Mini Baby",
      kind: "Inspeção",
      priority: "Normal",
    }),
    previewVisit(day(3), 13, {
      memberId: PREVIEW_ANA_ID,
      userId: PREVIEW_ANA_USER,
      professional: "Ana Souza",
      target: "Hospital Santa Clara",
      kind: "Clínica",
      priority: "Alta",
    }),
    previewVisit(day(4), 12, {
      memberId: PREVIEW_ME_ID,
      userId: PREVIEW_ME_USER,
      professional: "Diego",
      target: "Colégio Jardim das Flores",
      kind: "Checklist",
      priority: "Normal",
    }),
    previewVisit(day(4), 19, {
      memberId: PREVIEW_PEDRO_ID,
      userId: PREVIEW_PEDRO_USER,
      professional: "Pedro Lima",
      target: "Lar São José",
      kind: "Rotina",
      priority: "Normal",
    }),
    previewVisit(day(5), 16, {
      memberId: PREVIEW_PEDRO_ID,
      userId: PREVIEW_PEDRO_USER,
      professional: "Pedro Lima",
      target: "Clínica Vida Plena",
      kind: "Inspeção",
      priority: "Alta",
    }),
    previewVisit(day(6), 13, {
      memberId: PREVIEW_ME_ID,
      userId: PREVIEW_ME_USER,
      professional: "Diego",
      target: "Escola Solar",
      kind: "Rotina",
      priority: "Normal",
    }),
    previewVisit(day(14), 12, {
      memberId: PREVIEW_ANA_ID,
      userId: PREVIEW_ANA_USER,
      professional: "Ana Souza",
      target: "Mini Baby",
      kind: "Checklist",
      priority: "Normal",
    }),
    previewVisit(day(40), 14, {
      memberId: PREVIEW_PEDRO_ID,
      userId: PREVIEW_PEDRO_USER,
      professional: "Pedro Lima",
      target: "Hospital Santa Clara",
      kind: "Inspeção",
      priority: "Alta",
    }),
  ];
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionCard({
  id,
  title,
  description,
  actions,
  tone = "default",
  children,
}: {
  id: string;
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: SectionTone;
  children: ReactNode;
}) {
  const toneClass =
    tone === "urgent"
      ? "border-l-4 border-l-destructive"
      : tone === "financial"
        ? "border-l-4 border-l-amber-600/80"
        : "";

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn(
        "rounded-xl border border-border bg-white p-4 shadow-xs scroll-mt-20 dark:bg-card",
        toneClass,
      )}
    >
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2
            id={`${id}-heading`}
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

function KpiButton({
  label,
  value,
  hint,
  tone,
  targetId,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "default" | "danger" | "warning" | "money";
  targetId?: string;
  href?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "border-l-4 border-l-destructive"
      : tone === "warning"
        ? "border-l-4 border-l-warning"
        : tone === "money"
          ? "border-l-4 border-l-amber-600/80"
          : "border-l-4 border-l-primary";

  const className = cn(
    "min-h-11 rounded-xl border border-border bg-white p-3 text-left shadow-xs transition-colors dark:bg-card",
    "hover:border-primary/35 hover:bg-background/80",
    "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "block w-full",
    toneClass,
  );

  const body = (
    <>
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1 text-2xl font-bold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (targetId) scrollToId(targetId);
      }}
      className={className}
    >
      {body}
    </button>
  );
}

function VisitRow({
  title,
  meta,
  badge,
  cta,
}: {
  title: string;
  meta: string;
  badge: string;
  cta: string;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border border-l-4 border-l-primary bg-card/50 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-foreground font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{meta}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge variant="outline">{badge}</Badge>
        <Link
          href="/visitas"
          className={cn(
            buttonVariants({ size: "sm" }),
            "min-h-11 justify-center px-4",
          )}
        >
          {cta}
        </Link>
      </div>
    </article>
  );
}

function AlertRow({
  title,
  meta,
  status,
  href,
  cta,
}: {
  title: string;
  meta: string;
  status: "vencido" | "semana";
  href: string;
  cta: string;
}) {
  const urgent = status === "vencido";
  return (
    <article
      className={cn(
        "rounded-lg border border-border p-3",
        urgent
          ? "border-l-[3px] border-l-destructive bg-red-50/50 dark:bg-red-950/20"
          : "border-l-[3px] border-l-warning bg-amber-50/50 dark:bg-amber-950/20",
      )}
    >
      <div className="flex gap-2">
        <AlertTriangle
          className={cn(
            "mt-0.5 size-4 shrink-0",
            urgent ? "text-destructive" : "text-amber-600 dark:text-amber-400",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold leading-tight">
            {title}
          </p>
          <p className="text-muted-foreground text-xs leading-snug">{meta}</p>
          <Link
            href={href}
            className="text-primary mt-1 inline-block text-xs font-medium underline-offset-4 hover:underline"
          >
            {cta}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function DashboardPreviewClient({
  firstName,
  referenceIso,
}: {
  firstName: string | null;
  referenceIso: string;
}) {
  const [role, setRole] = useState<PreviewRole>("gestor");
  const chartReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isGestor = role === "gestor";

  const dateLabel = useMemo(
    () => formatPreviewDateLabel(referenceIso),
    [referenceIso],
  );
  const completedVisits = useMemo(
    () => buildPreviewCompletedVisits(referenceIso),
    [referenceIso],
  );
  const visibleVisits = isGestor
    ? completedVisits
    : completedVisits.filter(
        (visit) => visit.assigned_team_member_id === PREVIEW_ME_ID,
      );
  const visibleMembers = isGestor
    ? PREVIEW_TEAM_MEMBERS
    : PREVIEW_TEAM_MEMBERS.filter((member) => member.id === PREVIEW_ME_ID);

  return (
    <div className="space-y-6">
      <aside
        className="rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 text-sm"
        role="status"
      >
        <p className="text-foreground font-medium">Laboratório visual — o dashboard oficial já usa esta hierarquia</p>
        <p className="text-muted-foreground mt-1">
          Aqui os dados continuam de exemplo.{" "}
          <Link href="/dashboard" className="text-primary font-medium underline-offset-4 hover:underline">
            Ir ao dashboard com dados reais
          </Link>
        </p>
      </aside>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-foreground min-w-0 text-2xl font-bold tracking-tight sm:text-3xl">
            {firstName ? `Olá ${firstName}` : "Olá"}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm capitalize">
            {dateLabel}
            <span className="normal-case">
              {" "}
              · {isGestor ? "visão de gestão da equipe" : "visão de campo — o que é seu hoje"}
            </span>
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href="/visitas/nova"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-11 w-full justify-center sm:w-auto",
            )}
          >
            Agendar visita
          </Link>
          <Link
            href="/clientes/novo"
            className={cn(
              buttonVariants({ size: "sm" }),
              "min-h-11 w-full justify-center sm:w-auto",
            )}
          >
            Novo cliente
          </Link>
        </div>
      </div>

      <nav
        className="border-border bg-muted/70 inline-flex min-h-11 w-full max-w-full flex-wrap gap-1 rounded-lg border p-1 shadow-inner"
        aria-label="Papel para esta proposta"
      >
        <button
          type="button"
          onClick={() => setRole("gestor")}
          className={cn(
            TAB_BTN,
            isGestor
              ? "border-primary bg-primary text-primary-foreground shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground"
              : "",
          )}
        >
          Gestor da equipe
        </button>
        <button
          type="button"
          onClick={() => setRole("campo")}
          className={cn(
            TAB_BTN,
            !isGestor
              ? "border-primary bg-primary text-primary-foreground shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground"
              : "",
          )}
        >
          Profissional de campo
        </button>
      </nav>

      <section aria-label="Pulso do dia" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiButton
          label={isGestor ? "Visitas hoje" : "Minhas visitas"}
          value={isGestor ? "5" : "2"}
          hint={isGestor ? "3 profissionais em campo" : "próxima às 09:00"}
          tone="default"
          targetId="preview-agenda"
        />
        <KpiButton
          label="Em atraso"
          value={isGestor ? "3" : "1"}
          hint="prazos e checklists vencidos"
          tone="danger"
          href="/checklists/vencidos"
        />
        <KpiButton
          label="Checklists a vencer"
          value={isGestor ? "4" : "2"}
          hint="nos próximos 90 dias"
          tone="warning"
          href="/checklists/a-vencer"
        />
        {isGestor ? (
          <KpiButton
            label="Valores em atraso"
            value="R$ 4.280"
            hint="3 cobranças"
            tone="money"
            targetId="preview-financeiro"
          />
        ) : (
          <KpiButton
            label="Próximo compromisso"
            value="09:00"
            hint="Jardim das Flores"
            tone="default"
            targetId="preview-agenda"
          />
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard
            id="preview-agenda"
            title="Agenda do dia"
            description={
              isGestor
                ? "Cobertura da equipe — quem está em campo agora."
                : "O que precisa acontecer hoje, na sua rota."
            }
            actions={
              <Link
                href="/visitas"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "min-h-11 w-full justify-center sm:w-auto",
                )}
              >
                Agenda completa
              </Link>
            }
          >
            <ul className="space-y-3">
              {(isGestor
                ? [
                    {
                      title: "Colégio Jardim das Flores",
                      meta: "09:00 · Ana Souza · inspeção de refeitório",
                      badge: "Alta",
                      cta: "Ver",
                    },
                    {
                      title: "Lar São José",
                      meta: "11:30 · Você · checklist RDC 216",
                      badge: "Em curso",
                      cta: "Continuar",
                    },
                    {
                      title: "Clínica Vida Plena",
                      meta: "14:00 · Pedro Lima · visita de rotina",
                      badge: "Normal",
                      cta: "Ver",
                    },
                  ]
                : [
                    {
                      title: "Colégio Jardim das Flores",
                      meta: "09:00 · inspeção de refeitório",
                      badge: "Alta",
                      cta: "Iniciar",
                    },
                    {
                      title: "Lar São José",
                      meta: "11:30 · checklist RDC 216",
                      badge: "Em curso",
                      cta: "Continuar",
                    },
                  ]
              ).map((visit) => (
                <li key={visit.title}>
                  <VisitRow {...visit} />
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="xl:col-span-5">
          <SectionCard
            id="preview-atencao"
            title="Checklists em alerta"
            description="Só o que já passou do ponto ou vence nesta semana."
            tone="urgent"
          >
            <div className="space-y-2.5">
              <AlertRow
                title="POP Cozinha — vencido há 4 dias"
                meta="Colégio Jardim das Flores"
                status="vencido"
                href="/checklists"
                cta="Abrir dossiê"
              />
              <AlertRow
                title="Licença sanitária em atraso"
                meta="Lar São José · limite 02/09"
                status="vencido"
                href="/clientes"
                cta="Gerir prazos"
              />
              {isGestor ? (
                <AlertRow
                  title="Boas práticas — vence em 5 dias"
                  meta="Clínica Vida Plena"
                  status="semana"
                  href="/checklists"
                  cta="Ver checklist"
                />
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SectionCard
            id="preview-semana"
            title="Agenda da semana"
            description="06 a 13 de setembro — horizonte da semana, sem esconder em acordeão."
            actions={
              <Link
                href="/visitas"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "min-h-11 w-full justify-center sm:w-auto",
                )}
              >
                Ver agenda
              </Link>
            }
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                  <CalendarClock className="size-3.5" aria-hidden />
                  Visitas
                </h3>
                <ul className="space-y-2">
                  <li className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm">
                    <span className="font-medium">Escola Solar — maternal</span>
                    <span className="text-muted-foreground text-xs">Ter 09/09 · 10:00</span>
                  </li>
                  <li className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm">
                    <span className="font-medium">Hospital Santa Clara — nutrição clínica</span>
                    <span className="text-muted-foreground text-xs">Qui 11/09 · 08:30</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                  <ClipboardList className="size-3.5" aria-hidden />
                  Prazos
                </h3>
                <ul className="space-y-2">
                  <li className="border-border rounded-lg border bg-background/80 px-3 py-2 text-sm">
                    <p className="font-medium">Alvará sanitário</p>
                    <p className="text-muted-foreground text-xs">Mini Baby · limite 12/09</p>
                  </li>
                </ul>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-5">
          {isGestor ? (
            <SectionCard
              id="preview-financeiro"
              title="Financeiro"
              description="Cobranças em atraso e contratos que pedem renovação."
              tone="financial"
              actions={
                <Link
                  href="/financeiro?tab=operacoes&status=overdue"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "min-h-11 w-full justify-center sm:w-auto",
                  )}
                >
                  Ver pendências
                </Link>
              }
            >
              <div className="space-y-4">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Em atraso
                  </p>
                  <p className="text-foreground mt-1 text-lg font-semibold tabular-nums">
                    R$ 4.280
                  </p>
                  <p className="text-muted-foreground text-xs">3 cobranças vencidas</p>
                </div>
                <div className="border-amber-500/40 bg-amber-500/8 rounded-lg border px-3 py-2">
                  <p className="text-foreground text-sm font-medium">1 contrato a vencer em 18 dias</p>
                  <p className="text-muted-foreground text-xs">Colégio Jardim das Flores — mensal</p>
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              id="preview-financeiro"
              title="Atalhos da rota"
              description="O que o profissional precisa sem sair do início."
            >
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href="/checklists"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-11 justify-start",
                  )}
                >
                  <ClipboardList className="size-4" aria-hidden />
                  Meus checklists
                </Link>
                <Link
                  href="/visitas"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-11 justify-start",
                  )}
                >
                  <Clock3 className="size-4" aria-hidden />
                  Próximas visitas
                </Link>
                <Link
                  href="/clientes"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-11 justify-start",
                  )}
                >
                  <Users className="size-4" aria-hidden />
                  Clientes da rota
                </Link>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <SectionCard
        id="preview-ritmo"
        title={isGestor ? "Ritmo da equipe" : "O meu ritmo"}
        description={
          isGestor
            ? "Visitas concluídas. Filtra período e profissional e exporta o Excel do que está no gráfico."
            : "As suas visitas concluídas. Filtra o período e exporta o Excel."
        }
      >
        {chartReady ? (
          <VisitsPerformedChartCard
            visits={visibleVisits}
            teamMembers={visibleMembers}
            timeZone={DEFAULT_PROFILE_TIME_ZONE}
            referenceIso={referenceIso}
          />
        ) : (
          <div
            className="border-border bg-muted/40 h-[280px] animate-pulse rounded-lg border"
            aria-hidden
          />
        )}
      </SectionCard>
    </div>
  );
}
