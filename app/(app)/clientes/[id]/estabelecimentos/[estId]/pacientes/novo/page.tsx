import Link from "next/link";
import { notFound } from "next/navigation";

import { PatientForm } from "@/components/pacientes/patient-form";
import { createClient } from "@/lib/supabase/server";
import type { EstablishmentRow } from "@/lib/types/establishments";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function NovoPacienteEstabelecimentoPage({
  params,
}: {
  params: Promise<{ id: string; estId: string }>;
}) {
  const { id: clientId, estId } = await params;
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
        href={`/clientes/${clientId}/estabelecimentos/${estId}/editar`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground hover:text-foreground -ml-2 h-auto px-2 py-1",
        )}
      >
        ← {row.name}
      </Link>
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Novo paciente
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {client.legal_name} ·{" "}
          <span className="text-foreground">{row.name}</span>
        </p>
      </div>
      <PatientForm
        mode="create"
        clientId={clientId}
        establishmentId={estId}
        defaults={{
          full_name: "",
          birth_date: "",
          document_id: "",
          sex: null,
          phone: "",
          email: "",
          notes: "",
        }}
      />
    </div>
  );
}
