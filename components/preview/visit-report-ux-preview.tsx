"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type PreviewVisit = {
  date: string;
  time: string;
  client: string;
  kind: string;
  nutri: string;
  status: string;
  checklist: string;
};

type GroupKey = "nutri" | "client" | "date" | "kind";

const VISITS: PreviewVisit[] = [
  { date: "2026-09-01", time: "09:00", client: "Escola Aurora", kind: "Visita clínica / paciente", nutri: "Ana Lima", status: "Concluída", checklist: "Aprovado" },
  { date: "2026-09-01", time: "14:00", client: "Hospital TESTE", kind: "Visita técnica / conformidade", nutri: "Diego Sanches", status: "Concluída", checklist: "Aprovado" },
  { date: "2026-09-02", time: "10:30", client: "Lar São José", kind: "Auditoria / inspeção", nutri: "Ana Lima", status: "Concluída", checklist: "Com apontamentos" },
  { date: "2026-09-03", time: "08:45", client: "Clínica Norte", kind: "Formação / capacitação", nutri: "Bruno Costa", status: "Concluída", checklist: "Aprovado" },
  { date: "2026-09-03", time: "15:00", client: "Escola Aurora", kind: "Acompanhamento / retorno", nutri: "Ana Lima", status: "Concluída", checklist: "Aprovado" },
  { date: "2026-09-04", time: "13:05", client: "Hospital TESTE", kind: "Visita técnica / conformidade", nutri: "Diego Sanches", status: "Concluída", checklist: "Aprovado" },
  { date: "2026-09-05", time: "11:00", client: "Lar São José", kind: "Visita clínica / paciente", nutri: "Bruno Costa", status: "Concluída", checklist: "Aprovado" },
  { date: "2026-09-05", time: "16:20", client: "Clínica Norte", kind: "Visita técnica / conformidade", nutri: "Diego Sanches", status: "Concluída", checklist: "Com apontamentos" },
  { date: "2026-09-07", time: "09:15", client: "Escola Aurora", kind: "Auditoria / inspeção", nutri: "Ana Lima", status: "Concluída", checklist: "Aprovado" },
];

const GROUPS: { value: GroupKey; label: string }[] = [
  { value: "nutri", label: "Profissional" },
  { value: "client", label: "Cliente" },
  { value: "date", label: "Data" },
  { value: "kind", label: "Atividade" },
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function groupValue(visit: PreviewVisit, group: GroupKey): string {
  if (group === "client") return visit.client;
  if (group === "date") return formatDate(visit.date);
  if (group === "kind") return visit.kind;
  return visit.nutri;
}

export function VisitReportUxPreview() {
  const [screen, setScreen] = useState<"agenda" | "relatorio">("agenda");
  const [from, setFrom] = useState("2026-09-01");
  const [to, setTo] = useState("2026-09-07");
  const [client, setClient] = useState("all");
  const [nutri, setNutri] = useState("all");
  const [kind, setKind] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupKey>("nutri");

  const list = useMemo(
    () =>
      VISITS.filter((visit) => {
        if (visit.date < from || visit.date > to) return false;
        if (client !== "all" && visit.client !== client) return false;
        if (nutri !== "all" && visit.nutri !== nutri) return false;
        if (kind !== "all" && visit.kind !== kind) return false;
        return true;
      }),
    [from, to, client, nutri, kind],
  );

  const groups = useMemo(() => {
    const map = new Map<string, PreviewVisit[]>();
    for (const visit of list) {
      const key = groupValue(visit, groupBy);
      const bucket = map.get(key) ?? [];
      bucket.push(visit);
      map.set(key, bucket);
    }
    return [...map.entries()];
  }, [list, groupBy]);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="border-warning/40 bg-warning/15 text-warning-foreground border-b px-4 py-2 text-center text-xs font-medium">
        Protótipo UX temporário — dados fictícios · não grava nada
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <button type="button" className="underline" onClick={() => setScreen("agenda")}>
          Agenda
        </button>
        <span className="mx-1" aria-hidden>
          ·
        </span>
        <button type="button" className="underline" onClick={() => setScreen("relatorio")}>
          Relatório
        </button>
      </div>

      {screen === "agenda" ? (
        <AgendaPreview onOpenReport={() => setScreen("relatorio")} />
      ) : (
        <ReportPreview
          from={from}
          to={to}
          client={client}
          nutri={nutri}
          kind={kind}
          groupBy={groupBy}
          list={list}
          groups={groups}
          onBack={() => setScreen("agenda")}
          onFrom={setFrom}
          onTo={setTo}
          onClient={setClient}
          onNutri={setNutri}
          onKind={setKind}
          onGroupBy={setGroupBy}
          onReset={() => {
            setFrom("2026-09-01");
            setTo("2026-09-07");
            setClient("all");
            setNutri("all");
            setKind("all");
          }}
        />
      )}
    </div>
  );
}

function AgendaPreview({ onOpenReport }: { onOpenReport: () => void }) {
  return (
    <div className="flex min-h-[calc(100vh-2.25rem)]">
      <aside className="bg-sidebar text-sidebar-foreground hidden w-56 shrink-0 flex-col lg:flex">
        <div className="px-5 py-6 text-lg font-semibold tracking-tight">NutriGestão</div>
        <nav className="space-y-1 px-3 text-sm">
          <span className="block rounded-lg px-3 py-2 opacity-70">Dashboard</span>
          <span className="block rounded-lg px-3 py-2 opacity-70">Clientes</span>
          <span className="bg-sidebar-accent rounded-lg px-3 py-2 font-medium">Visitas</span>
          <span className="block rounded-lg px-3 py-2 opacity-70">Equipe</span>
        </nav>
        <p className="mt-auto px-5 py-4 text-[0.65rem] opacity-40">Visão de gestão</p>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-4 xl:flex-row xl:items-start xl:gap-8 xl:p-6">
          <div className="min-w-0 flex-1 space-y-4">
            <header>
              <h1 className="text-2xl font-semibold tracking-tight">Agenda de visitas</h1>
              <p className="text-muted-foreground mt-1 max-w-xl text-sm">
                A grelha fica como está. O relatório entra só no cartão à direita,
                na mesma coluna do detalhe — sem terceira coluna e sem overlay.
              </p>
            </header>

            <div className="border-border bg-card rounded-2xl border p-4 shadow-xs sm:p-5">
              <div className="mb-3 flex items-center justify-between text-sm">
                <p className="font-semibold">7 – 13 set 2026</p>
                <span className="bg-primary/10 text-primary rounded-md px-2 py-1 text-xs font-medium">
                  Semana
                </span>
              </div>
              <div className="text-muted-foreground grid grid-cols-5 gap-2 text-center text-[0.65rem] font-semibold uppercase">
                <span>Seg 7</span>
                <span>Ter 8</span>
                <span>Qua 9</span>
                <span className="text-primary">Qui 10</span>
                <span>Sex 11</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <VisitChip time="13:05" title="Hospital TESTE" kind="Visita técnica" who="Diego Sanches" tone="sky" />
                <VisitChip time="09:00" title="Escola Aurora" kind="Visita clínica" who="Ana Lima" tone="teal" />
                <div className="hidden sm:block" />
                <VisitChip time="14:30" title="Lar São José" kind="Auditoria" who="Ana Lima" tone="amber" />
                <VisitChip time="10:00" title="Clínica Norte" kind="Formação" who="Bruno Costa" tone="violet" />
              </div>
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-5 xl:w-80" aria-label="Resumo e atalhos de gestão">
            <div className="grid grid-cols-3 gap-2">
              <Stat value="4" label="Hoje" />
              <Stat value="11" label="Semana" />
              <Stat value="1" label="Urgentes" danger />
            </div>

            <div className="border-border bg-card rounded-2xl border p-4 shadow-xs">
              <h2 className="text-sm font-semibold">Detalhe da visita</h2>
              <p className="mt-2 text-lg font-semibold leading-snug">Hospital TESTE</p>
              <dl className="text-muted-foreground mt-3 space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="text-foreground/80 w-20 font-medium">Quando</dt>
                  <dd>13:05 · Qui 10</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-foreground/80 w-20 font-medium">Tipo</dt>
                  <dd>Visita técnica</dd>
                </div>
              </dl>
              <div className="border-primary/20 bg-primary/5 mt-3 rounded-xl border px-3 py-2.5">
                <p className="text-muted-foreground text-xs font-medium">Quem atende</p>
                <p className="mt-0.5 text-sm font-semibold">Diego Sanches (Nutricionista)</p>
              </div>
            </div>

            <div className="border-primary/25 bg-card rounded-2xl border p-4 shadow-xs">
              <p className="text-primary text-[0.65rem] font-semibold uppercase tracking-wide">
                Gestão
              </p>
              <h2 className="mt-1 text-sm font-semibold">Relatório de visitas</h2>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                Audite o trabalho da equipe. Filtre por cliente, profissional, data e atividade.
              </p>
              <button
                type="button"
                onClick={onOpenReport}
                className={cn(buttonVariants(), "mt-3 min-h-11 w-full")}
              >
                Abrir relatório
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReportPreview({
  from,
  to,
  client,
  nutri,
  kind,
  groupBy,
  list,
  groups,
  onBack,
  onFrom,
  onTo,
  onClient,
  onNutri,
  onKind,
  onGroupBy,
  onReset,
}: {
  from: string;
  to: string;
  client: string;
  nutri: string;
  kind: string;
  groupBy: GroupKey;
  list: PreviewVisit[];
  groups: [string, PreviewVisit[]][];
  onBack: () => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onClient: (value: string) => void;
  onNutri: (value: string) => void;
  onKind: (value: string) => void;
  onGroupBy: (value: GroupKey) => void;
  onReset: () => void;
}) {
  const inputClass =
    "border-input bg-background mt-1 min-h-11 w-full rounded-md border px-2 text-sm";

  return (
    <div className="flex min-h-[calc(100vh-2.25rem)]">
      <aside className="bg-sidebar text-sidebar-foreground hidden w-56 shrink-0 flex-col lg:flex">
        <div className="px-5 py-6 text-lg font-semibold tracking-tight">NutriGestão</div>
        <nav className="space-y-1 px-3 text-sm">
          <span className="block rounded-lg px-3 py-2 opacity-70">Dashboard</span>
          <span className="block rounded-lg px-3 py-2 opacity-70">Clientes</span>
          <span className="bg-sidebar-accent rounded-lg px-3 py-2 font-medium">Visitas</span>
        </nav>
      </aside>

      <div className="min-w-0 flex-1 p-4 xl:p-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              className="mb-2 gap-1.5"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Agenda
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-primary text-[0.65rem] font-semibold uppercase tracking-wide">
                  Auditoria da equipe
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Relatório de visitas realizadas
                </h1>
                <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                  Primeiro o recorte, depois o ranking por profissional, depois a lista com todos os campos.
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
                  Exportar Excel
                </button>
                <button type="button" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
                  Imprimir
                </button>
              </div>
            </div>
          </div>

          <form
            className="border-border bg-card rounded-2xl border p-4 shadow-xs"
            onSubmit={(event) => event.preventDefault()}
          >
            <p className="mb-3 text-sm font-semibold">Recorte da auditoria</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-muted-foreground block text-xs font-medium">
                Período
                <span className="flex gap-1">
                  <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className={inputClass} />
                  <input type="date" value={to} onChange={(e) => onTo(e.target.value)} className={inputClass} />
                </span>
              </label>
              <label className="text-muted-foreground block text-xs font-medium">
                Cliente
                <select value={client} onChange={(e) => onClient(e.target.value)} className={inputClass}>
                  <option value="all">Todos os clientes</option>
                  <option>Hospital TESTE</option>
                  <option>Escola Aurora</option>
                  <option>Lar São José</option>
                  <option>Clínica Norte</option>
                </select>
              </label>
              <label className="text-muted-foreground block text-xs font-medium">
                Profissional
                <select value={nutri} onChange={(e) => onNutri(e.target.value)} className={inputClass}>
                  <option value="all">Toda a equipe</option>
                  <option>Ana Lima</option>
                  <option>Diego Sanches</option>
                  <option>Bruno Costa</option>
                </select>
              </label>
              <label className="text-muted-foreground block text-xs font-medium">
                Atividade
                <select value={kind} onChange={(e) => onKind(e.target.value)} className={inputClass}>
                  <option value="all">Todas as atividades</option>
                  <option>Visita técnica / conformidade</option>
                  <option>Visita clínica / paciente</option>
                  <option>Auditoria / inspeção</option>
                  <option>Formação / capacitação</option>
                  <option>Acompanhamento / retorno</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="submit" className={cn(buttonVariants(), "min-h-11")}>
                Aplicar filtros
              </button>
              <button
                type="button"
                onClick={onReset}
                className={cn(buttonVariants({ variant: "ghost" }), "min-h-11")}
              >
                Limpar
              </button>
              <p className="text-muted-foreground text-xs">
                {list.length} visita(s) · {formatDate(from)} → {formatDate(to)}
              </p>
            </div>
          </form>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Visitas concluídas" value={list.length} />
            <Kpi label="Profissionais no recorte" value={new Set(list.map((v) => v.nutri)).size} />
            <Kpi label="Clientes atendidos" value={new Set(list.map((v) => v.client)).size} />
            <Kpi label="Atividades distintas" value={new Set(list.map((v) => v.kind)).size} />
          </div>

          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium">Separar por</p>
            <div className="border-border bg-muted/40 inline-flex flex-wrap gap-0.5 rounded-lg border p-0.5">
              {GROUPS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onGroupBy(option.value)}
                  className={cn(
                    "min-h-9 rounded-md px-3 text-xs font-medium",
                    groupBy === option.value
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {groups.length === 0 ? (
              <p className="border-border bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
                Nenhuma visita neste recorte. Alargue o período ou limpe um filtro.
              </p>
            ) : (
              groups.map(([name, items]) => (
                <article key={name} className="border-border bg-card rounded-xl border p-4 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">{name}</h3>
                      <p className="text-muted-foreground mt-0.5 text-xs">Performance no recorte</p>
                    </div>
                    <div className="flex gap-4 text-right text-xs">
                      <div>
                        <p className="tabular-nums text-base font-bold">{items.length}</p>
                        <p className="text-muted-foreground">visitas</p>
                      </div>
                      <div>
                        <p className="tabular-nums text-base font-bold">
                          {new Set(items.map((item) => item.client)).size}
                        </p>
                        <p className="text-muted-foreground">clientes</p>
                      </div>
                      <div>
                        <p className="tabular-nums text-base font-bold">
                          {new Set(items.map((item) => item.kind)).size}
                        </p>
                        <p className="text-muted-foreground">atividades</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-xs">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Todas as visitas do recorte</h2>
              <p className="text-muted-foreground text-xs">Colunas completas para auditoria</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs font-semibold">
                  <tr>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Hora</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Atividade</th>
                    <th className="px-3 py-2">Profissional</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Checklist</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {list.map((visit) => (
                    <tr key={`${visit.date}-${visit.time}-${visit.client}`}>
                      <td className="px-3 py-2.5 tabular-nums">{formatDate(visit.date)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{visit.time}</td>
                      <td className="px-3 py-2.5 font-medium">{visit.client}</td>
                      <td className="px-3 py-2.5">{visit.kind}</td>
                      <td className="px-3 py-2.5">{visit.nutri}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          {visit.status}
                        </span>
                      </td>
                      <td className="text-muted-foreground px-3 py-2.5">{visit.checklist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  danger = false,
}: {
  value: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-3 text-center shadow-xs">
      <p className={cn("tabular-nums text-lg font-bold", danger && "text-destructive")}>
        {value}
      </p>
      <p className="text-muted-foreground text-[0.65rem]">{label}</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function VisitChip({
  time,
  title,
  kind,
  who,
  tone,
}: {
  time: string;
  title: string;
  kind: string;
  who: string;
  tone: "sky" | "teal" | "amber" | "violet";
}) {
  const toneClass = {
    sky: "border-sky-500 bg-sky-50",
    teal: "border-primary bg-primary/5",
    amber: "border-amber-500 bg-amber-50",
    violet: "border-violet-500 bg-violet-50",
  }[tone];

  return (
    <article className={cn("rounded-lg border-l-4 p-2 text-left", toneClass)}>
      <p className="text-muted-foreground text-[0.65rem]">{time}</p>
      <p className="text-xs font-semibold">{title}</p>
      <p className="mt-1 text-[0.65rem] font-medium">{kind}</p>
      <p className="text-foreground/70 text-[0.65rem]">{who}</p>
    </article>
  );
}
