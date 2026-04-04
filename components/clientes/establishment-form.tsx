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
    <form action={formAction} className="max-w-lg space-y-5">
      <input type="hidden" name="client_id" value={clientId} />
      {mode === "edit" && establishmentId ? (
        <input type="hidden" name="id" value={establishmentId} />
      ) : null}

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
        <Label htmlFor="est-type">Tipo</Label>
        <select
          id="est-type"
          name="establishment_type"
          required
          defaultValue={defaults.establishment_type}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {ESTABLISHMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {establishmentTypeLabel[t]}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">
          Define portarias e fluxos de visita aplicáveis (PRD).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="est-addr1">Morada — linha 1</Label>
        <Input
          id="est-addr1"
          name="address_line1"
          required
          defaultValue={defaults.address_line1}
          autoComplete="street-address"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="est-addr2">Morada — linha 2 (opcional)</Label>
        <Input
          id="est-addr2"
          name="address_line2"
          defaultValue={defaults.address_line2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="est-city">Localidade (opcional)</Label>
          <Input id="est-city" name="city" defaultValue={defaults.city} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="est-state">UF (opcional)</Label>
          <Input
            id="est-state"
            name="state"
            defaultValue={defaults.state}
            maxLength={2}
            placeholder="SP"
            className="uppercase"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="est-postal">Código postal (opcional)</Label>
        <Input
          id="est-postal"
          name="postal_code"
          defaultValue={defaults.postal_code}
        />
      </div>

      {state?.ok === false ? (
        <p
          id="establishment-form-err"
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
        {mode === "create" ? "Criar estabelecimento" : "Guardar alterações"}
      </Button>
    </form>
  );
}
