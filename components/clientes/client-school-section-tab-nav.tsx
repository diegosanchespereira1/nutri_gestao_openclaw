import Link from "next/link";
import { ClipboardList, Users } from "lucide-react";

import {
  clientEditTabActiveClassName,
  clientEditTabButtonClassName,
  clientEditTabHref,
} from "@/lib/clientes/client-edit-tab";
import { cn } from "@/lib/utils";

type Props = {
  clientId: string;
  pacientesHref?: string | null;
  active: "nutricional";
  className?: string;
};

export function ClientSchoolSectionTabNav({
  clientId,
  pacientesHref,
  active,
  className,
}: Props) {
  const tabs: Array<{ href: string; label: string; isActive: boolean }> = [
    { href: clientEditTabHref(clientId, "dados"), label: "Dados do cliente", isActive: false },
    { href: clientEditTabHref(clientId, "financeiro"), label: "Financeiro", isActive: false },
    { href: clientEditTabHref(clientId, "checklists"), label: "Checklists", isActive: false },
    {
      href: `/clientes/${clientId}/visao-nutricional`,
      label: "Visão nutricional",
      isActive: active === "nutricional",
    },
  ];

  return (
    <nav
      className={cn(
        "border-border bg-muted/70 mb-6 inline-flex min-h-10 w-full max-w-full flex-wrap gap-1 rounded-lg border p-1 shadow-inner print:hidden",
        className,
      )}
      aria-label="Secções do cliente"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            clientEditTabButtonClassName,
            tab.isActive ? clientEditTabActiveClassName : "",
          )}
        >
          {tab.label}
        </Link>
      ))}
      <Link
        href={`/ficha-tecnica?cliente=${encodeURIComponent(clientId)}`}
        className={cn(clientEditTabButtonClassName, "gap-1.5")}
      >
        <ClipboardList className="size-3.5" aria-hidden />
        Ficha técnica
      </Link>
      {pacientesHref ? (
        <Link href={pacientesHref} className={cn(clientEditTabButtonClassName, "gap-1.5")}>
          <Users className="size-3.5" aria-hidden />
          Pacientes
        </Link>
      ) : null}
    </nav>
  );
}
