"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { withReturnTo } from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils";
import type { PatientRow } from "@/lib/types/patients";

function calcAge(birthDate: string): string {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return `${age} anos`;
}

export function EstablishmentPatientsList({
  patients,
  novoHref,
  returnToOrigin,
  associateSlot,
}: {
  patients: PatientRow[];
  novoHref: string;
  /** URL actual da página (path+query) para o botão voltar. */
  returnToOrigin: string;
  associateSlot?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const novoHrefWithReturn = withReturnTo(novoHref, returnToOrigin);

  const filtered = query.trim()
    ? patients.filter((p) =>
        p.full_name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : patients;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          placeholder="Buscar paciente por nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
          aria-label="Buscar paciente"
        />
        <div className="flex flex-wrap gap-2">
          {associateSlot}
          <Link href={novoHrefWithReturn} className={cn(buttonVariants())}>
            Novo paciente
          </Link>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Ainda não há pacientes neste estabelecimento.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {associateSlot}
            <Link
              href={novoHrefWithReturn}
              className={cn(buttonVariants(), "inline-flex")}
            >
              Adicionar paciente
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum paciente encontrado para &ldquo;{query}&rdquo;.
          </p>
        </div>
      ) : (
        <ul
          className="divide-y divide-border overflow-hidden rounded-lg border border-border"
          aria-label="Lista de pacientes"
        >
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={withReturnTo(`/pacientes/${p.id}`, returnToOrigin)}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div>
                  <span className="font-medium text-foreground">{p.full_name}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {p.birth_date ? calcAge(p.birth_date) : "Idade não informada"}
                    {p.document_id
                      ? ` · CPF: ${formatCpfDisplay(p.document_id)}`
                      : ""}
                  </span>
                </div>
                <span className="ml-4 shrink-0 text-sm font-medium text-primary">
                  Ver prontuário →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length === patients.length
            ? `${patients.length} paciente${patients.length !== 1 ? "s" : ""}`
            : `${filtered.length} de ${patients.length} pacientes`}
        </p>
      )}
    </div>
  );
}
