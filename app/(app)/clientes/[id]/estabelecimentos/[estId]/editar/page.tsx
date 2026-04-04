import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteEstablishmentButton } from "@/components/clientes/delete-establishment-button";
import { EstablishmentForm } from "@/components/clientes/establishment-form";
import { PatientsSection } from "@/components/pacientes/patients-section";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import type { EstablishmentRow } from "@/lib/types/establishments";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function EditarEstabelecimentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; estId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: clientId, estId } = await params;
  const sp = await searchParams;
  const blockedPatients =
    typeof sp.blocked === "string" ? sp.blocked === "patients" : false;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, kind, legal_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!client || client.kind !== "pj") {
    notFound();
  }

  const { data: est, error } = await supabase
    .from("establishments")
    .select("*")
    .eq("id", estId)
    .maybeSingle();

  if (error || !est || est.client_id !== clientId) {
    notFound();
  }

  const row = est as EstablishmentRow;

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
          Editar estabelecimento
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{row.name}</p>
      </div>
      <EstablishmentForm
        mode="edit"
        clientId={clientId}
        establishmentId={row.id}
        defaults={{
          name: row.name,
          establishment_type: row.establishment_type,
          address_line1: row.address_line1,
          address_line2: row.address_line2 ?? "",
          city: row.city ?? "",
          state: row.state ?? "",
          postal_code: row.postal_code ?? "",
        }}
      />
      {blockedPatients ? (
        <p className="text-destructive text-sm" role="alert">
          Não é possível eliminar o estabelecimento enquanto existirem pacientes
          associados. Transfira ou elimine os pacientes primeiro.
        </p>
      ) : null}
      <Separator />
      <PatientsSection
        variant="establishment"
        clientId={clientId}
        establishmentId={row.id}
        establishmentName={row.name}
      />
      <Separator />
      <div>
        <h2 className="text-foreground text-sm font-medium">
          Zona de perigo
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Eliminar remove o estabelecimento. Pacientes ou visitas futuras
          deixarão de o referenciar.
        </p>
        <div className="mt-3">
          <DeleteEstablishmentButton
            establishmentId={row.id}
            clientId={clientId}
          />
        </div>
      </div>
    </div>
  );
}
