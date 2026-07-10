import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Pencil, User, Phone, Building2, Lock, ClipboardList } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { ClientAvatar } from "@/components/clientes/client-avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { PatientGeneralAssessmentCard } from "@/components/pacientes/patient-general-assessment-card";
import { PatientGeneralAssessmentIndicatorsSection } from "@/components/pacientes/patient-general-assessment-indicators-section";
import { PatientAssessmentsBlock } from "@/components/pacientes/patient-assessments-block";
import { PatientProntuarioTabs } from "@/components/pacientes/patient-prontuario-tabs";
import { loadPatientById } from "@/lib/actions/patients";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { getPatientPhotoSignedUrl } from "@/lib/patients/patient-photo-urls";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const SEX_LABEL: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Outro",
};

function calcAgeYears(isoDate: string): number {
  const birth = new Date(isoDate);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
  return years;
}

function calcAge(isoDate: string): string {
  return `${calcAgeYears(isoDate)} anos`;
}

function formatDateBR(iso: string): string {
  const [y, mo, d] = iso.slice(0, 10).split("-");
  return `${d}/${mo}/${y}`;
}

function InfoRow({
  label,
  value,
  sub,
  href,
  mono = false,
  muted = false,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-sm", mono && "font-mono", muted && "text-muted-foreground")}>
        {href ? (
          <a href={href} className="text-primary hover:underline break-all">
            {value}
          </a>
        ) : (
          value
        )}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function ProntuarioPacientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { row } = await loadPatientById(id);
  if (!row) notFound();

  const supabase = await createClient();
  const birthSlice = row.birth_date ? String(row.birth_date).slice(0, 10) : null;
  const age = birthSlice ? calcAge(birthSlice) : null;

  const avaliacaoOk = sp.avaliacao === "ok";
  const avaliacaoTab = sp.tab === "avaliacao";

  const photoUrl = row.photo_storage_path
    ? await getPatientPhotoSignedUrl(supabase, row.photo_storage_path)
    : null;

  const [clientResult, estResult, teamMemberResult] = await Promise.all([
    row.client_id
      ? supabase
          .from("clients")
          .select("legal_name, trade_name, kind")
          .eq("id", row.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    row.establishment_id
      ? supabase
          .from("establishments")
          .select("name")
          .eq("id", row.establishment_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    row.responsible_team_member_id
      ? supabase
          .from("team_members")
          .select("full_name")
          .eq("id", row.responsible_team_member_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const client = clientResult.data as {
    legal_name: string;
    trade_name: string | null;
    kind: string;
  } | null;
  const establishment = estResult.data as { name: string } | null;
  const teamMember = teamMemberResult.data as { full_name: string } | null;

  const backHref =
    row.establishment_id && row.client_id
      ? `/clientes/${row.client_id}/estabelecimentos/${row.establishment_id}/pacientes`
      : row.client_id
        ? `/clientes/${row.client_id}/editar`
        : "/pacientes";

  const backLabel =
    row.establishment_id && row.client_id
      ? "Estabelecimento"
      : row.client_id
        ? "Cliente"
        : "Pacientes";

  const descriptionParts = [
    age,
    row.sex ? SEX_LABEL[row.sex] : null,
    client ? client.legal_name : "Paciente particular",
  ].filter(Boolean);

  return (
    <PageLayout variant="form">
      <PageHeader
        leading={
          <ClientAvatar
            name={row.full_name}
            imageUrl={photoUrl}
            size="lg"
            className="rounded-full"
          />
        }
        title={row.full_name}
        description={descriptionParts.join(" · ")}
        back={{ href: backHref, label: backLabel }}
        actions={
          <Link
            href={`/pacientes/${row.id}/editar`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <Pencil className="mr-1.5 size-3.5" aria-hidden />
            Editar dados
          </Link>
        }
      />

      {/* ── Banner de sucesso ────────────────────────────────── */}
      {avaliacaoOk ? (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-medium text-green-800">
            {avaliacaoTab
              ? "Avaliação especializada registrada com sucesso."
              : "Informações complementares registradas com sucesso."}
          </p>
        </div>
      ) : null}

      <Suspense fallback={null}>
        <PatientProntuarioTabs
        dadosTab={
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="border-b border-border pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                    <User className="size-3.5" aria-hidden />
                    Identificação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-3">
                  {birthSlice ? (
                    <InfoRow
                      label="Data de nascimento"
                      value={`${formatDateBR(birthSlice)}${age ? `  (${age})` : ""}`}
                    />
                  ) : (
                    <InfoRow label="Data de nascimento" value="Não informada" muted />
                  )}
                  <InfoRow
                    label="Sexo"
                    value={row.sex ? SEX_LABEL[row.sex] : "Não informado"}
                    muted={!row.sex}
                  />
                  {row.document_id ? (
                    <InfoRow label="CPF" value={formatCpfDisplay(row.document_id)} mono />
                  ) : (
                    <InfoRow label="CPF" value="Não informado" muted />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b border-border pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                    <Phone className="size-3.5" aria-hidden />
                    Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-3">
                  {row.email ? (
                    <InfoRow label="Email" value={row.email} href={`mailto:${row.email}`} />
                  ) : (
                    <InfoRow label="Email" value="Não informado" muted />
                  )}
                  {row.phone ? (
                    <InfoRow label="Telefone" value={row.phone} href={`tel:${row.phone}`} />
                  ) : (
                    <InfoRow label="Telefone" value="Não informado" muted />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                  <Building2 className="size-3.5" aria-hidden />
                  Associação
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-4 sm:grid-cols-3">
                <InfoRow
                  label="Cliente"
                  value={client?.legal_name ?? "Particular"}
                  sub={client?.trade_name ?? undefined}
                />
                <InfoRow
                  label="Estabelecimento"
                  value={establishment?.name ?? "—"}
                />
                <InfoRow
                  label="Profissional responsável"
                  value={teamMember?.full_name ?? "—"}
                />
              </CardContent>
            </Card>

            <PatientGeneralAssessmentIndicatorsSection patientId={row.id} />

            {row.notes ? (
              <Card>
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                    <Lock className="size-3.5" aria-hidden />
                    Notas clínicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {row.notes}
                  </p>
                  <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <span aria-hidden>🔒</span>
                    Dado clínico protegido por LGPD — não compartilhado sem consentimento.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <PatientGeneralAssessmentCard patientId={row.id} />
          </>
        }
        avaliacaoTab={
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
                <ClipboardList className="size-3.5" aria-hidden />
                Avaliações especializadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PatientAssessmentsBlock
                patientId={row.id}
                birthDate={row.birth_date}
              />
            </CardContent>
          </Card>
        }
        />
      </Suspense>
    </PageLayout>
  );
}
