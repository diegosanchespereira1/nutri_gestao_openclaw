"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useTransition } from "react";

import {
  createComplianceDeadlineAction,
  deleteComplianceDeadlineFormAction,
} from "@/lib/actions/compliance-deadlines";
import type { EstablishmentComplianceDeadlineRow } from "@/lib/types/compliance-deadlines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const textareaClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[56px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

type TemplateOption = { id: string; label: string };

type Props = {
  clientId: string;
  establishmentId: string;
  establishmentName: string;
  initialRows: EstablishmentComplianceDeadlineRow[];
  templateOptions: TemplateOption[];
};

export function EstablishmentComplianceDeadlinesSection({
  clientId,
  establishmentId,
  establishmentName,
  initialRows,
  templateOptions,
}: Props) {
  const router = useRouter();
  const [deletePending, startDelete] = useTransition();
  const [createState, createAction, createPending] = useActionState(
    async (
      _prev: { ok: boolean; error?: string } | null,
      formData: FormData,
    ) => createComplianceDeadlineAction(formData),
    null,
  );

  useEffect(() => {
    if (createState?.ok === true) {
      router.refresh();
    }
  }, [createState, router]);

  return (
    <section
      aria-labelledby="est-compliance-heading"
      className="space-y-4"
    >
      <div>
        <h2
          id="est-compliance-heading"
          className="text-foreground text-sm font-medium"
        >
          Prazos e portarias (compliance)
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Defina datas limite para auditorias, renovações ou obrigações
          regulatórias em <span className="font-medium">{establishmentName}</span>.
          Os alertas aparecem no Início até 90 dias antes (e até 1 ano em atraso).
        </p>
      </div>

      {initialRows.length === 0 ? (
        <p className="text-muted-foreground text-sm" role="status">
          Ainda não há prazos registados.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Prazos configurados">
          {initialRows.map((row) => (
            <li
              key={row.id}
              className="border-border flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="text-foreground font-medium">{row.title}</p>
                <p className="text-muted-foreground text-xs">
                  Limite: {row.due_date}
                  {row.portaria_ref ? ` · ${row.portaria_ref}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive h-8"
                disabled={deletePending}
                onClick={() => {
                  startDelete(async () => {
                    const fd = new FormData();
                    fd.set("deadline_id", row.id);
                    fd.set("establishment_id", establishmentId);
                    fd.set("client_id", clientId);
                    const r = await deleteComplianceDeadlineFormAction(fd);
                    if (r.ok) router.refresh();
                  });
                }}
              >
                Eliminar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form action={createAction} className="border-border space-y-3 rounded-lg border p-4">
        <input type="hidden" name="establishment_id" value={establishmentId} />
        <input type="hidden" name="client_id" value={clientId} />
        <p className="text-foreground text-sm font-medium">Novo prazo</p>
        <div className="space-y-2">
          <Label htmlFor={`cd-title-${establishmentId}`}>Título</Label>
          <Input
            id={`cd-title-${establishmentId}`}
            name="title"
            required
            maxLength={200}
            placeholder="ex.: Auditoria nutricional anual"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`cd-due-${establishmentId}`}>Data limite</Label>
          <Input
            id={`cd-due-${establishmentId}`}
            name="due_date"
            type="date"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`cd-portaria-${establishmentId}`}>
            Referência portaria (opcional)
          </Label>
          <Input
            id={`cd-portaria-${establishmentId}`}
            name="portaria_ref"
            maxLength={120}
            placeholder="ex.: Portaria X / RDC Y"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`cd-template-${establishmentId}`}>
            Checklist do catálogo (opcional)
          </Label>
          <select
            id={`cd-template-${establishmentId}`}
            name="checklist_template_id"
            className="border-input bg-background h-9 w-full max-w-md rounded-lg border px-2 text-sm"
            defaultValue=""
          >
            <option value="">— Nenhum —</option>
            {templateOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            Se escolher, o botão «Ver checklist» no Início abre o catálogo nesse modelo.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`cd-notes-${establishmentId}`}>Notas (opcional)</Label>
          <textarea
            id={`cd-notes-${establishmentId}`}
            name="notes"
            rows={2}
            className={textareaClass}
            maxLength={2000}
          />
        </div>
        {createState?.ok === false ? (
          <p className="text-destructive text-sm" role="alert">
            {createState.error}
          </p>
        ) : null}
        {createState?.ok === true ? (
          <p className="text-muted-foreground text-sm" role="status">
            Prazo criado.
          </p>
        ) : null}
        <Button type="submit" disabled={createPending}>
          {createPending ? "A guardar…" : "Adicionar prazo"}
        </Button>
      </form>
    </section>
  );
}
