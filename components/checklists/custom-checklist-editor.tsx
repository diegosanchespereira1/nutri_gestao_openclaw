"use client";

import { useTransition, useState } from "react";
import { Check, Loader2, Save, Trash2, User } from "lucide-react";
import {
  addCustomItemAction,
  addCustomSectionAction,
  deleteCustomItemAction,
  deleteCustomSectionAction,
  renameCustomTemplateAction,
  type CustomEditSection,
} from "@/lib/actions/checklist-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  customTemplateId: string;
  templateName: string;
  sections: CustomEditSection[];
  createdByName?: string | null;
};

const fieldClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export function CustomChecklistEditor({
  customTemplateId,
  templateName,
  sections,
  createdByName,
}: Props) {
  const [pending, startTransition] = useTransition();

  // ── Nome editável ──────────────────────────────────────────────────────
  const [name, setName] = useState(templateName);
  const [savedName, setSavedName] = useState(templateName);
  const [namePending, startNameTransition] = useTransition();
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("O nome não pode estar vazio.");
      return;
    }
    setNameError(null);
    setNameSaved(false);

    const fd = new FormData();
    fd.append("custom_template_id", customTemplateId);
    fd.append("name", trimmed);

    startNameTransition(async () => {
      const result = await renameCustomTemplateAction(fd);
      if (!result.ok) {
        setNameError(result.error ?? "Erro ao salvar o nome.");
      } else {
        setSavedName(trimmed);
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 3000);
      }
    });
  }

  // ── Itens e seções ────────────────────────────────────────────────────
  function handleDeleteItem(itemId: string) {
    const fd = new FormData();
    fd.append("custom_item_id", itemId);
    fd.append("custom_template_id", customTemplateId);
    startTransition(() => deleteCustomItemAction(fd));
  }

  function handleDeleteSection(sectionId: string, sectionTitle: string) {
    const confirmed = window.confirm(
      `Excluir a seção "${sectionTitle}"?\n\nTodos os itens desta seção também serão excluídos. Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;
    const fd = new FormData();
    fd.append("custom_section_id", sectionId);
    fd.append("custom_template_id", customTemplateId);
    startTransition(() => deleteCustomSectionAction(fd));
  }

  const nameChanged = name.trim() !== savedName;

  return (
    <div className="space-y-8">

      {/* ── Cabeçalho: nome editável + criador ── */}
      <div className="border-border rounded-xl border bg-background p-4 shadow-xs space-y-3">
        <div className="space-y-1">
          <Label htmlFor="custom-template-name">Nome do modelo</Label>
          <div className="flex items-center gap-2">
            <Input
              id="custom-template-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameSaved(false);
              }}
              placeholder="Nome do checklist personalizado"
              maxLength={200}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSaveName}
              disabled={namePending || !nameChanged}
              aria-label="Salvar nome do modelo"
            >
              {namePending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : nameSaved ? (
                <Check className="size-3.5" />
              ) : (
                <Save className="size-3.5" />
              )}
              {namePending ? "Salvando…" : nameSaved ? "Salvo!" : "Salvar nome"}
            </Button>
          </div>

          {nameError && (
            <p className="text-destructive text-xs" role="alert">
              {nameError}
            </p>
          )}
          {nameSaved && !nameError && (
            <p className="text-emerald-600 text-xs">
              Nome atualizado com sucesso.
            </p>
          )}
        </div>

        {createdByName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3.5 shrink-0" />
            <span>
              Criado por{" "}
              <span className="text-foreground font-medium">{createdByName}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Aviso de opções de avaliação ── */}
      <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
        No preenchimento, cada critério deste modelo usa as opções padrão de
        avaliação:{" "}
        <span className="text-foreground font-medium">Conforme</span>,{" "}
        <span className="text-foreground font-medium">Não conforme</span> e{" "}
        <span className="text-foreground font-medium">Não aplicável</span>.
      </p>

      {/* ── Seções e itens ── */}
      {sections.map((sec) => (
        <section
          key={sec.id}
          className="border-border rounded-xl border bg-background p-4 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-foreground text-base font-semibold">
              {sec.title}
            </h2>
            <button
              type="button"
              onClick={() => handleDeleteSection(sec.id, sec.title)}
              disabled={pending}
              aria-label={`Excluir seção "${sec.title}"`}
              className="text-muted-foreground hover:text-destructive flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir seção
            </button>
          </div>

          <ul className="border-border mt-3 divide-y rounded-lg border">
            {sec.items.map((it) => (
              <li
                key={it.id}
                className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="text-foreground min-w-0 flex-1">
                  {it.description}
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-2">
                  {it.peso !== 1 && (
                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      Peso {it.peso}
                    </span>
                  )}
                  {it.is_required ? (
                    <span className="bg-primary/15 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
                      Obrigatório
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Opcional
                    </span>
                  )}
                  {it.is_user_extra ? (
                    <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
                      Extra
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Base</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(it.id)}
                    disabled={pending}
                    aria-label="Excluir item"
                    className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <form action={addCustomItemAction} className="mt-4 space-y-3 border-t pt-4">
            <input type="hidden" name="custom_template_id" value={customTemplateId} />
            <input type="hidden" name="custom_section_id" value={sec.id} />
            <p className="text-muted-foreground text-xs font-medium">
              Novo item nesta seção
            </p>
            <div className="space-y-2">
              <Label htmlFor={`desc-${sec.id}`}>Descrição</Label>
              <textarea
                id={`desc-${sec.id}`}
                name="description"
                required
                rows={2}
                className={fieldClass}
                placeholder="Texto do critério ou campo extra"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="is_required" className="h-4 w-4" />
                Marcar como obrigatório no preenchimento
              </label>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor={`peso-${sec.id}`}
                  className="text-sm whitespace-nowrap"
                >
                  Peso
                </Label>
                <Input
                  id={`peso-${sec.id}`}
                  name="peso"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue="1"
                  className="h-8 w-20 text-sm"
                  aria-describedby={`peso-hint-${sec.id}`}
                />
                <span
                  id={`peso-hint-${sec.id}`}
                  className="text-muted-foreground text-xs"
                >
                  (padrão 1)
                </span>
              </div>
              <Button type="submit" size="sm">
                Adicionar item
              </Button>
            </div>
          </form>
        </section>
      ))}

      {/* ── Nova seção ── */}
      <section className="border-border rounded-xl border border-dashed p-4">
        <h2 className="text-foreground text-base font-semibold">Nova seção</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Seções vazias podem receber apenas itens seus (úteis para requisitos
          internos do cliente).
        </p>
        <form action={addCustomSectionAction} className="mt-4 flex flex-wrap gap-3">
          <input type="hidden" name="custom_template_id" value={customTemplateId} />
          <div className="flex min-w-[200px] flex-1 flex-col gap-2">
            <Label htmlFor="new-section-title">Título da seção</Label>
            <Input
              id="new-section-title"
              name="title"
              required
              placeholder="Ex.: Controle interno"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Adicionar seção</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
