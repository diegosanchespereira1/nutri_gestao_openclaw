"use client";

import { useActionState, useState } from "react";

import {
  type PatientFormResult,
  createPatientAction,
  updatePatientAction,
} from "@/lib/actions/patients";
import type { PatientSex } from "@/lib/types/patients";
import type { ClientRow } from "@/lib/types/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initial: PatientFormResult | undefined = undefined;

const sexOptions: { value: PatientSex; label: string }[] = [
  { value: "female", label: "Feminino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Outro" },
];

// Classe partilhada para <select> nativos — alinha visualmente com <Input>
const selectClass =
  "border-input bg-card ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export function PatientForm({
  mode,
  patientId,
  /** Quando fornecido, o cliente fica fixo (contexto de cliente/estabelecimento).
   *  Quando omitido, o formulário oferece seletor de cliente (opcional). */
  clientId,
  establishmentId,
  /** Lista de clientes PJ disponíveis para o seletor (só relevante em create sem clientId fixo). */
  clients,
  defaults,
}: {
  mode: "create" | "edit";
  patientId?: string;
  clientId?: string | null;
  establishmentId?: string | null;
  clients?: Pick<ClientRow, "id" | "legal_name" | "trade_name">[];
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
  const [sex, setSex] = useState<string>(sexDefault);

  // Para o seletor de cliente no modo "independente"
  const showClientSelector = mode === "create" && clientId == null;
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  return (
    <form action={formAction} className="space-y-6">
      {/* Campos ocultos de contexto */}
      {clientId ? (
        <input type="hidden" name="client_id" value={clientId} />
      ) : showClientSelector ? (
        // Seletor visível — o valor seleccionado vai como client_id
        <input type="hidden" name="client_id" value={selectedClientId} />
      ) : null}
      {establishmentId ? (
        <input type="hidden" name="establishment_id" value={establishmentId} />
      ) : (
        <input type="hidden" name="establishment_id" value="" />
      )}
      {mode === "edit" && patientId ? (
        <input type="hidden" name="id" value={patientId} />
      ) : null}

      {/* ── Grupo 1: Identificação ───────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Identificação
        </legend>

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
            <Label htmlFor="patient-birth">Data de nascimento</Label>
            <Input
              id="patient-birth"
              name="birth_date"
              type="date"
              defaultValue={defaults.birth_date}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-sex">Sexo</Label>
            <select
              id="patient-sex"
              name="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className={cn(selectClass, sex === "" && "text-muted-foreground")}
            >
              <option value="">— opcional —</option>
              {sexOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="patient-doc">CPF</Label>
          <Input
            id="patient-doc"
            name="document_id"
            defaultValue={defaults.document_id}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00 (opcional)"
            className="font-mono"
          />
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* ── Grupo 1b: Associação a cliente (opcional, só create independente) ── */}
      {showClientSelector && clients && clients.length > 0 ? (
        <>
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Associação (opcional)
            </legend>
            <div className="space-y-2">
              <Label htmlFor="patient-client">Cliente</Label>
              <select
                id="patient-client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={cn(
                  selectClass,
                  selectedClientId === "" && "text-muted-foreground",
                )}
              >
                <option value="">— Nenhum (paciente independente) —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legal_name}
                    {c.trade_name ? ` · ${c.trade_name}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Pode associar ou alterar o cliente mais tarde.
              </p>
            </div>
          </fieldset>
          <div className="border-t border-border" />
        </>
      ) : null}

      {/* ── Grupo 2: Contacto ────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Contacto
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="patient-email">Email</Label>
            <Input
              id="patient-email"
              name="email"
              type="email"
              defaultValue={defaults.email}
              autoComplete="email"
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-phone">Telefone</Label>
            <Input
              id="patient-phone"
              name="phone"
              type="tel"
              defaultValue={defaults.phone}
              autoComplete="tel"
              placeholder="Opcional"
            />
          </div>
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* ── Grupo 3: Notas clínicas ──────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Notas clínicas
        </legend>

        <div className="space-y-2">
          <Label htmlFor="patient-notes">Observações</Label>
          <textarea
            id="patient-notes"
            name="notes"
            rows={4}
            defaultValue={defaults.notes}
            placeholder="Alergias, intolerâncias, restrições alimentares, medicações crónicas… (opcional)"
            className="border-input bg-card ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[96px] w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <span aria-hidden>🔒</span>
            Dado clínico protegido por LGPD — não partilhado sem consentimento.
          </p>
        </div>
      </fieldset>

      {/* ── Feedback ─────────────────────────────────────────── */}
      {state?.ok === false ? (
        <p
          id="patient-form-err"
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
          Alterações guardadas.
        </p>
      ) : null}

      <div className="pt-2">
        <Button type="submit">
          {mode === "create" ? "Criar paciente" : "Guardar alterações"}
        </Button>
      </div>
    </form>
  );
}
