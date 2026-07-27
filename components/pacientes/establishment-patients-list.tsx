"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { withReturnTo } from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils";
import type { PatientInScope } from "@/lib/types/patients";

function formatBirthDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

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
  patients: PatientInScope[];
  novoHref: string;
  /** URL actual da página (path+query) para o botão voltar. */
  returnToOrigin: string;
  associateSlot?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const novoHrefWithReturn = withReturnTo(novoHref, returnToOrigin);

  const filtered = query.trim()
    ? patients.filter((p) => {
        const q = query.trim().toLowerCase();
        return (
          p.full_name.toLowerCase().includes(q) ||
          (p.school_grade_name?.toLowerCase().includes(q) ?? false)
        );
      })
    : patients;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          placeholder="Buscar por nome ou série/turma…"
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
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-[560px] text-left text-sm" aria-label="Lista de pacientes">
            <thead className="border-b border-border bg-primary/10 dark:bg-primary/15">
              <tr>
                <th className="px-4 py-3 font-bold text-foreground">Nome</th>
                <th className="px-4 py-3 font-bold text-foreground">Série / turma</th>
                <th className="px-4 py-3 font-bold text-foreground">Idade</th>
                <th className="px-4 py-3 font-bold text-foreground">CPF</th>
                <th className="w-36 px-4 py-3 font-bold text-foreground">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={withReturnTo(`/pacientes/${p.id}`, returnToOrigin)}
                      className="rounded-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {p.full_name}
                    </Link>
                    {p.birth_date ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                        Nasc.: {formatBirthDate(p.birth_date)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.school_grade_name ?? (
                      <span className="italic text-muted-foreground/70">Sem série</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {p.birth_date ? calcAge(p.birth_date) : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {p.document_id ? formatCpfDisplay(p.document_id) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={withReturnTo(`/pacientes/${p.id}`, returnToOrigin)}
                      className="rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Ver prontuário →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
