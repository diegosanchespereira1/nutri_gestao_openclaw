"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ListChecks,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Screen = "hub" | "andamento" | "vencidos" | "vencer";
type Tab = "preencher" | "modelos";
type Origin = "system" | "workspace" | "custom";
type OriginFilter = "all" | Origin;
type EstType = "escola" | "hospital" | "clinica" | "ilpi" | "empresa" | "hotel";

type PreviewEstablishment = {
  id: string;
  name: string;
  client: string;
  type: EstType;
  uf: string;
  areas: string[];
};

type PreviewTemplate = {
  id: string;
  name: string;
  origin: Origin;
  portaria: string | null;
  appliesTo: EstType[];
  required: number;
  total: number;
  clientOnly?: string;
  establishmentId?: string;
  sections: string[];
};

type PreviewSession = {
  id: string;
  templateId: string;
  establishmentId: string;
  progress: number;
  professional: string;
  updated: string;
};

type ValidityItem = {
  id: string;
  template: string;
  establishment: string;
  days: number;
};

const ESTABLISHMENTS: PreviewEstablishment[] = [
  {
    id: "aurora",
    name: "Unidade Centro",
    client: "Escola Aurora",
    type: "escola",
    uf: "SP",
    areas: ["Cozinha", "Refeitório"],
  },
  {
    id: "hospital",
    name: "Ala Sul",
    client: "Hospital TESTE",
    type: "hospital",
    uf: "RJ",
    areas: ["Copa 3º andar", "Nutrição clínica"],
  },
  {
    id: "lar",
    name: "Sede",
    client: "Lar São José",
    type: "ilpi",
    uf: "SP",
    areas: ["Cozinha"],
  },
];

const TEMPLATES: PreviewTemplate[] = [
  {
    id: "pop-aurora",
    name: "POP Cozinha — Aurora",
    origin: "custom",
    portaria: "Cópia da RDC 216",
    appliesTo: ["escola"],
    required: 42,
    total: 48,
    establishmentId: "aurora",
    sections: ["Higiene", "Recebimento", "Preparo", "Documentação"],
  },
  {
    id: "equipe-visita",
    name: "Roteiro interno de visita",
    origin: "workspace",
    portaria: null,
    appliesTo: ["escola", "hospital", "clinica", "ilpi", "empresa", "hotel"],
    required: 18,
    total: 22,
    sections: ["Chegada", "Observação", "Encerramento"],
  },
  {
    id: "rdc216",
    name: "Checklist Auditoria",
    origin: "system",
    portaria: "RDC 216/2004 / CVS-5/2013",
    appliesTo: ["escola", "hospital", "clinica", "ilpi", "empresa"],
    required: 80,
    total: 84,
    sections: ["Edificações", "Equipamentos", "Manipuladores", "Produção"],
  },
  {
    id: "escola-ilpi",
    name: "Checklist padrão — Escola e ILPI",
    origin: "system",
    portaria: "Material interno",
    appliesTo: ["escola", "ilpi"],
    required: 58,
    total: 59,
    sections: ["Estrutura", "Boas práticas", "Cardápio"],
  },
  {
    id: "rdc275",
    name: "Checklist RDC nº 275",
    origin: "system",
    portaria: "RDC 275/2002",
    appliesTo: ["empresa"],
    required: 164,
    total: 164,
    sections: ["BPF", "Documentação", "Controlo de processo"],
  },
  {
    id: "frigobar",
    name: "Auditoria de frigobar",
    origin: "system",
    portaria: null,
    appliesTo: ["hotel"],
    required: 44,
    total: 44,
    sections: ["Instalações", "Higienização", "Armazenamento"],
  },
];

const OPEN_SESSIONS: PreviewSession[] = [
  {
    id: "s1",
    templateId: "pop-aurora",
    establishmentId: "aurora",
    progress: 62,
    professional: "Você",
    updated: "há 18 min",
  },
  {
    id: "s2",
    templateId: "rdc216",
    establishmentId: "hospital",
    progress: 18,
    professional: "Ana Lima",
    updated: "hoje, 09:40",
  },
];

const VENCIDOS: ValidityItem[] = [
  {
    id: "v1",
    template: "Checklist Auditoria",
    establishment: "Escola Aurora · Unidade Centro",
    days: -12,
  },
];

const A_VENCER: ValidityItem[] = [
  {
    id: "a1",
    template: "Checklist padrão — Escola e ILPI",
    establishment: "Lar São José · Sede",
    days: 18,
  },
  {
    id: "a2",
    template: "Checklist Auditoria",
    establishment: "Hospital TESTE",
    days: 45,
  },
  {
    id: "a3",
    template: "Roteiro interno de visita",
    establishment: "Escola Aurora · Unidade Centro",
    days: 71,
  },
];

const TYPE_LABEL: Record<EstType, string> = {
  escola: "Escola",
  hospital: "Hospital",
  clinica: "Clínica",
  ilpi: "Lar de idosos",
  empresa: "Empresa",
  hotel: "Hotel",
};

const ORIGIN_LABEL: Record<Origin, string> = {
  system: "Sistema",
  workspace: "Equipe",
  custom: "Personalizado",
};

const ORIGIN_CHIP: Record<Origin, string> = {
  system: "bg-blue-100 text-blue-800",
  workspace: "bg-primary/15 text-primary",
  custom: "bg-amber-100 text-amber-900",
};

const TAB_BTN =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors sm:flex-none";

function templateFor(id: string): PreviewTemplate | undefined {
  return TEMPLATES.find((row) => row.id === id);
}

function establishmentFor(id: string): PreviewEstablishment | undefined {
  return ESTABLISHMENTS.find((row) => row.id === id);
}

function appliesToPlace(template: PreviewTemplate, place: PreviewEstablishment): boolean {
  if (template.establishmentId && template.establishmentId !== place.id) return false;
  return template.appliesTo.includes(place.type);
}

export function ChecklistHubUxPreview() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [tab, setTab] = useState<Tab>("preencher");
  const [placeId, setPlaceId] = useState<string>("aurora");
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fillTargetId, setFillTargetId] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const place = placeId ? establishmentFor(placeId) : undefined;
  const fillTarget = fillTargetId ? templateFor(fillTargetId) : undefined;

  const openHere = useMemo(
    () => OPEN_SESSIONS.filter((row) => row.establishmentId === placeId),
    [placeId],
  );

  const templates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TEMPLATES.filter((template) => {
      if (tab === "preencher" && place && !appliesToPlace(template, place)) return false;
      if (origin !== "all" && template.origin !== origin) return false;
      if (q && !`${template.name} ${template.portaria ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [origin, place, search, tab]);

  function selectPlace(id: string) {
    setPlaceId(id);
    setNotice(null);
    setSelectedAreas(establishmentFor(id)?.areas.slice(0, 1) ?? []);
  }

  function openFill(templateId: string) {
    const nextPlace = place ?? ESTABLISHMENTS[0];
    if (!place) selectPlace(nextPlace.id);
    const areas = (place ?? nextPlace).areas;
    setFillTargetId(templateId);
    setSelectedAreas(areas.slice(0, 1));
  }

  function toggleArea(area: string) {
    setSelectedAreas((current) =>
      current.includes(area)
        ? current.filter((row) => row !== area)
        : [...current, area],
    );
  }

  function confirmFill() {
    if (!fillTarget || !place) return;
    const areasLabel =
      selectedAreas.length === 0
        ? place.name
        : selectedAreas.length === 1
          ? selectedAreas[0]
          : `${selectedAreas.length} áreas`;
    setNotice(
      `Simulação: iniciaria “${fillTarget.name}” em ${place.client} · ${areasLabel}. Nada foi gravado.`,
    );
    setFillTargetId(null);
  }

  function continueSession(session: PreviewSession) {
    const template = templateFor(session.templateId);
    const est = establishmentFor(session.establishmentId);
    setNotice(
      `Simulação: continuaria “${template?.name ?? "checklist"}” em ${est?.client ?? ""} (${session.progress}%).`,
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="border-warning/40 bg-warning/15 text-warning-foreground border-b px-4 py-2 text-center text-xs font-medium">
        Protótipo UX — dados fictícios · não grava nada
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <a href="/checklists" className="underline underline-offset-2">
          Ver página atual
        </a>
      </div>

      <div className="flex min-h-[calc(100vh-2.25rem)]">
        <aside className="bg-sidebar text-sidebar-foreground hidden w-56 shrink-0 flex-col lg:flex">
          <div className="px-5 py-6 text-lg font-semibold tracking-tight">
            NutriGestão
          </div>
          <nav className="space-y-1 px-3 text-sm">
            <span className="block rounded-lg px-3 py-2 opacity-70">Dashboard</span>
            <span className="block rounded-lg px-3 py-2 opacity-70">Visitas</span>
            <span className="bg-sidebar-accent rounded-lg px-3 py-2 font-medium">
              Checklists
            </span>
            <span className="block rounded-lg px-3 py-2 opacity-70">Clientes</span>
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1200px] p-4 md:p-6">
            <PageLayout>

      {screen === "hub" ? (
        <HubScreen
          tab={tab}
          place={place}
          templates={templates}
          openHere={openHere}
          search={search}
          origin={origin}
          expandedId={expandedId}
          notice={notice}
          onTab={setTab}
          onSearch={setSearch}
          onOrigin={setOrigin}
          onPlace={selectPlace}
          onExpand={setExpandedId}
          onFill={openFill}
          onContinue={continueSession}
          onOpenScreen={setScreen}
          onDismissNotice={() => setNotice(null)}
        />
      ) : (
        <ListScreen
          screen={screen}
          onBack={() => setScreen("hub")}
          onContinue={continueSession}
        />
      )}

      {fillTarget && place ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-fill-title"
        >
          <div className="bg-background w-full max-w-md rounded-2xl border border-border p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="preview-fill-title" className="text-base font-semibold text-foreground">
                  Preencher agora
                </h2>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Confirme o local e as áreas. Cada área vira uma sessão.
                </p>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground min-h-11 min-w-11"
                onClick={() => setFillTargetId(null)}
                aria-label="Fechar"
              >
                <X className="mx-auto size-4" />
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-card p-3">
              <p className="text-sm font-semibold text-foreground">{fillTarget.name}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {place.client} · {place.name} · {TYPE_LABEL[place.type]} · {place.uf}
              </p>
            </div>
            {place.areas.length > 0 ? (
              <fieldset className="mt-4">
                <legend className="text-sm font-medium text-foreground">Áreas</legend>
                <div className="mt-2 grid gap-2">
                  {place.areas.map((area) => {
                    const picked = selectedAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleArea(area)}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-xl border px-3 text-left text-sm",
                          picked
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                            picked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border",
                          )}
                        >
                          {picked ? <Check className="size-3" aria-hidden /> : null}
                        </span>
                        {area}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
            <button
              type="button"
              className={cn(buttonVariants(), "mt-4 min-h-11 w-full gap-1.5")}
              disabled={place.areas.length > 0 && selectedAreas.length === 0}
              onClick={confirmFill}
            >
              {selectedAreas.length > 1
                ? `Iniciar ${selectedAreas.length} sessões`
                : "Iniciar preenchimento"}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
          </PageLayout>
          </div>
        </div>
      </div>
    </div>
  );
}

function HubScreen({
  tab,
  place,
  templates,
  openHere,
  search,
  origin,
  expandedId,
  notice,
  onTab,
  onSearch,
  onOrigin,
  onPlace,
  onExpand,
  onFill,
  onContinue,
  onOpenScreen,
  onDismissNotice,
}: {
  tab: Tab;
  place: PreviewEstablishment | undefined;
  templates: PreviewTemplate[];
  openHere: PreviewSession[];
  search: string;
  origin: OriginFilter;
  expandedId: string | null;
  notice: string | null;
  onTab: (tab: Tab) => void;
  onSearch: (value: string) => void;
  onOrigin: (value: OriginFilter) => void;
  onPlace: (id: string) => void;
  onExpand: (id: string | null) => void;
  onFill: (id: string) => void;
  onContinue: (session: PreviewSession) => void;
  onOpenScreen: (screen: Screen) => void;
  onDismissNotice: () => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-bold tracking-tight text-foreground">
            Checklists
          </h1>
          <button
            type="button"
            onClick={() => onTab("modelos")}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-11 w-full gap-1 sm:w-auto",
            )}
          >
            <Plus className="size-4" aria-hidden />
            Criar modelo
          </button>
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Continue o que está aberto ou preencha no estabelecimento em que você está.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <PulseCard
          label="Em andamento"
          value={OPEN_SESSIONS.length}
          hint="continuar"
          tone="live"
          onClick={() => onOpenScreen("andamento")}
        />
        <PulseCard
          label="Vencidos"
          value={VENCIDOS.length}
          hint="último ano"
          tone="danger"
          onClick={() => onOpenScreen("vencidos")}
        />
        <PulseCard
          label="A vencer"
          value={A_VENCER.length}
          hint="90 dias"
          tone="warning"
          onClick={() => onOpenScreen("vencer")}
        />
      </div>

      {notice ? (
        <div
          className="border-primary/30 bg-primary/8 flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5"
          role="status"
        >
          <p className="text-sm text-foreground">{notice}</p>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={onDismissNotice}
            aria-label="Dispensar aviso"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Onde você está?</p>
          <MapPin className="text-primary size-4 shrink-0" aria-hidden />
        </div>

        <label className="sr-only" htmlFor="preview-place">
          Estabelecimento
        </label>
        <select
          id="preview-place"
          value={place?.id ?? ""}
          onChange={(event) => onPlace(event.target.value)}
          className="border-input bg-background mt-2 flex min-h-11 w-full rounded-lg border px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {ESTABLISHMENTS.map((row) => (
            <option key={row.id} value={row.id}>
              {row.client === row.name ? row.client : `${row.client} · ${row.name}`}
            </option>
          ))}
        </select>

        {place ? (
          <p className="text-muted-foreground mt-1.5 text-xs">
            {TYPE_LABEL[place.type]} · {place.uf} · {place.areas.length}{" "}
            {place.areas.length === 1 ? "área" : "áreas"}
          </p>
        ) : null}

        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {ESTABLISHMENTS.map((row) => {
            const active = row.id === place?.id;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onPlace(row.id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border px-3 text-xs font-medium whitespace-nowrap",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {row.client}
              </button>
            );
          })}
        </div>
      </section>

      <div
        className="flex gap-2"
        role="tablist"
        aria-label="Modo da página de checklists"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preencher"}
          className={cn(
            TAB_BTN,
            tab === "preencher"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onTab("preencher")}
        >
          Preencher
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "modelos"}
          className={cn(
            TAB_BTN,
            tab === "modelos"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onTab("modelos")}
        >
          Modelos
        </button>
      </div>

      {tab === "preencher" && openHere.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Continuar neste local
          </p>
          {openHere.map((session) => {
            const template = templateFor(session.templateId);
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => onContinue(session)}
                className="border-primary/30 bg-primary/5 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {template?.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {session.progress}% · {session.professional} · {session.updated}
                  </span>
                </span>
                <span className="text-primary text-sm font-medium">Continuar</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={
              tab === "preencher"
                ? "Buscar checklist deste local…"
                : "Buscar modelo…"
            }
            className="border-input bg-background min-h-11 w-full rounded-lg border pr-3 pl-9 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Buscar checklist"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Origem do modelo">
        {(
          [
            ["all", "Todos"],
            ["system", "Sistema"],
            ["workspace", "Equipe"],
            ["custom", "Personalizados"],
          ] as const
        ).map(([id, label]) => {
          const active = origin === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onOrigin(id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "preencher" && place ? (
        <p className="text-muted-foreground text-xs">
          {templates.length} {templates.length === 1 ? "checklist" : "checklists"} para{" "}
          {place.client}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          {templates.length} {templates.length === 1 ? "modelo" : "modelos"} no catálogo
        </p>
      )}

      {templates.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nenhum checklist neste recorte"
          description="Mude o local, a origem ou limpe a busca."
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              mode={tab}
              expanded={expandedId === template.id}
              openSession={OPEN_SESSIONS.find(
                (row) =>
                  row.templateId === template.id && row.establishmentId === place?.id,
              )}
              onExpand={() =>
                onExpand(expandedId === template.id ? null : template.id)
              }
              onFill={() => onFill(template.id)}
              onContinue={onContinue}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function TemplateCard({
  template,
  mode,
  expanded,
  openSession,
  onExpand,
  onFill,
  onContinue,
}: {
  template: PreviewTemplate;
  mode: Tab;
  expanded: boolean;
  openSession?: PreviewSession;
  onExpand: () => void;
  onFill: () => void;
  onContinue: (session: PreviewSession) => void;
}) {
  return (
    <li className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">
            {template.name}
          </p>
          {template.portaria ? (
            <p className="text-muted-foreground mt-1 text-xs">{template.portaria}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            ORIGIN_CHIP[template.origin],
          )}
        >
          {ORIGIN_LABEL[template.origin]}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {template.appliesTo.map((type) => (
          <span
            key={type}
            className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[11px] font-medium"
          >
            {TYPE_LABEL[type]}
          </span>
        ))}
      </div>

      <p className="text-muted-foreground mt-2 text-xs">
        <span className="text-foreground font-semibold tabular-nums">
          {template.required}
        </span>{" "}
        obrigatórios ·{" "}
        <span className="text-foreground font-semibold tabular-nums">
          {template.total}
        </span>{" "}
        itens
      </p>

      {expanded ? (
        <ul className="mt-3 space-y-1 rounded-lg border border-border/60 px-3 py-2">
          {template.sections.map((section) => (
            <li key={section} className="text-xs text-foreground">
              {section}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {mode === "preencher" ? (
          openSession ? (
            <button
              type="button"
              className={cn(buttonVariants({ size: "sm" }), "min-h-11 flex-1")}
              onClick={() => onContinue(openSession)}
            >
              Continuar · {openSession.progress}%
            </button>
          ) : (
            <button
              type="button"
              className={cn(buttonVariants({ size: "sm" }), "min-h-11 flex-1 gap-1.5")}
              onClick={onFill}
            >
              Preencher
              <ArrowRight className="size-4" aria-hidden />
            </button>
          )
        ) : (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11 flex-1")}
          >
            {template.origin === "system" ? "Personalizar" : "Editar modelo"}
          </button>
        )}
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
          onClick={onExpand}
        >
          {expanded ? "Ocultar itens" : "Ver itens"}
        </button>
      </div>
    </li>
  );
}

function PulseCard({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "live" | "danger" | "warning";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-xl border border-border bg-card p-3 text-left shadow-xs",
        "hover:border-primary/35 hover:bg-background/80",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        tone === "danger" && "border-l-4 border-l-destructive",
        tone === "warning" && "border-l-4 border-l-warning",
        tone === "live" && "border-l-4 border-l-primary",
      )}
    >
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase sm:text-xs">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tracking-tight tabular-nums",
          tone === "danger" && value > 0 && "text-destructive",
          tone === "warning" && value > 0 && "text-amber-700 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      <p className="text-muted-foreground mt-1 hidden text-xs sm:block">{hint}</p>
    </button>
  );
}

function ListScreen({
  screen,
  onBack,
  onContinue,
}: {
  screen: Exclude<Screen, "hub">;
  onBack: () => void;
  onContinue: (session: PreviewSession) => void;
}) {
  const title =
    screen === "andamento"
      ? "Checklists em andamento"
      : screen === "vencidos"
        ? "Checklists vencidos"
        : "Checklists a vencer";
  const description =
    screen === "andamento"
      ? "Sessões abertas, ainda sem dossiê aprovado."
      : screen === "vencidos"
        ? "Itens com validade expirada no último ano."
        : "Itens com validade nos próximos 90 dias.";

  return (
    <>
      <div className="space-y-1">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
            onClick={onBack}
          >
            Voltar ao hub
          </button>
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm">{description}</p>
      </div>

      {screen === "andamento" ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {OPEN_SESSIONS.map((session) => {
            const template = templateFor(session.templateId);
            const est = establishmentFor(session.establishmentId);
            return (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => onContinue(session)}
                  className="border-border flex min-h-11 w-full items-start justify-between gap-3 rounded-xl border bg-card p-4 text-left shadow-xs"
                >
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {template?.name}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {est?.client} · {est?.name}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {session.professional} · {session.updated}
                    </span>
                  </span>
                  <span className="text-primary text-sm font-semibold tabular-nums">
                    {session.progress}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {(screen === "vencidos" ? VENCIDOS : A_VENCER).map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-xl border border-border bg-card p-4 shadow-xs",
                screen === "vencidos"
                  ? "border-l-4 border-l-destructive"
                  : "border-l-4 border-l-warning",
              )}
            >
              <p className="text-sm font-semibold text-foreground">{item.template}</p>
              <p className="text-muted-foreground mt-1 text-xs">{item.establishment}</p>
              <p
                className={cn(
                  "mt-2 text-xs font-medium",
                  screen === "vencidos"
                    ? "text-destructive"
                    : "text-amber-700 dark:text-amber-400",
                )}
              >
                {item.days < 0
                  ? `Vencido há ${Math.abs(item.days)} dias`
                  : `Vence em ${item.days} dias`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
