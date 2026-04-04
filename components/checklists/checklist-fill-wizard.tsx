"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  saveFillItemResponse,
  validateFillSectionAction,
} from "@/lib/actions/checklist-fill";
import {
  validateChecklistSection,
  type ChecklistFillOutcome,
  type FillResponsesMap,
} from "@/lib/types/checklist-fill";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

const textareaClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-2 flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  sessionId: string;
  template: ChecklistTemplateWithSections;
  initialResponses: FillResponsesMap;
  establishmentLabel: string;
  /** Itens mapeiam para `checklist_template_items` ou `checklist_custom_items`. */
  itemResponseSource: "global" | "custom";
};

export function ChecklistFillWizard({
  sessionId,
  template,
  initialResponses,
  establishmentLabel,
  itemResponseSource,
}: Props) {
  const sections = template.sections;
  const [sectionIndex, setSectionIndex] = useState(0);
  const [responses, setResponses] = useState<FillResponsesMap>(() => ({
    ...initialResponses,
  }));

  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [completedAll, setCompletedAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  const section = sections[sectionIndex];
  const isLast = sectionIndex >= sections.length - 1;

  const clientIssues = useMemo(
    () => (section ? validateChecklistSection(section, responses) : []),
    [section, responses],
  );

  const issueByItemId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const i of clientIssues) {
      m[i.item_id] = i.message;
    }
    return m;
  }, [clientIssues]);

  function setOutcome(itemId: string, outcome: ChecklistFillOutcome | null) {
    const cur = responses[itemId] ?? { outcome: null, note: null };
    const note = outcome === "nc" ? cur.note : null;
    setResponses((prev) => ({
      ...prev,
      [itemId]: { outcome, note },
    }));
    startTransition(async () => {
      await saveFillItemResponse({
        sessionId,
        itemId,
        itemResponseSource,
        outcome,
        note,
      });
    });
  }

  function setNote(itemId: string, note: string) {
    setResponses((prev) => {
      const cur = prev[itemId] ?? { outcome: null, note: null };
      return {
        ...prev,
        [itemId]: { ...cur, note },
      };
    });
  }

  function commitNoteBlur(itemId: string) {
    const cur = responses[itemId];
    if (!cur?.outcome) return;
    startTransition(async () => {
      await saveFillItemResponse({
        sessionId,
        itemId,
        itemResponseSource,
        outcome: cur.outcome,
        note: cur.note,
      });
    });
  }

  async function handleNext() {
    setAdvanceError(null);
    if (!section) return;
    const local = validateChecklistSection(section, responses);
    if (local.length > 0) {
      setAdvanceError(local[0].message);
      return;
    }
    const server = await validateFillSectionAction(sessionId, section.id);
    if (!server.ok) {
      setAdvanceError(server.error);
      return;
    }
    if (isLast) {
      setCompletedAll(true);
    } else {
      setSectionIndex((i) => i + 1);
    }
  }

  function handlePrev() {
    setAdvanceError(null);
    setSectionIndex((i) => Math.max(0, i - 1));
  }

  if (!section) {
    return (
      <p className="text-muted-foreground text-sm">Modelo sem secções.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{establishmentLabel}</p>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">
            {template.name}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Secção {sectionIndex + 1} de {sections.length}: {section.title}
          </p>
        </div>
        <Link
          href="/checklists"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Voltar ao catálogo
        </Link>
      </div>

      {advanceError ? (
        <p className="text-destructive text-sm" role="alert">
          {advanceError}
        </p>
      ) : null}

      <fieldset
        disabled={isPending || completedAll}
        className="space-y-6"
        aria-busy={isPending}
      >
        <legend className="sr-only">{section.title}</legend>
        {section.items.map((item) => {
          const r = responses[item.id] ?? { outcome: null, note: null };
          const err = issueByItemId[item.id];
          return (
            <div
              key={item.id}
              className="border-border rounded-xl border bg-card/40 p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-foreground text-sm font-medium">
                  {item.description}
                </p>
                {item.is_required ? (
                  <span className="bg-primary/15 text-primary shrink-0 rounded-md px-2 py-0.5 text-xs font-medium">
                    Obrigatório
                  </span>
                ) : null}
              </div>

              <div className="mt-3 space-y-2" role="radiogroup" aria-label={item.description}>
                <Label className="text-muted-foreground text-xs">
                  Avaliação
                </Label>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      ["conforme", "Conforme"],
                      ["nc", "Não conforme"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={`outcome-${item.id}`}
                        value={value}
                        checked={r.outcome === value}
                        onChange={() => setOutcome(item.id, value)}
                        className="border-input text-primary h-4 w-4"
                      />
                      {label}
                    </label>
                  ))}
                  {!item.is_required ? (
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`outcome-${item.id}`}
                        value="na"
                        checked={r.outcome === "na"}
                        onChange={() => setOutcome(item.id, "na")}
                        className="border-input text-primary h-4 w-4"
                      />
                      Não aplicável
                    </label>
                  ) : null}
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`outcome-${item.id}`}
                      value=""
                      checked={r.outcome === null}
                      onChange={() => setOutcome(item.id, null)}
                      className="border-input text-primary h-4 w-4"
                    />
                    Limpar
                  </label>
                </div>
              </div>

              {r.outcome === "nc" ? (
                <div className="mt-3">
                  <Label htmlFor={`note-${item.id}`}>
                    Descrição da não conformidade
                  </Label>
                  <textarea
                    id={`note-${item.id}`}
                    rows={3}
                    value={r.note ?? ""}
                    onChange={(e) => setNote(item.id, e.target.value)}
                    onBlur={() => commitNoteBlur(item.id)}
                    className={textareaClass}
                    aria-invalid={Boolean(err)}
                    aria-describedby={
                      err ? `err-${item.id}` : undefined
                    }
                  />
                </div>
              ) : null}

              {err ? (
                <p
                  id={`err-${item.id}`}
                  className="text-destructive mt-2 text-sm"
                  role="alert"
                >
                  {err}
                </p>
              ) : null}
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={sectionIndex === 0 || isPending}
        >
          Secção anterior
        </Button>
        <Button
          type="button"
          onClick={() => void handleNext()}
          disabled={isPending || completedAll}
        >
          {isLast ? "Validar última secção" : "Seguinte secção"}
        </Button>
        {completedAll ? (
          <div className="bg-muted/50 rounded-lg border p-4 text-sm">
            <p className="text-foreground font-medium">
              Todas as secções foram validadas.
            </p>
            <p className="text-muted-foreground mt-1">
              O rascunho permanece guardado. Pode voltar ao catálogo ou fechar esta
              página.
            </p>
            <Link
              href="/checklists"
              className={cn(buttonVariants({ size: "sm" }), "mt-3 inline-flex")}
            >
              Ir para Checklists
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
