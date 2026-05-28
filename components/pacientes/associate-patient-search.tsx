"use client";

import { useState, useActionState } from "react";

import {
  type AssociatePatientResult,
  associatePatientPageAction,
} from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCpfDisplay } from "@/lib/format/br-document";

type Candidate = {
  id: string;
  full_name: string;
  birth_date: string | null;
  document_id: string | null;
};

function calcAge(birthDate: string): string {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return `${age} anos`;
}

export function AssociatePatientSearch({
  clientId,
  establishmentId,
  candidates,
}: {
  clientId: string;
  establishmentId: string;
  candidates: Candidate[];
}) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<
    AssociatePatientResult | undefined,
    FormData
  >(associatePatientPageAction, undefined);

  const filtered = query.trim()
    ? candidates.filter((c) =>
        c.full_name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : candidates;

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não há pacientes deste cliente disponíveis para associar.
          Todos já têm um estabelecimento atribuído.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        type="search"
        placeholder="Pesquisar por nome…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
        aria-label="Pesquisar paciente"
        autoFocus
      />

      {state?.ok === false ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum resultado para &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul
          className="divide-y divide-border overflow-hidden rounded-lg border border-border"
          aria-label="Pacientes disponíveis para associação"
        >
          {filtered.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <span className="block font-medium text-foreground truncate">
                  {c.full_name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {c.birth_date ? calcAge(c.birth_date) : "Idade não informada"}
                  {c.document_id
                    ? ` · CPF: ${formatCpfDisplay(c.document_id)}`
                    : ""}
                </span>
              </div>
              <form
                action={formAction}
                onSubmit={() => setPendingId(c.id)}
                className="shrink-0"
              >
                <input type="hidden" name="patient_id" value={c.id} />
                <input type="hidden" name="establishment_id" value={establishmentId} />
                <input type="hidden" name="client_id" value={clientId} />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending && pendingId === c.id}
                >
                  {isPending && pendingId === c.id ? "A associar…" : "Associar"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length === candidates.length
          ? `${candidates.length} paciente${candidates.length !== 1 ? "s" : ""} disponíve${candidates.length !== 1 ? "is" : "l"}`
          : `${filtered.length} de ${candidates.length} pacientes`}
      </p>
    </div>
  );
}
