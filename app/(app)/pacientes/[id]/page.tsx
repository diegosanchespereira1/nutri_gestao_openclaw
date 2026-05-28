import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Clock, User, Phone, Building2, Lock, ClipboardList } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadPatientById } from "@/lib/actions/patients";
import { loadNutritionAssessmentsForPatient } from "@/lib/actions/nutrition-assessments";
import { createClient } from "@/lib/supabase/server";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { cn } from "@/lib/utils";

const SEX_LABEL: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Outro",
};

function calcAge(isoDate: string): string {
  const birth = new Date(isoDate);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
  return `${years} anos`;
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { row } = await loadPatientById(id);
  if (!row) notFound();

  const supabase = await createClient();
  const birthSlice = row.birth_date ? String(row.birth_date).slice(0, 10) : null;
  const age = birthSlice ? calcAge(birthSlice) : null;

  const [clientResult, estResult, teamMemberResult, { rows: assessments }] =
    await Promise.all([
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
      loadNutritionAssessmentsForPatient(id),
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
    client ? client.legal_name : "Paciente independente",
  ].filter(Boolean);

  return (
    <PageLayout variant="form">
      <PageHeader
        title={row.full_name}
        description={descriptionParts.join(" · ")}
        back={{ href: backHref, label: backLabel }}
        actions={
          <>
            <Link
              href={`/pacientes/${row.id}/historico`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Clock className="mr-1.5 size-3.5" aria-hidden />
              Histórico
            </Link>
            <Link
              href={`/pacientes/${row.id}/editar`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <Pencil className="mr-1.5 size-3.5" aria-hidden />
              Editar dados
            </Link>
          </>
        }
      />

      {/* ── Identificação + Contacto ─────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <User className="size-3.5" aria-hidden />
              Identificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
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
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Phone className="size-3.5" aria-hidden />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
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

      {/* ── Associação ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Building2 className="size-3.5" aria-hidden />
            Associação
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-3">
          <InfoRow
            label="Cliente"
            value={client?.legal_name ?? "—"}
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

      {/* ── Notas clínicas (só se preenchido) ───────────────── */}
      {row.notes ? (
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Lock className="size-3.5" aria-hidden />
              Notas clínicas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {row.notes}
            </p>
            <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <span aria-hidden>🔒</span>
              Dado clínico protegido por LGPD — não partilhado sem consentimento.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Avaliações nutricionais ──────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4" aria-hidden />
              Avaliações nutricionais
            </CardTitle>
            <Link
              href={`/pacientes/${row.id}/historico`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Ver histórico completo
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {assessments.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma avaliação registada ainda.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                As avaliações são lançadas na{" "}
                <Link
                  href={`/pacientes/${row.id}/editar`}
                  className="text-primary hover:underline"
                >
                  página de edição do paciente
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border" aria-label="Últimas avaliações">
                {assessments.slice(0, 5).map((a) => {
                  const bmi =
                    a.weight_kg && a.height_cm
                      ? (
                          Number(a.weight_kg) /
                          (Number(a.height_cm) / 100) ** 2
                        ).toFixed(1)
                      : null;

                  const metrics = [
                    a.weight_kg ? `${Number(a.weight_kg).toFixed(1)} kg` : null,
                    a.height_cm ? `${Number(a.height_cm).toFixed(0)} cm` : null,
                    a.waist_cm ? `Cintura ${Number(a.waist_cm).toFixed(0)} cm` : null,
                    bmi ? `IMC ${bmi}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <li key={a.id} className="py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {new Date(a.recorded_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        {metrics && (
                          <span className="text-xs text-muted-foreground">
                            {metrics}
                          </span>
                        )}
                      </div>
                      {(a.clinical_notes || a.goals || a.diet_notes) && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {a.clinical_notes ?? a.goals ?? a.diet_notes}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              {assessments.length > 5 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  +{assessments.length - 5} avaliações anteriores —{" "}
                  <Link
                    href={`/pacientes/${row.id}/historico`}
                    className="text-primary hover:underline"
                  >
                    ver histórico completo
                  </Link>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
