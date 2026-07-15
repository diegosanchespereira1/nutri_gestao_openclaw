"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, Undo2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  saveChecklistDraftAction,
  addSectionQuickAction,
  deleteSectionQuickAction,
  addItemQuickAction,
  deleteItemQuickAction,
} from "@/lib/actions/admin-checklists";
import type { ChecklistTemplateSectionWithItems } from "@/lib/types/checklists";

type ItemDraft = {
  description: string;
  is_required: boolean;
  peso: number;
  is_structure_only: boolean;
  position: number;
};

type SectionDraft = {
  title: string;
  position: number;
};

type Props = {
  sections: ChecklistTemplateSectionWithItems[];
  templateId: string;
};

export function ChecklistEditor({ sections, templateId }: Props) {
  const router = useRouter();

  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({});
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, SectionDraft>>({});
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(new Set());

  const [addFormsKey, setAddFormsKey] = useState(0);
  const [structuralPending, setStructuralPending] = useState(false);
  const [structuralError, setStructuralError] = useState<string | null>(null);
  const [structuralSuccess, setStructuralSuccess] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [discardOpen, setDiscardOpen] = useState(false);
  const [navDialogOpen, setNavDialogOpen] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  const [footerVisible, setFooterVisible] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isDirty =
    Object.keys(itemDrafts).length > 0 || Object.keys(sectionDrafts).length > 0;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]");
      if (!anchor) return;
      const href = (anchor as HTMLAnchorElement).getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        (anchor as HTMLAnchorElement).target === "_blank"
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavUrl(href);
      setNavDialogOpen(true);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty]);

  const toggleItem = (id: string) => {
    setOpenItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runStructural = useCallback(
    async (
      op: () => Promise<{ ok: boolean; error?: string }>,
      successMessage?: string,
    ) => {
      setStructuralPending(true);
      setStructuralError(null);
      setStructuralSuccess(null);
      const result = await op();
      setStructuralPending(false);
      if (result.ok) {
        if (successMessage) {
          setStructuralSuccess(successMessage);
          setTimeout(() => setStructuralSuccess(null), 4000);
        }
        router.refresh();
        setAddFormsKey((k) => k + 1);
      } else {
        setStructuralError(result.error ?? "Erro ao executar operação.");
      }
      return result.ok;
    },
    [router],
  );

  const collectPayload = useCallback(
    () => ({
      templateId,
      sections: Object.entries(sectionDrafts).map(([id, d]) => ({ id, ...d })),
      items: Object.entries(itemDrafts).map(([id, d]) => ({ id, ...d })),
    }),
    [templateId, sectionDrafts, itemDrafts],
  );

  const handleSave = async () => {
    for (const [, d] of Object.entries(itemDrafts)) {
      if (!d.description.trim()) {
        setSaveError("A descrição do item não pode estar vazia.");
        return;
      }
    }
    for (const [, d] of Object.entries(sectionDrafts)) {
      if (!d.title.trim()) {
        setSaveError("O título da seção não pode estar vazio.");
        return;
      }
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const result = await saveChecklistDraftAction(collectPayload());
    setSaving(false);
    if (result.ok) {
      setItemDrafts({});
      setSectionDrafts({});
      setSaveSuccess(true);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(result.error ?? "Erro ao salvar. Tente novamente.");
    }
  };

  const handleDiscardConfirm = () => {
    setItemDrafts({});
    setSectionDrafts({});
    setOpenItemIds(new Set());
    setAddFormsKey((k) => k + 1);
    setDiscardOpen(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleNavCancel = () => {
    setPendingNavUrl(null);
    setNavDialogOpen(false);
  };

  const handleNavDiscard = () => {
    setItemDrafts({});
    setSectionDrafts({});
    setNavDialogOpen(false);
    if (pendingNavUrl) router.push(pendingNavUrl);
  };

  const handleNavSave = async () => {
    for (const [, d] of Object.entries(itemDrafts)) {
      if (!d.description.trim()) {
        setSaveError("A descrição do item não pode estar vazia.");
        setNavDialogOpen(false);
        return;
      }
    }
    setSaving(true);
    const result = await saveChecklistDraftAction(collectPayload());
    setSaving(false);
    setNavDialogOpen(false);
    if (result.ok) {
      if (pendingNavUrl) router.push(pendingNavUrl);
    } else {
      setSaveError(result.error ?? "Erro ao salvar. Tente novamente.");
    }
  };

  return (
    <>
      {(saveError || structuralError) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">
            {saveError ?? structuralError}
          </p>
        </div>
      )}
      {(saveSuccess || structuralSuccess) && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3"
          role="status"
        >
          <p className="text-sm text-green-800">
            {structuralSuccess ?? "Alterações salvas."}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Seções ({sections.length})
        </h2>

        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma seção criada. Adicione a primeira seção abaixo.
          </p>
        ) : (
          sections.map((section) => {
            const secDraft = sectionDrafts[section.id];
            const secVal = {
              title: secDraft?.title ?? section.title,
              position: secDraft?.position ?? section.position,
            };

            return (
              <Card key={section.id}>
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-40 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Título da seção
                      </Label>
                      <Input
                        value={secVal.title}
                        onChange={(e) =>
                          setSectionDrafts((prev) => ({
                            ...prev,
                            [section.id]: { ...secVal, title: e.target.value },
                          }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Posição
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={secVal.position}
                        onChange={(e) =>
                          setSectionDrafts((prev) => ({
                            ...prev,
                            [section.id]: {
                              ...secVal,
                              position: parseInt(e.target.value, 10) || 1,
                            },
                          }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={structuralPending}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Remover a seção "${section.title}"?\n\nOs itens saem do modelo ativo. Checklists já aplicados continuam no histórico.`,
                      );
                      if (!confirmed) return;
                      const itemIds = section.items.map((it) => it.id);
                      runStructural(
                        () =>
                          deleteSectionQuickAction({
                            templateId,
                            sectionId: section.id,
                          }),
                        "Seção removida do modelo ativo. Histórico de checklists aplicados preservado.",
                      ).then((ok) => {
                        if (ok) {
                          setSectionDrafts((prev) => {
                            const n = { ...prev };
                            delete n[section.id];
                            return n;
                          });
                          setItemDrafts((prev) => {
                            const n = { ...prev };
                            itemIds.forEach((id) => delete n[id]);
                            return n;
                          });
                        }
                      });
                    }}
                    className="mt-2 flex items-center gap-1 text-xs text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="size-3" aria-hidden />
                    Remover seção e todos os itens
                  </button>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  {section.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum item nesta seção.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {section.items.map((item) => {
                        const isOpen = openItemIds.has(item.id);
                        const draft = itemDrafts[item.id];
                        const val = {
                          description: draft?.description ?? item.description,
                          position: draft?.position ?? item.position,
                          peso: draft?.peso ?? item.peso,
                          is_required: draft?.is_required ?? item.is_required,
                          is_structure_only:
                            draft?.is_structure_only ??
                            item.is_structure_only ??
                            false,
                        };

                        return (
                          <li
                            key={item.id}
                            className="rounded-lg border border-border bg-muted/20"
                          >
                            {/* Row: grip + description + badges + toggle */}
                            <div className="flex items-start gap-2 p-3">
                              <GripVertical
                                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                                aria-hidden
                              />

                              {/* Description — editable when open, plain text when closed */}
                              {isOpen ? (
                                <Textarea
                                  value={val.description}
                                  onChange={(e) =>
                                    setItemDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...val,
                                        description: e.target.value,
                                      },
                                    }))
                                  }
                                  rows={2}
                                  autoFocus
                                  className="flex-1 text-sm"
                                />
                              ) : (
                                <span className="flex-1 text-sm leading-relaxed">
                                  {val.description}
                                </span>
                              )}

                              <div className="flex shrink-0 flex-wrap items-start gap-1">
                                {val.is_structure_only && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4"
                                  >
                                    estrutura
                                  </Badge>
                                )}
                                {val.is_required && !val.is_structure_only && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] h-4"
                                  >
                                    obrigatório
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 tabular-nums"
                                >
                                  peso {val.peso}
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => toggleItem(item.id)}
                                  className="ml-1 text-xs text-primary hover:underline"
                                >
                                  {isOpen ? "Fechar" : "Editar"}
                                </button>
                              </div>
                            </div>

                            {/* Extra fields — only when open */}
                            {isOpen && (
                              <div className="border-t border-border px-3 pb-3 pt-3 space-y-3">
                                <div className="flex flex-wrap gap-3">
                                  <div className="w-20 space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Posição
                                    </Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={val.position}
                                      onChange={(e) =>
                                        setItemDrafts((prev) => ({
                                          ...prev,
                                          [item.id]: {
                                            ...val,
                                            position:
                                              parseInt(e.target.value, 10) || 1,
                                          },
                                        }))
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div className="w-20 space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Peso
                                    </Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.5}
                                      value={val.peso}
                                      onChange={(e) =>
                                        setItemDrafts((prev) => ({
                                          ...prev,
                                          [item.id]: {
                                            ...val,
                                            peso:
                                              parseFloat(e.target.value) || 1,
                                          },
                                        }))
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Obrigatório
                                    </Label>
                                    <select
                                      value={val.is_required ? "true" : "false"}
                                      onChange={(e) =>
                                        setItemDrafts((prev) => ({
                                          ...prev,
                                          [item.id]: {
                                            ...val,
                                            is_required:
                                              e.target.value === "true",
                                          },
                                        }))
                                      }
                                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                    >
                                      <option value="false">Não</option>
                                      <option value="true">Sim</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Só estrutura
                                    </Label>
                                    <select
                                      value={
                                        val.is_structure_only ? "true" : "false"
                                      }
                                      onChange={(e) =>
                                        setItemDrafts((prev) => ({
                                          ...prev,
                                          [item.id]: {
                                            ...val,
                                            is_structure_only:
                                              e.target.value === "true",
                                          },
                                        }))
                                      }
                                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                    >
                                      <option value="false">Não</option>
                                      <option value="true">Sim</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  {draft && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setItemDrafts((prev) => {
                                          const next = { ...prev };
                                          delete next[item.id];
                                          return next;
                                        })
                                      }
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      <Undo2 className="size-3" aria-hidden />
                                      Desfazer alteração
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    disabled={structuralPending}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        "Remover este item do modelo ativo?\n\nChecklists já aplicados continuam no histórico com este item.",
                                      );
                                      if (!confirmed) return;
                                      runStructural(
                                        () =>
                                          deleteItemQuickAction({
                                            templateId,
                                            itemId: item.id,
                                          }),
                                        "Item removido do modelo ativo. Histórico de checklists aplicados preservado.",
                                      ).then((ok) => {
                                        if (ok) {
                                          setItemDrafts((prev) => {
                                            const n = { ...prev };
                                            delete n[item.id];
                                            return n;
                                          });
                                          setOpenItemIds((prev) => {
                                            const n = new Set(prev);
                                            n.delete(item.id);
                                            return n;
                                          });
                                        }
                                      });
                                    }}
                                    className="flex items-center gap-1 text-xs text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Trash2 className="size-3" aria-hidden />
                                    Remover item
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Add item */}
                  <details
                    key={`add-${section.id}-${addFormsKey}`}
                    className="rounded-lg border border-dashed border-border"
                  >
                    <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs text-primary list-none">
                      <Plus className="size-3.5" aria-hidden />
                      Adicionar item
                    </summary>
                    <div className="border-t border-border p-3">
                      <form
                        className="space-y-3"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          await runStructural(() =>
                            addItemQuickAction({
                              templateId,
                              sectionId: section.id,
                              description: String(
                                fd.get("description") ?? "",
                              ).trim(),
                              is_required: fd.get("is_required") === "true",
                              peso:
                                parseFloat(String(fd.get("peso") ?? "1")) || 1,
                              is_structure_only:
                                fd.get("is_structure_only") === "true",
                            }),
                          );
                        }}
                      >
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Descrição do item
                          </Label>
                          <Textarea
                            name="description"
                            required
                            rows={2}
                            placeholder="Ex: Verificar higienização das superfícies de manipulação."
                            className="text-sm"
                          />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <div className="w-20 space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Peso
                            </Label>
                            <Input
                              name="peso"
                              type="number"
                              min={0}
                              step={0.5}
                              defaultValue={1}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Obrigatório
                            </Label>
                            <select
                              name="is_required"
                              defaultValue="false"
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            >
                              <option value="false">Não</option>
                              <option value="true">Sim</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Só estrutura
                            </Label>
                            <select
                              name="is_structure_only"
                              defaultValue="false"
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            >
                              <option value="false">Não</option>
                              <option value="true">Sim</option>
                            </select>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          size="sm"
                          disabled={structuralPending}
                          className="h-7 text-xs"
                        >
                          {structuralPending ? "Adicionando…" : "Adicionar item"}
                        </Button>
                      </form>
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add section */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Plus className="size-3.5" aria-hidden />
            Adicionar seção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            key={`add-section-${addFormsKey}`}
            className="flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await runStructural(() =>
                addSectionQuickAction({
                  templateId,
                  title: String(fd.get("title") ?? "").trim(),
                }),
              );
            }}
          >
            <div className="flex-1 min-w-48 space-y-1">
              <Label
                htmlFor="new-section-title"
                className="text-xs text-muted-foreground"
              >
                Título da seção
              </Label>
              <Input
                id="new-section-title"
                name="title"
                required
                placeholder="Ex: Condições das instalações físicas"
                className="h-8 text-sm"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={structuralPending}
              className="h-8 text-xs"
            >
              {structuralPending ? "Adicionando…" : "Adicionar seção"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Page-footer save bar */}
      <div
        ref={footerRef}
        className="flex items-center justify-end gap-2 rounded-xl border border-border bg-background px-4 py-3"
      >
        {isDirty && (
          <span className="mr-auto text-xs text-muted-foreground">
            Há alterações não salvas
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDiscardOpen(true)}
          disabled={!isDirty || saving}
        >
          Descartar alterações
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!isDirty || saving}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>

      {/* Floating bar — only when dirty AND footer out of view */}
      {isDirty && !footerVisible && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiscardOpen(true)}
            disabled={saving}
          >
            Descartar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      )}

      {/* Discard confirmation */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as edições não salvas serão perdidas e não poderão ser
              recuperadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardConfirm}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Navigation warning */}
      <AlertDialog
        open={navDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleNavCancel();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Se sair agora, elas serão
              perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNavCancel}
              disabled={saving}
            >
              Continuar editando
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNavDiscard}
              disabled={saving}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              Descartar e sair
            </Button>
            <Button size="sm" onClick={handleNavSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar e sair"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
