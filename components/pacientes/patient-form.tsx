"use client";

import { useActionState } from "react";

import {
  type PatientFormResult,
  createPatientAction,
  updatePatientAction,
} from "@/lib/actions/patients";
import type { PatientSex } from "@/lib/types/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: PatientFormResult | undefined = undefined;

const sexOptions: { value: PatientSex; label: string }[] = [
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Outro" },
];

export function PatientForm({
  mode,
  patientId,
  clientId,
  establishmentId,
  defaults,
}: {
  mode: "create" | "edit";
  patientId?: string;
  clientId: string;
  establishmentId: string | null;
  defaults: {
    full_name: string;
    birth_date: string;
    document_id: string;
    sex: PatientSex | null;
    phone: string;
    email: string;
    notes: string;
  };
}) {
  const action =
    mode === "create" ? createPatientAction : updatePatientAction;
  const [state, formAction] = useActionState(action, initial);

  const sexDefault = defaults.sex ?? "";

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <input type="hidden" name="client_id" value={clientId} />
      {establishmentId ? (
        <input type="hidden" name="establishment_id" value={establishmentId} />
      ) : (
        <input type="hidden" name="establishment_id" value="" />
      )}
      {mode === "edit" && patientId ? (
        <input type="hidden" name="id" value={patientId} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="patient-name">Nome completo</Label>
        <Input
          id="patient-name"
          name="full_name"
          required
          defaultValue={defaults.full_name}
          autoComplete="name"
          aria-invalid={state?.ok === false}
          aria-describedby={
            state?.ok === false ? "patient-form-err" : undefined
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="patient-birth">Data de nascimento (opcional)</Label>
          <Input
            id="patient-birth"
            name="birth_date"
            type="date"
            defaultValue={defaults.birth_date}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="patient-sex">Sexo (opcional)</Label>
          <select
            id="patient-sex"
            name="sex"
            defaultValue={sexDefault}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <option value="">—</option>
            {sexOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="patient-doc">CPF (opcional)</Label>
        <Input
          id="patient-doc"
          name="document_id"
          defaultValue={defaults.document_id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="patient-email">Email (opcional)</Label>
          <Input
            id="patient-email"
            name="email"
            type="email"
            defaultValue={defaults.email}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="patient-phone">Telefone (opcional)</Label>
          <Input
            id="patient-phone"
            name="phone"
            type="tel"
            defaultValue={defaults.phone}
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="patient-notes">Notas clínicas (opcional)</Label>
        <textarea
          id="patient-notes"
          name="notes"
          rows={3}
          defaultValue={defaults.notes}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-muted-foreground text-xs">
          Evite dados desnecessários; respeite LGPD e o prontuário.
        </p>
      </div>

      {state?.ok === false ? (
        <p
          id="patient-form-err"
          className="text-destructive text-sm"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-muted-foreground text-sm" role="status">
          Alterações guardadas.
        </p>
      ) : null}

      <Button type="submit">
        {mode === "create" ? "Criar paciente" : "Guardar alterações"}
      </Button>
    </form>
  );
}
