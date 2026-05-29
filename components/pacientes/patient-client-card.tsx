"use client";

import { useState, useActionState } from "react";

import {
  type PatientFormResult,
  updatePatientClientAction,
} from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const selectClass =
  "border-input bg-card ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

type ClientOption = { id: string; legal_name: string; trade_name: string | null };

export function PatientClientCard({
  patientId,
  clients,
}: {
  patientId: string;
  clients: ClientOption[];
}) {
  const [selected, setSelected] = useState("");
  const [state, formAction, isPending] = useActionState<
    PatientFormResult | undefined,
    FormData
  >(updatePatientClientAction, undefined);

  if (clients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Não há clientes PJ disponíveis. Crie um cliente PJ primeiro para poder
        associar este paciente a um estabelecimento.
      </p>
    );
  }

  return (
    <form action={formAction} onReset={(e) => e.preventDefault()} className="space-y-4">
      <input type="hidden" name="patient_id" value={patientId} />

      <p className="text-sm text-muted-foreground">
        Este paciente é independente. Atribua um cliente PJ para depois associar
        a um estabelecimento.
      </p>

      <div className="space-y-2">
        <Label htmlFor="client-select">Cliente PJ</Label>
        <select
          id="client-select"
          name="client_id"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className={selectClass}
          required
        >
          <option value="">— Selecione o cliente —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.legal_name}
              {c.trade_name ? ` · ${c.trade_name}` : ""}
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

      <Button type="submit" disabled={isPending || !selected}>
        {isPending ? "A guardar…" : "Atribuir cliente"}
      </Button>
    </form>
  );
}
