// Página de importação em massa de avaliações nutricionais infantis — Server Component
// com guarda de autenticação. Mesmo padrão de app/(app)/importar/page.tsx (Story 2.6).
// Busca clientes + estabelecimentos do tenant para o wizard oferecer dropdowns em vez
// de pedir UUID ao usuário final.

import Link from "next/link";
import { labelForEstablishmentType } from "@/lib/constants/establishment-types";
import { redirect } from "next/navigation";

import { getServerContext } from "@/lib/supabase/get-server-user";
import { ChildAssessmentImportWizard } from "@/components/importar/child-assessment-import-wizard";
import {
  matchChildKey,
  type ChildPatientMatchCandidate,
} from "@/lib/import/child-assessment-match";
import { loadGradesForClients } from "@/lib/actions/school-grades";
import { loadTenantLimits, countTenantUsage, remainingSlots } from "@/lib/limits/tenant-limits";

export const metadata = {
  title: "Importar avaliações infantis | NutriGestão",
};

export default async function ImportarAvaliacoesInfantisPage() {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) redirect("/login");

  // As 4 consultas abaixo são independentes entre si — rodar em paralelo evita
  // uma fila de round-trips sequenciais ao Postgres. Antes disso, esta página
  // fazia ~6 idas e voltas em série (clientes → estabelecimentos → séries →
  // pacientes → avaliações → limites → uso), o suficiente para passar dos
  // 150ms de tolerância do overlay de navegação (components/app-main-content.tsx)
  // e piscar a tela de carregamento em toda navegação até aqui.
  const [
    { data: clientRows },
    { data: patientRows },
    tenantLimits,
    patientsUsed,
    { data: customTypeRows },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, legal_name, trade_name, kind")
      .eq("owner_user_id", workspaceOwnerId)
      .order("legal_name"),
    // Pacientes do tenant (nome + nascimento + vínculo) — usado na pré-visualização
    // para mostrar se cada linha vai casar com um paciente já cadastrado (e alertar
    // sobre possível duplicidade / vínculo cruzado) antes de confirmar a importação.
    // Ver docs/plano-preview-casamento-importacao-infantil.md.
    supabase
      .from("patients")
      .select("id, full_name, birth_date, client_id, establishment_id")
      .eq("user_id", workspaceOwnerId),
    // Vagas de pacientes restantes no plano do tenant — pré-checagem de UX (a
    // garantia continua sendo o trigger no banco). null = sem limite configurado.
    // Ver docs/plano-mensagens-limite-importacao-infantil.md.
    loadTenantLimits(supabase, workspaceOwnerId),
    countTenantUsage(supabase, workspaceOwnerId, "patients"),
    // Tipos de estabelecimento personalizados do workspace — só para rotular o
    // filtro por tipo no wizard (os built-in têm label em lib/constants).
    supabase
      .from("establishment_custom_types")
      .select("slug, label")
      .eq("owner_user_id", workspaceOwnerId),
  ]);

  const clients = (clientRows ?? []).map((c) => ({
    id: c.id as string,
    legal_name: c.legal_name as string,
    trade_name: c.trade_name as string | null,
    kind: c.kind as "pf" | "pj",
  }));
  const clientIds = clients.map((c) => c.id);

  const patients = (patientRows ?? []).filter(
    (
      p,
    ): p is {
      id: string;
      full_name: string;
      birth_date: string;
      client_id: string | null;
      establishment_id: string | null;
    } => Boolean(p.full_name) && Boolean(p.birth_date),
  );
  const patientIds = patients.map((p) => p.id);

  const patientsForMatch: ChildPatientMatchCandidate[] = patients.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    birth_date: p.birth_date,
    client_id: p.client_id,
    establishment_id: p.establishment_id,
  }));

  const remainingPatientSlots = remainingSlots("patients", tenantLimits, patientsUsed);

  // Segunda rodada: cada consulta depende de dados da primeira (clientIds ou
  // patientIds), mas são independentes ENTRE SI — também rodam em paralelo.
  const [{ data: estRows }, schoolGradesByClient, { data: assessmentRows }] = await Promise.all([
    clientIds.length > 0
      ? supabase
          .from("establishments")
          .select("id, name, client_id, establishment_type")
          .in("client_id", clientIds)
          .order("name")
      : Promise.resolve({
          data: [] as {
            id: string;
            name: string;
            client_id: string;
            establishment_type: string;
          }[],
        }),
    loadGradesForClients(clientIds),
    patientIds.length > 0
      ? supabase
          .from("patient_child_assessments")
          .select("patient_id, recorded_at")
          .in("patient_id", patientIds)
      : Promise.resolve({
          data: [] as { patient_id: string; recorded_at: string }[],
        }),
  ]);

  const establishmentsByClient: Record<
    string,
    { id: string; name: string; establishment_type: string }[]
  > = {};
  const typeSlugsInUse = new Set<string>();
  for (const est of estRows ?? []) {
    const cid = est.client_id as string;
    const establishment_type = String(est.establishment_type ?? "");
    if (!establishmentsByClient[cid]) establishmentsByClient[cid] = [];
    establishmentsByClient[cid].push({
      id: est.id as string,
      name: est.name as string,
      establishment_type,
    });
    if (establishment_type) typeSlugsInUse.add(establishment_type);
  }

  // Opções do filtro "Filtrar por tipo de cliente": só os tipos que realmente existem
  // entre os estabelecimentos do tenant (um filtro com tipos sem nenhum cliente
  // só geraria listas vazias). Labels: built-in via constantes, custom via tabela.
  const customTypes = (customTypeRows ?? []).map((t) => ({
    slug: String(t.slug),
    label: String(t.label),
  }));
  const establishmentTypeOptions = [...typeSlugsInUse]
    .map((slug) => ({
      value: slug,
      label: labelForEstablishmentType(slug, customTypes),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  // Datas de avaliação já registradas por paciente existente (nome + nascimento) —
  // usado na pré-visualização para bloquear reenvio da mesma pesagem sem criar nada.
  const existingAssessmentDates: Record<string, string[]> = {};
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

  return (
    <main className="container max-w-4xl space-y-6 py-8">
      <div className="space-y-1">
        <Link href="/importar" className="text-muted-foreground text-xs hover:underline">
          ← Importar dados
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Importar avaliações infantis</h1>
        <p className="text-muted-foreground text-sm">
          Migre pesagens de uma turma inteira (ex.: avaliação nutricional escolar) a partir de um
          arquivo CSV ou Excel — o cadastro do paciente e a avaliação são criados juntos.
        </p>
      </div>

      <ChildAssessmentImportWizard
        clients={clients}
        establishmentsByClient={establishmentsByClient}
        establishmentTypeOptions={establishmentTypeOptions}
        schoolGradesByClient={schoolGradesByClient}
        existingAssessmentDates={existingAssessmentDates}
        patients={patientsForMatch}
        remainingPatientSlots={remainingPatientSlots}
      />
    </main>
  );
}
