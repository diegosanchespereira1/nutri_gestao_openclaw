"use client";

import { useState } from "react";
import { useActionState } from "react";

import {
  type EstablishmentFormResult,
  createEstablishmentAction,
  updateEstablishmentAction,
} from "@/lib/actions/establishments";
import {
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_TYPES_BY_CATEGORY,
  categoryFromType,
  establishmentCategoryLabel,
  establishmentTypeLabel,
} from "@/lib/constants/establishment-types";
import type { EstablishmentCategory, EstablishmentType } from "@/lib/types/establishments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: EstablishmentFormResult | undefined = undefined;

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
    mode === "create" ? createEstablishmentAction : updateEstablishmentAction;
  const [state, formAction] = useActionState(action, initial);

  const initialCategory: EstablishmentCategory | "" =
    mode === "edit" ? categoryFromType(defaults.establishment_type) : "";
  const initialType: EstablishmentType | "" =
    mode === "edit" ? defaults.establishment_type : "";

  const [category, setCategory] = useState<EstablishmentCategory | "">(initialCategory);
  const [selectedType, setSelectedType] = useState<EstablishmentType | "">(initialType);

  function handleCategoryChange(value: EstablishmentCategory | "") {
    setCategory(value);
    setSelectedType("");
  }

  const typesForCategory =
    category !== "" ? ESTABLISHMENT_TYPES_BY_CATEGORY[category] : [];

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

        {/* Categoria — filtra os tipos disponíveis */}
        <div className="space-y-2">
          <Label htmlFor="est-category">Categoria</Label>
          <select
            id="est-category"
            required
            value={category}
            onChange={(e) =>
              handleCategoryChange(e.target.value as EstablishmentCategory | "")
            }
            className={selectClass}
          >
            <option value="" disabled>
              Selecione a categoria…
            </option>
            {ESTABLISHMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {establishmentCategoryLabel[c]}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            Define o enquadramento do estabelecimento para fins de visita e
            protocolos.
          </p>
        </div>

        {/* Tipo — só aparece após categoria ser escolhida */}
        {category !== "" ? (
          <div className="space-y-2">
            <Label htmlFor="est-type">Tipo de estabelecimento</Label>
            <select
              id="est-type"
              name="establishment_type"
              required
              value={selectedType}
              onChange={(e) =>
                setSelectedType(e.target.value as EstablishmentType)
              }
              className={selectClass}
            >
              <option value="" disabled>
                Selecione o tipo…
              </option>
              {typesForCategory.map((t) => (
                <option key={t} value={t}>
                  {establishmentTypeLabel[t]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
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
            <Input
              id="est-city"
              name="city"
              defaultValue={defaults.city}
              placeholder="Opcional"
            />
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
          {mode === "create" ? "Criar estabelecimento" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
