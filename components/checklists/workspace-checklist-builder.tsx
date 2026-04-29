"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createWorkspaceTemplateAction,
  updateWorkspaceTemplateAction,
  type WorkspaceEditItem,
  type WorkspaceEditSection,
  type WorkspaceTemplateInput,
} from "@/lib/actions/checklist-workspace";
import { cn } from "@/lib/utils";

type Props = {
  mode: "create" | "edit";
  templateId?: string;
  initialName?: string;
  initialSections?: WorkspaceEditSection[];
};

type EditableItem = WorkspaceEditItem & { tempId: string };
type EditableSection = Omit<WorkspaceEditSection, "items"> & {
  tempId: string;
  items: EditableItem[];
};

function makeId(): string {
  return Math.random().toString(36).slice(2);
}

function defaultSection(): EditableSection {
  return {
    tempId: makeId(),
    title: "Geral",
    items: [{ tempId: makeId(), description: "", is_required: false }],
  };
}

export function WorkspaceChecklistBuilder({
  mode,
  templateId,
  initialName = "",
  initialSections,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState<string>(initialName);
  const [sections, setSections] = useState<EditableSection[]>(() => {
    if (initialSections && initialSections.length > 0) {
      return initialSections.map((sec) => ({
        tempId: makeId(),
        id: sec.id,
        title: sec.title,
        items: sec.items.map((it) => ({
          tempId: makeId(),
          id: it.id,
          description: it.description,
          is_required: it.is_required,
        })),
      }));
    }
    return [defaultSection()];
  });
  const [error, setError] = useState<string | null>(null);

  const totalItems = useMemo(
    () => sections.reduce((acc, sec) => acc + sec.items.length, 0),
    [sections],
  );

  function updateSection(tempId: string, patch: Partial<EditableSection>) {
    setSections((prev) =>
      prev.map((sec) => (sec.tempId === tempId ? { ...sec, ...patch } : sec)),
    );
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        tempId: makeId(),
        title: `Seção ${prev.length + 1}`,
        items: [{ tempId: makeId(), description: "", is_required: false }],
      },
    ]);
  }

  function removeSection(tempId: string) {
    setSections((prev) =>
      prev.length === 1 ? prev : prev.filter((sec) => sec.tempId !== tempId),
    );
  }

  function moveSection(tempId: string, dir: -1 | 1) {
    setSections((prev) => {
      const idx = prev.findIndex((sec) => sec.tempId === tempId);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  function addItem(sectionTempId: string) {
    setSections((prev) =>
      prev.map((sec) =>
        sec.tempId === sectionTempId
          ? {
              ...sec,
              items: [
                ...sec.items,
                { tempId: makeId(), description: "", is_required: false },
              ],
            }
          : sec,
      ),
    );
  }

  function updateItem(
    sectionTempId: string,
    itemTempId: string,
    patch: Partial<EditableItem>,
  ) {
    setSections((prev) =>
      prev.map((sec) =>
        sec.tempId === sectionTempId
          ? {
              ...sec,
              items: sec.items.map((it) =>
                it.tempId === itemTempId ? { ...it, ...patch } : it,
              ),
            }
          : sec,
      ),
    );
  }

  function removeItem(sectionTempId: string, itemTempId: string) {
    setSections((prev) =>
      prev.map((sec) =>
        sec.tempId === sectionTempId
          ? {
              ...sec,
              items:
                sec.items.length === 1
                  ? sec.items
                  : sec.items.filter((it) => it.tempId !== itemTempId),
            }
          : sec,
      ),
    );
  }

  function moveItem(sectionTempId: string, itemTempId: string, dir: -1 | 1) {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.tempId !== sectionTempId) return sec;
        const idx = sec.items.findIndex((it) => it.tempId === itemTempId);
        if (idx < 0) return sec;
        const target = idx + dir;
        if (target < 0 || target >= sec.items.length) return sec;
        const items = [...sec.items];
        const [moved] = items.splice(idx, 1);
        items.splice(target, 0, moved);
        return { ...sec, items };
      }),
    );
  }

  function handleSubmit() {
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError("Informe o nome do checklist.");
      return;
    }

    const sanitized: WorkspaceEditSection[] = [];
    for (const sec of sections) {
      const title = sec.title.trim();
      if (title.length === 0) {
        setError("Cada seção precisa de um título.");
        return;
      }
      const items: WorkspaceEditItem[] = sec.items
        .map((it) => ({
          id: it.id,
          description: it.description.trim(),
          is_required: it.is_required,
        }))
        .filter((it) => it.description.length > 0);
      if (items.length === 0) {
        setError(`A seção "${title}" precisa de pelo menos um item.`);
        return;
      }
      sanitized.push({ id: sec.id, title, items });
    }

    if (sanitized.length === 0) {
      setError("Adicione pelo menos uma seção com itens.");
      return;
    }

    const payload: WorkspaceTemplateInput = {
      name: trimmedName,
      sections: sanitized,
    };

    startTransition(async () => {
      const result =
        mode === "edit" && templateId
          ? await updateWorkspaceTemplateAction(templateId, payload)
          : await createWorkspaceTemplateAction(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/checklists/equipe?saved=${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="space-y-2">
          <Label htmlFor="workspace-template-name">Nome do checklist</Label>
          <Input
            id="workspace-template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Inspeção rápida diária"
            maxLength={200}
          />
          <p className="text-muted-foreground text-xs">
            Esse nome aparecerá no catálogo para todos os membros da sua equipe.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Cada item deste checklist será avaliado como{" "}
        <span className="font-semibold">Conforme</span>,{" "}
        <span className="font-semibold">Não conforme</span> ou{" "}
        <span className="font-semibold">Não aplicável</span> durante o
        preenchimento.
      </div>

      <div className="space-y-4">
        {sections.map((sec, secIdx) => (
          <section
            key={sec.tempId}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor={`workspace-sec-title-${sec.tempId}`}
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Seção {secIdx + 1}
                </Label>
                <Input
                  id={`workspace-sec-title-${sec.tempId}`}
                  value={sec.title}
                  onChange={(e) =>
                    updateSection(sec.tempId, { title: e.target.value })
                  }
                  placeholder="Título da seção"
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveSection(sec.tempId, -1)}
                  disabled={secIdx === 0}
                  aria-label="Mover seção para cima"
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveSection(sec.tempId, 1)}
                  disabled={secIdx === sections.length - 1}
                  aria-label="Mover seção para baixo"
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeSection(sec.tempId)}
                  disabled={sections.length === 1}
                  aria-label="Remover seção"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {sec.items.map((it, itemIdx) => (
                <li
                  key={it.tempId}
                  className="rounded-lg border border-border/70 bg-background p-3"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <span className="mt-2 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {itemIdx + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={it.description}
                        onChange={(e) =>
                          updateItem(sec.tempId, it.tempId, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Descrição do item (ex.: Geladeira armazenada a < 5 °C)"
                      />
                      <label
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 text-xs text-foreground/80",
                        )}
                      >
                        <Checkbox
                          checked={it.is_required}
                          onCheckedChange={(checked) =>
                            updateItem(sec.tempId, it.tempId, {
                              is_required: Boolean(checked),
                            })
                          }
                        />
                        Item obrigatório
                      </label>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => moveItem(sec.tempId, it.tempId, -1)}
                        disabled={itemIdx === 0}
                        aria-label="Mover item para cima"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => moveItem(sec.tempId, it.tempId, 1)}
                        disabled={itemIdx === sec.items.length - 1}
                        aria-label="Mover item para baixo"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(sec.tempId, it.tempId)}
                        disabled={sec.items.length === 1}
                        aria-label="Remover item"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addItem(sec.tempId)}
              className="mt-3"
            >
              <Plus className="size-3.5" />
              Adicionar item
            </Button>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <Plus className="size-3.5" />
          Adicionar seção
        </Button>
        <p className="text-xs text-muted-foreground">
          {sections.length} seç{sections.length === 1 ? "ão" : "ões"} ·{" "}
          {totalItems} {totalItems === 1 ? "item" : "itens"}
        </p>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Salvando…
            </>
          ) : mode === "edit" ? (
            "Salvar alterações"
          ) : (
            "Criar checklist"
          )}
        </Button>
      </div>
    </div>
  );
}
