"use client";

import Link from "next/link";

import { ModuleGatedLink } from "@/components/modules/module-gated-link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function InicioQuickActions() {
  return (
    <div className="flex gap-2">
      <ModuleGatedLink
        moduleKey="visitas"
        href="/visitas/nova"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Agendar visita
      </ModuleGatedLink>
      <Link
        href="/clientes/novo"
        className={cn(buttonVariants({ size: "sm" }))}
      >
        Novo cliente
      </Link>
    </div>
  );
}
