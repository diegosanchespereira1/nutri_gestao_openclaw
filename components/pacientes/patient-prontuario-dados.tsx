import { Building2, Lock, Phone, User } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PatientGeneralAssessmentCard } from "@/components/pacientes/patient-general-assessment-card";
import { PatientGeneralAssessmentIndicatorsSection } from "@/components/pacientes/patient-general-assessment-indicators-section";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { cn } from "@/lib/utils";

const SEX_LABEL: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Outro",
};

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
          <a href={href} className="break-all text-primary hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export type PatientProntuarioDadosProps = {
  patientId: string;
  birthDate: string | null;
  ageLabel: string | null;
  sex: string | null;
  documentId: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  client: {
    legal_name: string;
    trade_name: string | null;
  } | null;
  establishmentName: string | null;
  schoolGradeName: string | null;
  responsibleName: string | null;
};

export function PatientProntuarioDados({
  patientId,
  birthDate,
  ageLabel,
  sex,
  documentId,
  email,
  phone,
  notes,
  client,
  establishmentName,
  schoolGradeName,
  responsibleName,
}: PatientProntuarioDadosProps) {
  const birthSlice = birthDate ? String(birthDate).slice(0, 10) : null;

  return (
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
                value={`${formatDateBR(birthSlice)}${ageLabel ? `  (${ageLabel})` : ""}`}
              />
            ) : (
              <InfoRow label="Data de nascimento" value="Não informada" muted />
            )}
            <InfoRow
              label="Sexo"
              value={sex ? SEX_LABEL[sex] ?? sex : "Não informado"}
              muted={!sex}
            />
            {documentId ? (
              <InfoRow label="CPF" value={formatCpfDisplay(documentId)} mono />
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
            {email ? (
              <InfoRow label="Email" value={email} href={`mailto:${email}`} />
            ) : (
              <InfoRow label="Email" value="Não informado" muted />
            )}
            {phone ? (
              <InfoRow label="Telefone" value={phone} href={`tel:${phone}`} />
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
          <InfoRow label="Estabelecimento" value={establishmentName ?? "—"} />
          {schoolGradeName ? <InfoRow label="Série" value={schoolGradeName} /> : null}
          <InfoRow
            label="Profissional responsável"
            value={responsibleName ?? "—"}
          />
        </CardContent>
      </Card>

      <PatientGeneralAssessmentIndicatorsSection patientId={patientId} />

      {notes ? (
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
              <Lock className="size-3.5" aria-hidden />
              Notas clínicas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {notes}
            </p>
            <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <span aria-hidden>🔒</span>
              Dado clínico protegido por LGPD — não compartilhado sem consentimento.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <PatientGeneralAssessmentCard patientId={patientId} />
    </>
  );
}
