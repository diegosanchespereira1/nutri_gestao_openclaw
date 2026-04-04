"use client";

import { useLayoutEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { filterTemplatesForEstablishment } from "@/lib/checklists/filter-templates";
import { establishmentTypeLabel } from "@/lib/constants/establishment-types";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { EstablishmentType } from "@/lib/types/establishments";

import { TemplateItemRow } from "./template-item-row";

export type EstablishmentFilterOption = {
  id: string;
  label: string;
  state: string | null;
  establishment_type: EstablishmentType;
};

type Props = {
  establishments: EstablishmentFilterOption[];
  templates: ChecklistTemplateWithSections[];
  startFillAction: (formData: FormData) => Promise<void>;
  duplicateTemplateAction: (formData: FormData) => Promise<void>;
  /** Abre e faz scroll ao cartão deste template (ex.: link do dashboard). */
  focusTemplateId?: string | null;
};

const selectClassName =
  "border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full max-w-md rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export function ChecklistCatalog({
  establishments,
  templates,
  startFillAction,
  duplicateTemplateAction,
  focusTemplateId = null,
}: Props) {
  const [establishmentId, setEstablishmentId] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    focusTemplateId ? { [focusTemplateId]: true } : {},
  );

  const filterEstablishmentId = focusTemplateId ? "" : establishmentId;

  const visibleTemplates = useMemo(() => {
    const selected = filterEstablishmentId
      ? (establishments.find((e) => e.id === filterEstablishmentId) ?? null)
      : null;
    const filter = selected
      ? {
          state: selected.state,
          establishment_type: selected.establishment_type,
        }
      : null;
    return filterTemplatesForEstablishment(templates, filter);
  }, [filterEstablishmentId, establishments, templates]);

  useLayoutEffect(() => {
    if (!focusTemplateId) return;
    window.setTimeout(() => {
      document
        .getElementById(`checklist-template-${focusTemplateId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [focusTemplateId]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="checklist-establishment">Estabelecimento</Label>
        <select
          id="checklist-establishment"
          className={selectClassName}
          value={focusTemplateId ? "" : establishmentId}
          onChange={(e) => setEstablishmentId(e.target.value)}
          aria-describedby="checklist-establishment-hint"
        >
          <option value="">Todos os templates ativos</option>
          {establishments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
        <p
          id="checklist-establishment-hint"
          className="text-muted-foreground text-sm"
        >
          {focusTemplateId
            ? "Ligação direta a um modelo: lista completa do catálogo. Escolha um estabelecimento para filtrar ou iniciar o preenchimento."
            : establishmentId
              ? "Lista filtrada pela UF e pelo tipo do estabelecimento selecionado."
              : "Sem filtro: mostra todos os modelos ativos do catálogo. Selecione um estabelecimento para ver apenas os aplicáveis."}
        </p>
      </div>

      {establishments.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-sm">
          <p className="text-muted-foreground">
            Ainda não tem estabelecimentos (clientes PJ). Crie um cliente
            pessoa jurídica e um estabelecimento com UF e tipo para filtrar
            portarias aplicáveis.
          </p>
        </div>
      ) : null}

      {visibleTemplates.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {establishmentId
              ? "Nenhum template do catálogo corresponde à UF e ao tipo deste estabelecimento."
              : "Nenhum template ativo encontrado."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Templates de portaria">
          {visibleTemplates.map((t) => {
            const isOpen = Boolean(expanded[t.id]);
            const typesLabel = t.applies_to
              .map((x) => establishmentTypeLabel[x])
              .join(", ");
            return (
              <li key={t.id} id={`checklist-template-${t.id}`}>
                <Card size="sm">
                  <CardHeader className="border-border border-b">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <CardDescription>
                      <span className="block">
                        Portaria: {t.portaria_ref} · UF: {t.uf}
                      </span>
                      <span className="mt-1 block">
                        Aplicável a: {typesLabel}
                      </span>
                      <span className="mt-1 block font-medium text-foreground">
                        {t.required_item_count} obrigatório
                        {t.required_item_count === 1 ? "" : "s"} ·{" "}
                        {t.total_item_count} itens no total
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {t.description ? (
                      <p className="text-muted-foreground mb-3 text-sm">
                        {t.description}
                      </p>
                    ) : null}
                    {isOpen ? (
                      <div className="space-y-4">
                        {t.sections.map((sec) => (
                          <div key={sec.id}>
                            <h3 className="text-foreground mb-2 text-sm font-semibold">
                              {sec.title}
                            </h3>
                            <ul className="border-border rounded-lg border px-3">
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
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Expanda para ver secções e itens com marcação de
                        obrigatoriedade.
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="border-border flex flex-wrap gap-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpanded(t.id)}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? "Recolher detalhe" : "Ver secções e itens"}
                    </Button>
                    <form action={startFillAction} className="contents">
                      <input type="hidden" name="template_id" value={t.id} />
                      <input
                        type="hidden"
                        name="establishment_id"
                        value={establishmentId}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!establishmentId}
                        title={
                          establishmentId
                            ? "Iniciar rascunho de preenchimento"
                            : "Selecione um estabelecimento no filtro acima"
                        }
                      >
                        Usar template
                      </Button>
                    </form>
                    <form
                      action={duplicateTemplateAction}
                      className="contents"
                    >
                      <input type="hidden" name="template_id" value={t.id} />
                      <input
                        type="hidden"
                        name="establishment_id"
                        value={establishmentId}
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={!establishmentId}
                        title={
                          establishmentId
                            ? "Duplicar para o seu estabelecimento e adicionar itens"
                            : "Selecione um estabelecimento"
                        }
                      >
                        Personalizar
                      </Button>
                    </form>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
