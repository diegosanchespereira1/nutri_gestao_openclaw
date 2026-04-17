import Link from "next/link";

import { RawMaterialForm } from "@/components/technical-sheets/raw-material-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const errMessages: Record<string, string> = {
  invalid: "Verifique nome e preço (maior que zero).",
  save: "Não foi possível salvar. Tente novamente.",
};

type Props = {
  searchParams: Promise<{ err?: string }>;
};

export default async function NovaMateriaPrimaPage({ searchParams }: Props) {
  const { err } = await searchParams;
  const errMsg = err && errMessages[err] ? errMessages[err] : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/ficha-tecnica/materias-primas"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← Matérias-primas
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Nova matéria-prima
        </h1>
      </div>

      {errMsg ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {errMsg}
        </div>
      ) : null}

      <RawMaterialForm />
    </div>
  );
}
