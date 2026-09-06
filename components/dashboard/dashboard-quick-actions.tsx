"use client";

import Link from "next/link";

import { ModuleGatedLink } from "@/components/modules/module-gated-link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function DashboardQuickActions() {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <ModuleGatedLink
        moduleKey="visitas"
        href="/visitas/nova"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "min-h-11 w-full justify-center sm:w-auto",
        )}
      >
        Agendar visita
      </ModuleGatedLink>
      <Link
        href="/clientes/novo"
        className={cn(
          buttonVariants({ size: "sm" }),
          "min-h-11 w-full justify-center sm:w-auto",
        )}
      >
        Novo cliente
      </Link>
    </div>
  );
}
