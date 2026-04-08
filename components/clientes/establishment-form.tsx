"use client";

import { useActionState } from "react";

import {
  type EstablishmentFormResult,
  createEstablishmentAction,
  updateEstablishmentAction,
} from "@/lib/actions/establishments";
import {
  ESTABLISHMENT_TYPES,
  establishmentTypeLabel,
} from "@/lib/constants/establishment-types";
import type { EstablishmentType } from "@/lib/types/establishments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: EstablishmentFormResult | undefined = undefined;

// Dentro do Card (bg-card = branco), select usa bg-card para consistência
const selectClass =
  "border-input bg-card ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

const legendClass =
  "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

export function EstablishmentForm({
  mode,
  clientId,
  establishmentId,
  defaults,
}: {
  mode: "create" | "edit";
  clientId: string;
  establishmentId?: string;
  defaults: {
    name: string;
    establishment_type: EstablishmentType;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    postal_code: string;
  };
}) {
  const action =
    mode === "create"
      ? createEstablishmentAction
      : updateEstablishmentAction;
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="client_id" value={clientId} />
      {mode === "edit" && establishmentId ? (
        <input type="hidden" name="id" value={establishmentId} />
      ) : null}

      {/* ── Grupo 1: Identificação ──────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Identificação</legend>

        <div className="space-y-2">
          <Label htmlFor="est-name">Nome do estabelecimento</Label>
          <Input
            id="est-name"
            name="name"
            required
            defaultValue={defaults.name}
            placeholder="Ex.: Unidade Centro"
            aria-invalid={state?.ok === false}
            aria-describedby={
              state?.ok === false ? "establishment-form-err" : undefined
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="est-type">Tipo de estabelecimento</Label>
          <select
            id="est-type"
            name="establishment_type"
            required
            defaultValue={defaults.establishment_type}
            className={selectClass}
          >
            {ESTABLISHMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {establishmentTypeLabel[t]}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            Define portarias e fluxos de visita aplicáveis.
          </p>
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* ── Grupo 2: Morada ─────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className={legendClass}>Morada</legend>

        <div className="space-y-2">
          <Label htmlFor="est-addr1">Linha 1</Label>
          <Input
            id="est-addr1"
            name="address_line1"
            required
            defaultValue={defaults.address_line1}
            autoComplete="street-address"
            placeholder="Rua, número, complemento"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="est-addr2">Linha 2 (opcional)</Label>
          <Input
            id="est-addr2"
            name="address_line2"
            defaultValue={defaults.address_line2}
            placeholder="Bairro, referência"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="est-city">Localidade</Label>
            <Input id="est-city" name="city" defaultValue={defaults.city} placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="est-state">UF</Label>
            <Input
              id="est-state"
              name="state"
              defaultValue={defaults.state}
              maxLength={2}
              placeholder="SP"
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="est-postal">CEP</Label>
            <Input
              id="est-postal"
              name="postal_code"
              defaultValue={defaults.postal_code}
              placeholder="Opcional"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Feedback ─────────────────────────────────────────── */}
      {state?.ok === false ? (
        <p
          id="establishment-form-err"
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
          {mode === "create" ? "Criar estabelecimento" : "Guardar alterações"}
        </Button>
      </div>
    </form>
  );
}
