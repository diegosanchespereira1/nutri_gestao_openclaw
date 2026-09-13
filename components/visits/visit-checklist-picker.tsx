"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { ChecklistTemplateChoiceCard } from "@/components/checklists/checklist-template-choice-card";
import { EstablishmentAreaMultiSelect } from "@/components/checklists/establishment-area-multi-select";
import { ExpandableTemplateSections } from "@/components/checklists/expandable-template-sections";
import { Button } from "@/components/ui/button";
import { loadCustomTemplatePreviewAction } from "@/lib/actions/checklist-custom";
import { loadWorkspaceTemplatePreviewAction } from "@/lib/actions/checklist-workspace";
import { loadChecklistTemplatePreviewAction } from "@/lib/actions/checklists";
import { startVisitChecklistFillAction } from "@/lib/actions/visit-checklist";
import { saveChecklistFillBatch } from "@/lib/checklist-fill-batch-storage";
import type { EstablishmentAreaOption } from "@/lib/types/establishment-areas";
import type { EstablishmentType } from "@/lib/types/establishments";
import { cn } from "@/lib/utils";
import {
  EMPTY_VISIT_CHECKLIST_FILTERS,
  filterVisitChecklistOptions,
  groupVisitChecklistOptions,
  visitChecklistChoiceValue,
  visitChecklistUfOptions,
  type VisitChecklistFilters,
  type VisitChecklistOption,
  type VisitTemplateSourceFilter,
} from "@/lib/visits/visit-checklist-options";

type Props = {
  visitId: string;
  establishmentId: string;
  ctxEstablishmentId: string | null;
  options: VisitChecklistOption[];
  areas: EstablishmentAreaOption[];
};

const SOURCE_BADGE: Record<
  VisitChecklistOption["source"],
  { label: string; className: string }
> = {
  workspace: {
    label: "Equipe",
    className: "bg-primary/15 text-primary",
  },
  custom: {
    label: "Personalizado",
    className: "bg-amber-100 text-amber-900",
  },
  system: {
    label: "Sistema",
    className: "bg-muted text-foreground",
  },
};

export function VisitChecklistPicker({
  visitId,
  establishmentId,
  ctxEstablishmentId,
  options,
  areas,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(
    areas.length === 1 && areas[0] ? [areas[0].id] : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<VisitChecklistFilters>(
    EMPTY_VISIT_CHECKLIST_FILTERS,
  );
  const [searchDraft, setSearchDraft] = useState("");

  const ufOptions = useMemo(() => visitChecklistUfOptions(options), [options]);
  const filteredOptions = useMemo(
    () => filterVisitChecklistOptions(options, filters),
    [options, filters],
  );
  const groups = useMemo(
    () => groupVisitChecklistOptions(filteredOptions),
    [filteredOptions],
  );
  const selectedOption = options.find(
    (opt) => visitChecklistChoiceValue(opt) === selectedChoice,
  );
  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.types.length > 0 ||
    filters.ufs.length > 0 ||
    filters.source !== "all";
  const showWorkspace = filters.source === "all" || filters.source === "workspace";
  const showCustom = filters.source === "all" || filters.source === "custom";
  const showSystem = filters.source === "all" || filters.source === "system";

  function applySearch(next = searchDraft) {
    const trimmed = next.trim();
    setSearchDraft(trimmed);
    setFilters((prev) => ({ ...prev, search: trimmed }));
  }

  function setSourceFilter(source: VisitTemplateSourceFilter) {
    setFilters((prev) => ({ ...prev, source }));
    setSelectedChoice(null);
  }

  function toggleType(type: EstablishmentType) {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((row) => row !== type)
        : [...prev.types, type],
    }));
  }

  function toggleUf(uf: string) {
    setFilters((prev) => ({
      ...prev,
      ufs: prev.ufs.includes(uf)
        ? prev.ufs.filter((row) => row !== uf)
        : [...prev.ufs, uf],
    }));
  }

  function clearFilters() {
    setSearchDraft("");
    setFilters(EMPTY_VISIT_CHECKLIST_FILTERS);
  }

  const areaRequired = areas.length > 0 && selectedAreaIds.length === 0;
  const canStart = Boolean(selectedChoice) && !areaRequired && !pending;

  useEffect(() => {
    if (!selectedChoice) return;
    const stillVisible = filteredOptions.some(
      (opt) => visitChecklistChoiceValue(opt) === selectedChoice,
    );
    if (!stillVisible) setSelectedChoice(null);
  }, [filteredOptions, selectedChoice]);

  function startFill() {
    if (!selectedChoice || areaRequired) return;
    setError(null);
    startTransition(async () => {
      const result = await startVisitChecklistFillAction({
        visitId,
        choice: selectedChoice,
        ctxEstablishmentId,
        areaIds: selectedAreaIds,
      });
      if (!result.ok) {
        setError(
          result.error === "area_required"
            ? "Selecione ao menos uma área."
            : result.error === "area_invalid"
              ? "Área inválida para este estabelecimento."
              : result.error === "missing"
                ? "Escolha um checklist para continuar."
                : "Não foi possível iniciar o preenchimento. Tente novamente.",
        );
        return;
      }
      if (result.sessionIds.length >= 2) {
        saveChecklistFillBatch({
          templateId: selectedOption?.id ?? result.firstSessionId,
          establishmentId,
          items: result.items,
        });
      }
      router.push(`/visitas/${visitId}/iniciar?session=${result.firstSessionId}`);
    });
  }

  return (
    <div className="space-y-6">
      <ChecklistTemplateChoiceCard
        visibleCount={filteredOptions.length}
        selectedLabel={selectedOption?.name}
        sourceFilter={filters.source}
        onSourceFilterChange={setSourceFilter}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onApplySearch={applySearch}
        typeFilter={filters.types}
        onToggleType={toggleType}
        ufFilter={filters.ufs}
        ufOptions={ufOptions}
        onToggleUf={toggleUf}
        onClearFilters={clearFilters}
      />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {filteredOptions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Nenhum template encontrado com esses filtros"
              : "Nenhum checklist disponível para esta visita."}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {showWorkspace ? (
            <VisitChecklistGroup
              title="Modelos da equipe"
              empty={
                hasActiveFilters
                  ? "Nenhum modelo da equipe com esses filtros."
                  : "Nenhum modelo da equipe publicado."
              }
              options={groups.workspace}
              selectedChoice={selectedChoice}
              onSelect={setSelectedChoice}
            />
          ) : null}
          {showCustom ? (
            <VisitChecklistGroup
              title="Modelos personalizados"
              empty={
                hasActiveFilters
                  ? "Nenhum modelo personalizado com esses filtros."
                  : "Nenhum modelo personalizado no workspace."
              }
              options={groups.custom}
              selectedChoice={selectedChoice}
              onSelect={setSelectedChoice}
            />
          ) : null}
          {showSystem ? (
            <VisitChecklistGroup
              title="Modelos do sistema"
              empty={
                hasActiveFilters
                  ? "Nenhum modelo do sistema com esses filtros."
                  : "Nenhum modelo do sistema ativo."
              }
              options={groups.system}
              selectedChoice={selectedChoice}
              onSelect={setSelectedChoice}
            />
          ) : null}
        </>
      )}

      {selectedOption ? (
        <div className="sticky bottom-[calc(5.75rem+var(--safe-area-bottom))] z-20 lg:bottom-0">
          <div className="rounded-xl border bg-background p-3 shadow-2xl ring-1 ring-black/10 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {selectedOption.source === "workspace"
                      ? "Modelo da equipe selecionado"
                      : selectedOption.source === "custom"
                        ? "Modelo personalizado selecionado"
                        : "Template selecionado"}
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedOption.name}
                  </p>
                </div>
              </div>

              <EstablishmentAreaMultiSelect
                areas={areas}
                selectedAreaIds={selectedAreaIds}
                onChange={setSelectedAreaIds}
                panelPlacement="above"
              />

              <Button
                type="button"
                size="sm"
                disabled={!canStart}
                title={
                  !selectedChoice
                    ? "Selecione um checklist"
                    : areaRequired
                      ? "Selecione ao menos uma área"
                      : selectedAreaIds.length > 1
                        ? `Iniciar ${selectedAreaIds.length} sessões (uma por área)`
                        : "Começar preenchimento"
                }
                className="min-h-11 gap-1.5"
                onClick={startFill}
              >
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Iniciando…
                  </>
                ) : (
                  <>
                    {selectedAreaIds.length > 1
                      ? `Iniciar ${selectedAreaIds.length} sessões`
                      : "Começar preenchimento"}
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VisitChecklistGroup({
  title,
  empty,
  options,
  selectedChoice,
  onSelect,
}: {
  title: string;
  empty: string;
  options: VisitChecklistOption[];
  selectedChoice: string | null;
  onSelect: (choice: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <span className="text-[11px] text-muted-foreground">
          {options.length} modelo{options.length !== 1 ? "s" : ""}
        </span>
      </div>
      {options.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">{empty}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={title}>
          {options.map((opt) => {
            const value = visitChecklistChoiceValue(opt);
            const isSelected = selectedChoice === value;
            const badge = SOURCE_BADGE[opt.source];
            return (
              <li key={value}>
                <div
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => onSelect(value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(value);
                    }
                  }}
                  className={cn(
                    "cursor-pointer select-none rounded-xl border bg-card transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                      : "border-border shadow-xs hover:border-primary/30 hover:shadow-md",
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground line-clamp-2">
                        {opt.name}
                      </p>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{opt.scopeLabel}</p>
                    {opt.itemCount != null ? (
                      <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-md bg-muted/50 px-2 py-1">
                        {opt.requiredItemCount != null ? (
                          <>
                            <span className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {opt.requiredItemCount}
                              </span>{" "}
                              obrigatório{opt.requiredItemCount !== 1 ? "s" : ""}
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                          </>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {opt.itemCount}
                          </span>{" "}
                          {opt.itemCount === 1 ? "item" : "itens"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <ExpandableTemplateSections
                    loadSections={() =>
                      opt.source === "workspace"
                        ? loadWorkspaceTemplatePreviewAction(opt.id)
                        : opt.source === "custom"
                          ? loadCustomTemplatePreviewAction(opt.id)
                          : loadChecklistTemplatePreviewAction(opt.id)
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
