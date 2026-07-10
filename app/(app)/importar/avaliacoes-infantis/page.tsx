// Página de importação em massa de avaliações nutricionais infantis — Server Component
// com guarda de autenticação. Mesmo padrão de app/(app)/importar/page.tsx (Story 2.6).
// Busca clientes + estabelecimentos do tenant para o wizard oferecer dropdowns em vez
// de pedir UUID ao usuário final.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerContext } from "@/lib/supabase/get-server-user";
import { ChildAssessmentImportWizard } from "@/components/importar/child-assessment-import-wizard";
import { matchChildKey } from "@/lib/import/child-assessment-match";
import { loadGradesForClients } from "@/lib/actions/school-grades";

export const metadata = {
  title: "Importar avaliações infantis | NutriGestão",
};

export default async function ImportarAvaliacoesInfantisPage() {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) redirect("/login");

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, legal_name, trade_name, kind")
    .eq("owner_user_id", workspaceOwnerId)
    .order("legal_name");

  const clients = (clientRows ?? []).map((c) => ({
    id: c.id as string,
    legal_name: c.legal_name as string,
    trade_name: c.trade_name as string | null,
  }));

  const clientIds = clients.map((c) => c.id);
  const establishmentsByClient: Record<string, { id: string; name: string }[]> = {};

  if (clientIds.length > 0) {
    const { data: estRows } = await supabase
      .from("establishments")
      .select("id, name, client_id")
      .in("client_id", clientIds)
      .order("name");

    for (const est of estRows ?? []) {
      const cid = est.client_id as string;
      if (!establishmentsByClient[cid]) establishmentsByClient[cid] = [];
      establishmentsByClient[cid].push({ id: est.id as string, name: est.name as string });
    }
  }

  const schoolGradesByClient = await loadGradesForClients(clientIds);

  // Datas de avaliação já registradas por paciente existente (nome + nascimento) —
  // usado na pré-visualização para bloquear reenvio da mesma pesagem sem criar nada.
  const { data: patientRows } = await supabase
    .from("patients")
    .select("id, full_name, birth_date")
    .eq("user_id", workspaceOwnerId);

  const patients = (patientRows ?? []).filter(
    (p): p is { id: string; full_name: string; birth_date: string } =>
      Boolean(p.full_name) && Boolean(p.birth_date),
  );

  const existingAssessmentDates: Record<string, string[]> = {};

  if (patients.length > 0) {
    const { data: assessmentRows } = await supabase
      .from("patient_child_assessments")
      .select("patient_id, recorded_at")
      .in(
        "patient_id",
        patients.map((p) => p.id),
      );

    const datesByPatientId = new Map<string, string[]>();
    for (const a of assessmentRows ?? []) {
      const dateOnly = String(a.recorded_at).slice(0, 10);
      const pid = a.patient_id as string;
      const list = datesByPatientId.get(pid) ?? [];
      list.push(dateOnly);
      datesByPatientId.set(pid, list);
    }

    for (const p of patients) {
      const dates = datesByPatientId.get(p.id);
      if (dates && dates.length > 0) {
        existingAssessmentDates[matchChildKey(p.full_name, p.birth_date)] = dates;
      }
    }
  }

  return (
    <main className="container max-w-4xl space-y-6 py-8">
      <div className="space-y-1">
        <Link href="/importar" className="text-muted-foreground text-xs hover:underline">
          ← Importar dados
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Importar avaliações infantis
        </h1>
        <p className="text-muted-foreground text-sm">
          Migre pesagens de uma turma inteira (ex.: avaliação nutricional escolar) a
          partir de um arquivo CSV ou Excel — o cadastro do paciente e a avaliação são
          criados juntos.
        </p>
      </div>

      <ChildAssessmentImportWizard
        clients={clients}
        establishmentsByClient={establishmentsByClient}
        schoolGradesByClient={schoolGradesByClient}
        existingAssessmentDates={existingAssessmentDates}
      />
    </main>
  );
}
