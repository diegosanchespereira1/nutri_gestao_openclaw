"use client";

import { useState, useActionState } from "react";

import {
  type AssociatePatientResult,
  associatePatientToEstablishmentAction,
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

export function AssociatePatientModal({
  establishmentId,
  candidates,
}: {
  establishmentId: string;
  candidates: Candidate[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = query.trim()
    ? candidates.filter((c) =>
        c.full_name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : candidates;

  const [state, formAction, isPending] = useActionState<
    AssociatePatientResult | undefined,
    FormData
  >(associatePatientToEstablishmentAction, undefined);

  function handleSuccess() {
    if (state?.ok) {
      setOpen(false);
      setQuery("");
      setSelected(null);
    }
  }

  // Close dialog on success — effect-free: react to state change inline
  if (state?.ok && open) {
    setOpen(false);
    setQuery("");
    setSelected(null);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setOpen(true);
          setQuery("");
          setSelected(null);
        }}
      >
        Associar paciente existente
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Associar paciente ao estabelecimento"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                Associar paciente existente
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-5 py-4">
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Não há pacientes deste cliente disponíveis para associar.
                  Todos já estão em algum estabelecimento ou foram criados
                  directamente aqui.
                </p>
              ) : (
                <>
                  <Input
                    type="search"
                    placeholder="Pesquisar por nome…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                    aria-label="Pesquisar paciente"
                  />

                  <ul
                    className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border"
                    aria-label="Candidatos para associação"
                  >
                    {filtered.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-muted-foreground">
                        Nenhum resultado para &ldquo;{query}&rdquo;.
                      </li>
                    ) : (
                      filtered.map((c) => (
                        <li key={c.id}>
                          <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/50">
                            <input
                              type="radio"
                              name="candidate"
                              value={c.id}
                              checked={selected === c.id}
                              onChange={() => setSelected(c.id)}
                              className="accent-primary size-4 shrink-0"
                            />
                            <span className="min-w-0">
                              <span className="block font-medium text-foreground truncate">
                                {c.full_name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {c.birth_date ? calcAge(c.birth_date) : "Idade não informada"}
                                {c.document_id
                                  ? ` · CPF: ${formatCpfDisplay(c.document_id)}`
                                  : ""}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              )}

              {state?.ok === false ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}
            </div>

            {/* Footer */}
            {candidates.length > 0 ? (
              <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <form action={formAction}>
                  <input type="hidden" name="establishment_id" value={establishmentId} />
                  <input type="hidden" name="patient_id" value={selected ?? ""} />
                  <Button type="submit" disabled={!selected || isPending}>
                    {isPending ? "A associar…" : "Associar"}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex justify-end border-t border-border px-5 py-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
