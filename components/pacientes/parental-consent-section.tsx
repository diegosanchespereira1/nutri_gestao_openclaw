"use client";

import { useState } from "react";

import {
  recordParentalConsentAction,
  revokeParentalConsentAction,
} from "@/lib/actions/external-portal";
import type { PatientParentalConsent } from "@/lib/types/external-portal";
import {
  GUARDIAN_RELATIONSHIP_LABELS,
  LGPD_CONSENT_TEXT_TEMPLATE,
} from "@/lib/types/external-portal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon, ShieldXIcon, PlusIcon } from "lucide-react";

function formatDateTimeBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  patientId: string;
  consents: PatientParentalConsent[];
  consentErr?: string;
  consentOk?: string;
};

export function ParentalConsentSection({
  patientId,
  consents,
  consentErr,
  consentOk,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const errMessages: Record<string, string> = {
    invalid:
      "Preencha todos os campos obrigatórios e confirme o consentimento.",
    unauthorized: "Sem permissão para registar consentimento neste paciente.",
    save: "Não foi possível guardar. Tente novamente.",
  };

  const errorMsg = consentErr
    ? (errMessages[consentErr] ?? errMessages.save)
    : undefined;

  const activeConsent = consents.find((c) => !c.revoked_at);
  const revokedConsents = consents.filter((c) => c.revoked_at);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              Consentimento parental (LGPD Art. 14)
            </CardTitle>
            <CardDescription>
              Obrigatório para pacientes menores de idade. Regista o
              consentimento do responsável legal para tratamento de dados de
              saúde.
            </CardDescription>
          </div>
          {!activeConsent && !showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              Registar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {consentOk === "1" && (
          <p
            className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200"
            role="status"
          >
            Consentimento registado com sucesso.
          </p>
        )}

        {activeConsent ? (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-green-600" />
              <Badge
                variant="outline"
                className="border-green-500/50 text-green-700 dark:text-green-400"
              >
                Consentimento ativo
              </Badge>
            </div>
            <div className="text-sm space-y-0.5">
              <p>
                <span className="text-muted-foreground">Responsável: </span>
                <span className="text-foreground font-medium">
                  {activeConsent.guardian_full_name}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Relação: </span>
                <span className="text-foreground">
                  {GUARDIAN_RELATIONSHIP_LABELS[activeConsent.guardian_relationship]}
                </span>
              </p>
              {activeConsent.guardian_document_id && (
                <p>
                  <span className="text-muted-foreground">CPF/Doc: </span>
                  <span className="text-foreground">
                    {activeConsent.guardian_document_id}
                  </span>
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Coletado em {formatDateTimeBR(activeConsent.consented_at)}
              </p>
            </div>
            <details className="text-muted-foreground text-xs">
              <summary className="cursor-pointer select-none">
                Ver texto do consentimento
              </summary>
              <p className="mt-1 text-xs leading-relaxed">
                {activeConsent.consent_text}
              </p>
            </details>
            <form action={revokeParentalConsentAction}>
              <input type="hidden" name="consent_id" value={activeConsent.id} />
              <input type="hidden" name="patient_id" value={patientId} />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive mt-1"
              >
                <ShieldXIcon className="mr-1 h-3.5 w-3.5" />
                Revogar consentimento
              </Button>
            </form>
          </div>
        ) : !showForm ? (
          <div className="rounded-md border border-dashed p-4 text-center">
            <ShieldXIcon className="mx-auto mb-2 h-6 w-6 text-amber-500" />
            <p className="text-muted-foreground text-sm">
              Nenhum consentimento ativo para este paciente menor.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              LGPD Art. 14 exige consentimento do responsável legal.
            </p>
          </div>
        ) : null}

        {showForm && !activeConsent && (
          <div className="rounded-md border p-4 space-y-4">
            <p className="text-muted-foreground text-sm font-medium">
              Registar consentimento do responsável legal
            </p>
            {errorMsg && (
              <p className="text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
                {errorMsg}
              </p>
            )}
            <form
              action={async (fd) => {
                setPending(true);
                await recordParentalConsentAction(fd);
                setPending(false);
                setShowForm(false);
              }}
              className="space-y-3"
            >
              <input type="hidden" name="patient_id" value={patientId} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="guardian-full-name">
                    Nome completo do responsável *
                  </Label>
                  <Input
                    id="guardian-full-name"
                    name="guardian_full_name"
                    placeholder="Maria Silva"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guardian-doc">CPF / Documento</Label>
                  <Input
                    id="guardian-doc"
                    name="guardian_document_id"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guardian-relationship">Relação *</Label>
                  <Select name="guardian_relationship" defaultValue="parent">
                    <SelectTrigger id="guardian-relationship">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GUARDIAN_RELATIONSHIP_LABELS).map(
                        ([v, label]) => (
                          <SelectItem key={v} value={v}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guardian-email">E-mail do responsável</Label>
                  <Input
                    id="guardian-email"
                    name="guardian_email"
                    type="email"
                    placeholder="responsavel@email.com"
                  />
                </div>
              </div>

              {/* Consent text — shown to responsible */}
              <div className="rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                {LGPD_CONSENT_TEXT_TEMPLATE}
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="consent-confirmed"
                  name="consent_confirmed"
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(Boolean(v))}
                  required
                />
                <Label
                  htmlFor="consent-confirmed"
                  className="cursor-pointer text-sm leading-snug"
                >
                  Confirmo que o responsável legal leu e concordou com o texto
                  acima *
                </Label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={pending || !confirmed}
                >
                  {pending ? "A registar…" : "Registar consentimento"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setConfirmed(false);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {revokedConsents.length > 0 && (
          <details className="text-muted-foreground text-xs">
            <summary className="cursor-pointer select-none">
              {revokedConsents.length} consentimento(s) revogado(s)
            </summary>
            <ul className="mt-2 space-y-1">
              {revokedConsents.map((c) => (
                <li key={c.id}>
                  {c.guardian_full_name} — revogado em{" "}
                  {c.revoked_at ? formatDateTimeBR(c.revoked_at) : "—"}
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
