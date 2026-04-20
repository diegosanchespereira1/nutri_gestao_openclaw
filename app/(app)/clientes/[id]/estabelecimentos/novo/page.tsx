import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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

  // Regra 1:1 — se já existe um estabelecimento, redireciona direto para edição.
  const { data: existing } = await supabase
    .from("establishments")
    .select("id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing) {
    redirect(`/clientes/${clientId}/estabelecimentos/${existing.id}/editar`);
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
        <p className="text-muted-foreground mt-1 text-xs">
          Cada cliente representa um único estabelecimento (1 CNPJ = 1 cadastro).
          Para registar outra unidade, crie um novo cliente.
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
