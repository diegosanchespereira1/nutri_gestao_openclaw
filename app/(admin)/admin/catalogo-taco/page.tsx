import Link from "next/link";

import { TacoCatalogAdmin } from "@/components/admin/taco-catalog-admin";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function AdminTacoCatalogPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← Administração
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Catálogo TACO (referência)
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Lista completa e gestão de alimentos de referência usados na ficha
          técnica. Apenas administradores podem alterar este catálogo.
        </p>
      </div>
      <TacoCatalogAdmin />
    </div>
  );
}
