import Link from "next/link";
import { notFound } from "next/navigation";

import { EstablishmentForm } from "@/components/clientes/establishment-form";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function NovoEstabelecimentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clientId } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, kind, legal_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!client || client.kind !== "pj") {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/clientes/${clientId}/editar`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground hover:text-foreground -ml-2 h-auto px-2 py-1",
        )}
      >
        ← {client.legal_name}
      </Link>
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Novo estabelecimento
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cliente: <span className="text-foreground">{client.legal_name}</span>
        </p>
      </div>
      <EstablishmentForm
        mode="create"
        clientId={clientId}
        defaults={{
          name: "",
          establishment_type: "escola",
          address_line1: "",
          address_line2: "",
          city: "",
          state: "",
          postal_code: "",
        }}
      />
    </div>
  );
}
