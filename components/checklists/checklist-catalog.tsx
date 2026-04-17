"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Loader2,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { filterTemplatesForEstablishment } from "@/lib/checklists/filter-templates";
import {
  ESTABLISHMENT_TYPES,
  establishmentTypeLabel,
} from "@/lib/constants/establishment-types";
import { cn } from "@/lib/utils";
import {
  checkExistingOpenFillSession,
  type ExistingOpenSession,
} from "@/lib/actions/checklist-fill";
import {
  registerChecklistEstablishmentOpenAction,
  searchOwnerEstablishmentsAction,
} from "@/lib/actions/establishments";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type {
  EstablishmentPickerOption,
  EstablishmentType,
} from "@/lib/types/establishments";

import { TemplateItemRow } from "./template-item-row";

/* ─── tipos ──────────────────────────────────────────────────────────────── */

type Props = {
  recentEstablishments: EstablishmentPickerOption[];
  templates: ChecklistTemplateWithSections[];
  startFillAction: (formData: FormData) => Promise<void>;
  duplicateTemplateAction: (formData: FormData) => Promise<void>;
  /** Abre e faz scroll ao cartão deste template (ex.: link do dashboard). */
  focusTemplateId?: string | null;
};

/* ─── helpers ────────────────────────────────────────────────────────────── */

/**
 * Formata tempo relativo em pt-BR sem Intl.RelativeTimeFormat
 * (compatibilidade com iOS < 14).
 */
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "agora mesmo";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `há ${diffMins} minuto${diffMins !== 1 ? "s" : ""}`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `há ${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays} dia${diffDays !== 1 ? "s" : ""}`;
}

/* ─── sub-componentes ────────────────────────────────────────────────────── */

function StepIndicator({
  step,
  done,
  active,
  label,
}: {
  step: number;
  done: boolean;
  active: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-200",
          done
            ? "bg-primary text-primary-foreground"
            : active
              ? "border-2 border-primary bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
        )}
      >
        {done ? <CheckCircle2 className="size-3.5" /> : step}
      </div>
      <span
        className={cn(
          "hidden text-xs font-medium sm:block",
          done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── componente principal ───────────────────────────────────────────────── */

export function ChecklistCatalog({
  recentEstablishments,
  templates,
  startFillAction,
  duplicateTemplateAction,
  focusTemplateId = null,
}: Props) {
  const router = useRouter();

  /* ── estado ── */
  const [establishmentId, setEstablishmentId] = useState<string>("");
  const [selectedEstablishment, setSelectedEstablishment] =
    useState<EstablishmentPickerOption | null>(null);
  const [recentOptions, setRecentOptions] =
    useState<EstablishmentPickerOption[]>(recentEstablishments);
  const [establishmentSearchTerm, setEstablishmentSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<EstablishmentPickerOption[]>([]);
  const [isSearchingEstablishments, setIsSearchingEstablishments] = useState(false);
  const [establishmentSearchError, setEstablishmentSearchError] = useState("");
  const [isEstablishmentInputFocused, setIsEstablishmentInputFocused] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    focusTemplateId ?? null,
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EstablishmentType | null>(null);
  const [ufFilter, setUfFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    focusTemplateId ? { [focusTemplateId]: true } : {},
  );

  /* Task C.3: estado de verificação de sessão em aberto */
  const [checkingSession, setCheckingSession] = useState(false);
  const [conflictSession, setConflictSession] = useState<ExistingOpenSession | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  /* Ref para o form de startFill — usado para submit programático */
  const startFillFormRef = useRef<HTMLFormElement>(null);
  const duplicateFormRef = useRef<HTMLFormElement>(null);

  /* ── filtros de template ── */
  const filterEstablishmentId = focusTemplateId ? "" : establishmentId;

  const establishmentFiltered = useMemo(() => {
    const selected = filterEstablishmentId ? selectedEstablishment : null;
    const filter = selected
      ? { state: selected.state, establishment_type: selected.establishment_type }
      : null;
    return filterTemplatesForEstablishment(templates, filter);
  }, [filterEstablishmentId, selectedEstablishment, templates]);

  const filteredTemplates = useMemo(() => {
    let result = establishmentFiltered;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.portaria_ref.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false),
      );
    }

    if (typeFilter) {
      result = result.filter((t) => t.applies_to.includes(typeFilter));
    }

    if (ufFilter) {
      result = result.filter((t) => t.uf === "*" || t.uf === ufFilter);
    }

    return result;
  }, [establishmentFiltered, search, typeFilter, ufFilter]);

  const ufOptions = useMemo(() => {
    const ufs = new Set<string>();
    for (const t of templates) {
      if (t.uf !== "*") ufs.add(t.uf);
    }
    return Array.from(ufs).sort();
  }, [templates]);

  const selectedTemplate = useMemo(
    () =>
      selectedTemplateId
        ? (templates.find((t) => t.id === selectedTemplateId) ?? null)
        : null,
    [selectedTemplateId, templates],
  );

  const step1Done = Boolean(establishmentId);
  const step2Done = Boolean(selectedTemplateId);
  const hasActiveFilters = Boolean(search || typeFilter || ufFilter);

  /* ── efeito de scroll ── */
  useLayoutEffect(() => {
    if (!focusTemplateId) return;
    window.setTimeout(() => {
      document
        .getElementById(`checklist-template-${focusTemplateId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [focusTemplateId]);

  useEffect(() => {
    const query = establishmentSearchTerm.trim();
    const showingSelectedLabel =
      selectedEstablishment != null && establishmentSearchTerm === selectedEstablishment.label;
    if (showingSelectedLabel) {
      setSearchResults([]);
      setEstablishmentSearchError("");
      setIsSearchingEstablishments(false);
      return;
    }
    if (query.length < 3) {
      setSearchResults([]);
      setEstablishmentSearchError("");
      setIsSearchingEstablishments(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingEstablishments(true);
      setEstablishmentSearchError("");
      try {
        const { rows } = await searchOwnerEstablishmentsAction({
          query,
          limit: 12,
        });
        if (!cancelled) setSearchResults(rows);
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setEstablishmentSearchError("Não foi possível pesquisar estabelecimentos.");
        }
      } finally {
        if (!cancelled) setIsSearchingEstablishments(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [establishmentSearchTerm, selectedEstablishment]);

  /* ── handlers ── */
  function toggleExpanded(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectTemplate(id: string) {
    setSelectedTemplateId((prev) => (prev === id ? null : id));
  }

  function clearFilters() {
    setSearch("");
    setTypeFilter(null);
    setUfFilter(null);
  }

  function upsertRecent(option: EstablishmentPickerOption) {
    setRecentOptions((prev) => {
      const next = [option, ...prev.filter((row) => row.id !== option.id)];
      return next.slice(0, 3);
    });
  }

  function selectEstablishment(option: EstablishmentPickerOption) {
    setEstablishmentId(option.id);
    setSelectedEstablishment(option);
    setEstablishmentSearchTerm(option.label);
    setEstablishmentSearchError("");
    setSearchResults([]);
  }

  async function registerEstablishmentOpen() {
    if (!establishmentId) return;
    const result = await registerChecklistEstablishmentOpenAction(establishmentId);
    if (!result.ok) return;
    if (selectedEstablishment) upsertRecent(selectedEstablishment);
  }

  /** Task C.3: Submit programático do startFillAction com um templateId específico. */
  function submitStartFill(templateId: string) {
    if (!startFillFormRef.current) return;
    // Atualizar os hidden inputs antes de submeter
    const form = startFillFormRef.current;
    const templateInput = form.querySelector<HTMLInputElement>('input[name="template_id"]');
    if (templateInput) templateInput.value = templateId;
    form.requestSubmit();
  }

  /** Task C.3: Handler do botão "Usar template" — verifica conflito antes de criar. */
  async function handleUsarTemplate() {
    if (!selectedTemplate || !establishmentId) return;
    setCheckingSession(true);
    try {
      const existing = await checkExistingOpenFillSession({
        establishmentId,
        templateId: selectedTemplate.id,
        customTemplateId: null,
      });
      if (existing) {
        setPendingTemplateId(selectedTemplate.id);
        setConflictSession(existing);
      } else {
        await registerEstablishmentOpen();
        submitStartFill(selectedTemplate.id);
      }
    } finally {
      setCheckingSession(false);
    }
  }

  async function handlePersonalizarTemplate() {
    if (!establishmentId || !duplicateFormRef.current) return;
    await registerEstablishmentOpen();
    duplicateFormRef.current.requestSubmit();
  }

  /* ── render ── */
  return (
    <div className="space-y-6 pb-28">
      {/* ─── Indicador de etapas ─────────────────────────────────────────── */}
      <div className="flex items-start gap-1 sm:gap-2">
        <StepIndicator step={1} done={step1Done} active={!step1Done} label="Estabelecimento" />
        <div
          className={cn(
            "mt-3.5 h-px flex-1 transition-colors duration-300",
            step1Done ? "bg-primary/50" : "bg-border",
          )}
        />
        <StepIndicator
          step={2}
          done={step2Done}
          active={step1Done && !step2Done}
          label="Template"
        />
        <div
          className={cn(
            "mt-3.5 h-px flex-1 transition-colors duration-300",
            step2Done && step1Done ? "bg-primary/50" : "bg-border",
          )}
        />
        <StepIndicator
          step={3}
          done={false}
          active={step1Done && step2Done}
          label="Iniciar"
        />
      </div>

      {/* ─── Etapa 1: Estabelecimento ─────────────────────────────────────── */}
      <div
        className={cn(
          "rounded-xl border p-4 transition-all duration-200",
          step1Done
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-card shadow-sm",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-sm transition-all",
              step1Done
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {step1Done ? <CheckCircle2 className="size-4" /> : "1"}
          </div>
          <div className="flex-1 space-y-2.5">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Selecione o estabelecimento
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Necessário para filtrar templates aplicáveis e iniciar o preenchimento
              </p>
            </div>
            <div className="relative w-full max-w-md">
              <input
                id="checklist-establishment-search"
                type="search"
                autoComplete="off"
                className={cn(
                  "h-9 w-full rounded-lg border px-2.5 text-sm shadow-xs outline-none",
                  "border-input bg-background text-foreground placeholder:text-muted-foreground",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
                  !step1Done && "border-primary/40",
                )}
                placeholder="Digite nome do estabelecimento ou cliente…"
                value={establishmentSearchTerm}
                onFocus={() => setIsEstablishmentInputFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => setIsEstablishmentInputFocused(false), 120);
                }}
                onChange={(e) => {
                  const next = e.target.value;
                  setEstablishmentSearchTerm(next);
                  setEstablishmentSearchError("");
                  if (
                    selectedEstablishment &&
                    next.trim() !== selectedEstablishment.label
                  ) {
                    setEstablishmentId("");
                    setSelectedEstablishment(null);
                  }
                }}
                aria-label="Pesquisar estabelecimento para filtrar checklists"
              />
              {isEstablishmentInputFocused ? (
                <div className="border-border bg-background absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-lg border shadow-md">
                  <div className="max-h-80 overflow-y-auto py-2">
                    {recentOptions.length > 0 && (
                      <div className="space-y-1 px-2 pb-2">
                        <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Últimos abertos
                        </p>
                        {recentOptions.map((option) => {
                          const active = option.id === establishmentId;
                          return (
                            <button
                              key={`recent-${option.id}`}
                              type="button"
                              className={cn(
                                "hover:bg-muted/70 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                                active && "bg-primary/10",
                              )}
                              onMouseDown={() => selectEstablishment(option)}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                                  active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border",
                                )}
                              >
                                {active ? <Check className="size-3" /> : null}
                              </span>
                              <span className="min-w-0 truncate">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {establishmentSearchTerm.trim().length > 0 &&
                      establishmentSearchTerm.trim().length < 3 && (
                        <p className="px-4 py-2 text-xs text-muted-foreground">
                          Digite ao menos 3 caracteres para pesquisar.
                        </p>
                      )}
                    {establishmentSearchError ? (
                      <p className="px-4 py-2 text-xs text-destructive" role="alert">
                        {establishmentSearchError}
                      </p>
                    ) : null}

                    {establishmentSearchTerm.trim().length >= 3 && (
                      <div className="space-y-1 px-2">
                        <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Resultados
                        </p>
                        {isSearchingEstablishments ? (
                          <p className="px-2 py-2 text-xs text-muted-foreground">
                            Pesquisando…
                          </p>
                        ) : searchResults.length === 0 ? (
                          <p className="px-2 py-2 text-xs text-muted-foreground">
                            Nenhum estabelecimento encontrado.
                          </p>
                        ) : (
                          searchResults.map((option) => {
                            const active = option.id === establishmentId;
                            return (
                              <button
                                key={`search-${option.id}`}
                                type="button"
                                className={cn(
                                  "hover:bg-muted/70 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                                  active && "bg-primary/10",
                                )}
                                onMouseDown={() => selectEstablishment(option)}
                              >
                                <span
                                  className={cn(
                                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                                    active
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border",
                                  )}
                                >
                                  {active ? <Check className="size-3" /> : null}
                                </span>
                                <span className="min-w-0 truncate">{option.label}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            {step1Done && (
              <p className="text-xs text-primary font-medium flex items-center gap-1">
                <MapPin className="size-3 shrink-0" />
                Filtrando por UF e tipo do estabelecimento selecionado
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Etapa 2: Catálogo de templates ──────────────────────────────── */}
      <div className="space-y-4">
        {/* Cabeçalho da seção */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              step2Done
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {step2Done ? <CheckCircle2 className="size-3.5" /> : "2"}
          </div>
          <p className="text-sm font-semibold text-foreground">
            Escolha um template de checklist
          </p>
          <span className="ml-auto text-xs text-muted-foreground">
            {filteredTemplates.length} template
            {filteredTemplates.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Busca e filtros */}
        <div className="space-y-3">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, portaria, descrição…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "h-9 w-full rounded-lg border pl-9 pr-9 text-sm shadow-xs outline-none",
                "border-input bg-background text-foreground placeholder:text-muted-foreground",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
              )}
              aria-label="Buscar template de checklist"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Chips de filtro */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Tipo:</span>
            {ESTABLISHMENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter((prev) => (prev === type ? null : type))}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  typeFilter === type
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {establishmentTypeLabel[type]}
              </button>
            ))}

            {ufOptions.length > 0 && (
              <>
                <span className="text-xs font-medium text-muted-foreground">UF:</span>
                <select
                  value={ufFilter ?? ""}
                  onChange={(e) => setUfFilter(e.target.value || null)}
                  className={cn(
                    "h-7 rounded-full border px-2.5 text-xs shadow-xs outline-none",
                    "bg-background focus-visible:ring-ring focus-visible:ring-2",
                    ufFilter
                      ? "border-primary text-primary font-medium"
                      : "border-border text-muted-foreground",
                  )}
                  aria-label="Filtrar por UF"
                >
                  <option value="">Todas as UFs</option>
                  {ufOptions.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Lista de templates */}
        {filteredTemplates.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <ListChecks className="mx-auto mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              {hasActiveFilters
                ? "Nenhum template encontrado com esses filtros"
                : establishmentId
                  ? "Nenhum template aplicável para este estabelecimento"
                  : "Nenhum template ativo no catálogo"}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <ul
            className="grid gap-3 sm:grid-cols-2"
            aria-label="Templates de checklist disponíveis"
            role="radiogroup"
          >
            {filteredTemplates.map((t) => {
              const isSelected = selectedTemplateId === t.id;
              const isOpen = Boolean(expanded[t.id]);

              return (
                <li key={t.id} id={`checklist-template-${t.id}`}>
                  <div
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => selectTemplate(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectTemplate(t.id);
                      }
                    }}
                    className={cn(
                      "cursor-pointer select-none rounded-xl border bg-card transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                        : "border-border shadow-xs hover:border-primary/30 hover:shadow-md",
                    )}
                  >
                    {/* Corpo do card */}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Indicador de seleção */}
                        <div
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150",
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-border",
                          )}
                        >
                          {isSelected && (
                            <div className="size-2 rounded-full bg-primary-foreground" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Nome */}
                          <p className="text-sm font-semibold leading-snug text-foreground">
                            {t.name}
                          </p>

                          {/* Portaria e UF */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/70">Portaria:</span>{" "}
                              {t.portaria_ref}
                            </span>
                            {t.uf !== "*" && (
                              <span className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/70">UF:</span>{" "}
                                {t.uf}
                              </span>
                            )}
                          </div>

                          {/* Badges de tipo */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {t.applies_to.map((type) => (
                              <span
                                key={type}
                                className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                              >
                                {establishmentTypeLabel[type]}
                              </span>
                            ))}
                          </div>

                          {/* Estatísticas */}
                          <div className="mt-2.5 flex items-center gap-3 rounded-lg bg-muted/50 px-2.5 py-1.5">
                            <span className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {t.required_item_count}
                              </span>{" "}
                              obrigatório{t.required_item_count !== 1 ? "s" : ""}
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {t.total_item_count}
                              </span>{" "}
                              itens no total
                            </span>
                          </div>

                          {/* Descrição */}
                          {t.description && (
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                              {t.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botão expandir/recolher */}
                    <div className="border-t border-border/50">
                      <button
                        type="button"
                        onClick={(e) => toggleExpanded(t.id, e)}
                        className="flex w-full items-center justify-between rounded-b-xl px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                        aria-expanded={isOpen}
                      >
                        <span>
                          {isOpen ? "Ocultar seções e itens" : "Ver seções e itens"}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Conteúdo expandido */}
                    {isOpen && (
                      <div
                        className="space-y-3 border-t border-border/50 p-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t.sections.map((sec) => (
                          <div key={sec.id}>
                            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
                              {sec.title}
                            </h3>
                            <ul className="divide-y divide-border/30 rounded-lg border border-border/50 px-3">
                              {sec.items.map((it) => (
                                <TemplateItemRow
                                  key={it.id}
                                  description={it.description}
                                  isRequired={it.is_required}
                                />
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ─── Etapa 3: Barra de ação flutuante ────────────────────────────── */}
      {selectedTemplate && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2">
          <div className="rounded-xl border bg-background p-3 shadow-2xl ring-1 ring-black/10 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Info do template selecionado */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Template selecionado</p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedTemplate.name}
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex shrink-0 items-center gap-2">
                {!step1Done && (
                  <p className="text-xs text-amber-600">
                    ↑ Selecione um estabelecimento
                  </p>
                )}
                <form
                  ref={duplicateFormRef}
                  action={duplicateTemplateAction}
                  className="contents"
                >
                  <input type="hidden" name="template_id" value={selectedTemplate.id} />
                  <input type="hidden" name="establishment_id" value={establishmentId} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!establishmentId}
                    title={
                      establishmentId
                        ? "Duplicar e personalizar este template"
                        : "Selecione um estabelecimento primeiro"
                    }
                    onClick={handlePersonalizarTemplate}
                  >
                    Personalizar
                  </Button>
                </form>

                {/* Task C.3: form oculto para submit programático */}
                <form ref={startFillFormRef} action={startFillAction} className="hidden">
                  <input type="hidden" name="template_id" value={selectedTemplate.id} />
                  <input type="hidden" name="establishment_id" value={establishmentId} />
                </form>

                {/* Task C.3: botão assíncrono com verificação de conflito */}
                <Button
                  type="button"
                  size="sm"
                  disabled={!establishmentId || checkingSession}
                  title={
                    establishmentId
                      ? "Iniciar rascunho de preenchimento"
                      : "Selecione um estabelecimento primeiro"
                  }
                  className="gap-1.5"
                  onClick={handleUsarTemplate}
                >
                  {checkingSession ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Verificando…
                    </>
                  ) : (
                    <>
                      Usar template
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Task C.3: Dialog de conflito de sessão em aberto ────────────── */}
      <Dialog
        open={conflictSession !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConflictSession(null);
            setPendingTemplateId(null);
          }
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="size-5 shrink-0 text-amber-500" aria-hidden />
              <DialogTitle>Preenchimento em andamento</DialogTitle>
            </div>
            <DialogDescription>
              Já existe um preenchimento em aberto para este template neste
              estabelecimento, com{" "}
              <span className="font-semibold text-foreground">
                {conflictSession?.response_count ?? 0} resposta
                {(conflictSession?.response_count ?? 0) !== 1 ? "s" : ""} salva
                {(conflictSession?.response_count ?? 0) !== 1 ? "s" : ""}
              </span>
              .{conflictSession ? ` Última alteração: ${formatRelativeTime(conflictSession.updated_at)}.` : ""}
            </DialogDescription>
            {conflictSession && !conflictSession.started_by_me && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                ⚠ Este preenchimento foi iniciado por outro membro da equipe.
              </p>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              onClick={() => {
                if (!conflictSession) return;
                setConflictSession(null);
                setPendingTemplateId(null);
                void registerEstablishmentOpen();
                router.push(`/checklists/preencher/${conflictSession.id}`);
              }}
            >
              Ver e continuar preenchimento
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                const tId = pendingTemplateId;
                setConflictSession(null);
                setPendingTemplateId(null);
                if (tId) {
                  void (async () => {
                    await registerEstablishmentOpen();
                    submitStartFill(tId);
                  })();
                }
              }}
            >
              Cancelar e iniciar novo
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setConflictSession(null);
                setPendingTemplateId(null);
              }}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
