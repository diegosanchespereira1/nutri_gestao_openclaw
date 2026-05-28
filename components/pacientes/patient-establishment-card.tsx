"use client";

import { useState, useActionState } from "react";
import Link from "next/link";

import {
  type PatientFormResult,
  updatePatientEstablishmentAction,
} from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const selectClass =
  "border-input bg-card ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export function PatientEstablishmentCard({
  patientId,
  currentEstablishmentId,
  establishments,
  clientId,
}: {
  patientId: string;
  currentEstablishmentId: string | null;
  establishments: { id: string; name: string }[];
  clientId: string;
}) {
  const [selected, setSelected] = useState(currentEstablishmentId ?? "");
  const [state, formAction, isPending] = useActionState<
    PatientFormResult | undefined,
    FormData
  >(updatePatientEstablishmentAction, undefined);

  const currentName =
    establishments.find((e) => e.id === currentEstablishmentId)?.name ?? null;

  if (establishments.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Este cliente ainda não tem estabelecimentos registados.
        </p>
        <Link
          href={`/clientes/${clientId}/editar?formTab=pj-estabelecimento`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Adicionar estabelecimento ao cliente
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="patient_id" value={patientId} />

      {currentEstablishmentId && currentName ? (
        <p className="text-sm text-muted-foreground">
          Estabelecimento atual:{" "}
          <span className="font-medium text-foreground">{currentName}</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Este paciente não está associado a nenhum estabelecimento.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="est-select">
          {currentEstablishmentId ? "Alterar estabelecimento" : "Associar a estabelecimento"}
        </Label>
        <select
          id="est-select"
          name="establishment_id"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className={selectClass}
        >
          <option value="">— Nenhum —</option>
          {establishments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {state?.ok === false ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
          role="status"
        >
          Estabelecimento atualizado.
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "A guardar…" : "Guardar associação"}
      </Button>
    </form>
  );
}
