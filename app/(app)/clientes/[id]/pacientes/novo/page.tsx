import Link from "next/link";
import { notFound } from "next/navigation";

import { PatientForm } from "@/components/pacientes/patient-form";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function NovoPacienteClientePfPage({
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

  if (!client || client.kind !== "pf") {
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
          Novo paciente
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cliente particular:{" "}
          <span className="text-foreground">{client.legal_name}</span>
        </p>
      </div>
      <PatientForm
        mode="create"
        clientId={clientId}
        establishmentId={null}
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
