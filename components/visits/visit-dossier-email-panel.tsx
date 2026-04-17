"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import { resendDossierEmailAction } from "@/lib/actions/checklist-fill-dossier-email";
import {
  updateScheduledVisitDossierRecipientsFormAction,
  type UpdateDossierRecipientsState,
} from "@/lib/actions/visits";
import type { DossierEmailSendStatus } from "@/lib/types/visits";
import { MAX_DOSSIER_EMAIL_RECIPIENTS } from "@/lib/constants/dossier-email";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const textareaClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

function statusLabel(s: DossierEmailSendStatus | undefined): string {
  if (s === "sent") return "Enviado";
  if (s === "failed") return "Falhou";
  return "Ainda não enviado";
}

type Props = {
  visitId: string;
  initialEmailsText: string;
  sendStatus: DossierEmailSendStatus | undefined;
  lastError: string | null | undefined;
  sentAtLabel: string | null;
  hasApprovedDossier: boolean;
  resendConfigured: boolean;
};

export function VisitDossierEmailPanel({
  visitId,
  initialEmailsText,
  sendStatus,
  lastError,
  sentAtLabel,
  hasApprovedDossier,
  resendConfigured,
}: Props) {
  const router = useRouter();
  const [state, formAction, pendingSave] = useActionState<
    UpdateDossierRecipientsState | null,
    FormData
  >(updateScheduledVisitDossierRecipientsFormAction, null);

  const [resendPending, startResend] = useTransition();
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok === true) {
      router.refresh();
    }
  }, [state, router]);

  const effectiveStatus = sendStatus ?? "not_sent";
  const hasRecipients = initialEmailsText.trim().length > 0;
  const showSendButton =
    hasApprovedDossier && resendConfigured && hasRecipients;

  const sendButtonLabel =
    effectiveStatus === "not_sent"
      ? "Enviar dossiê por email"
      : "Reenviar dossiê por email";

  return (
    <section
      aria-labelledby="visit-dossier-email-heading"
      className="border-border space-y-4 rounded-lg border p-4"
    >
      <h2
        id="visit-dossier-email-heading"
        className="text-foreground text-sm font-medium"
      >
        Envio do dossiê por email
      </h2>

      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          Estado:{" "}
          <span className="text-foreground font-medium">
            {statusLabel(effectiveStatus)}
          </span>
        </span>
        {sentAtLabel ? (
          <span>
            Último envio com sucesso (registo):{" "}
            <span className="text-foreground">{sentAtLabel}</span>
          </span>
        ) : null}
      </div>

      {effectiveStatus === "failed" && lastError ? (
        <p className="text-destructive text-sm" role="status">
          {lastError}
        </p>
      ) : null}

      {!resendConfigured ? (
        <p className="text-muted-foreground text-xs">
          O envio automático por email requer variáveis{" "}
          <code className="text-foreground">RESEND_API_KEY</code> e remetente
          (<code className="text-foreground">DOSSIER_EMAIL_FROM</code> ou{" "}
          <code className="text-foreground">RESEND_FROM_EMAIL</code>) no
          servidor.
        </p>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="visit_id" value={visitId} />
        <div className="space-y-2">
          <Label htmlFor={`dossier-emails-${visitId}`}>
            Destinatários (até {MAX_DOSSIER_EMAIL_RECIPIENTS})
          </Label>
          <textarea
            id={`dossier-emails-${visitId}`}
            name="dossier_recipient_emails"
            rows={3}
            className={textareaClass}
            defaultValue={initialEmailsText}
            placeholder="email1@cliente.pt, email2@cliente.pt"
          />
        </div>
        {state?.ok === false ? (
          <p className="text-destructive text-sm" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok === true ? (
          <p className="text-muted-foreground text-sm" role="status">
            Destinatários guardados.
          </p>
        ) : null}
        <Button type="submit" disabled={pendingSave} size="sm">
          {pendingSave ? "Salvando…" : "Salvar destinatários"}
        </Button>
        <p className="text-muted-foreground text-xs">
          Se alterar os endereços, guarde antes de usar «{sendButtonLabel}».
        </p>
      </form>

      {showSendButton ? (
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={resendPending}
            onClick={() => {
              setResendMsg(null);
              startResend(async () => {
                const r = await resendDossierEmailAction(visitId);
                setResendMsg(r.ok ? "Email enviado." : r.error);
                if (r.ok) router.refresh();
              });
            }}
          >
            {resendPending ? "A enviar…" : sendButtonLabel}
          </Button>
          {resendMsg ? (
            <span
              className={
                resendMsg === "Email enviado."
                  ? "text-muted-foreground text-sm"
                  : "text-destructive text-sm"
              }
              role="status"
            >
              {resendMsg}
            </span>
          ) : null}
        </div>
      ) : null}

      {hasApprovedDossier && resendConfigured && !hasRecipients ? (
        <p className="text-muted-foreground text-xs">
          Adicione destinatários acima para poder reenviar o PDF do dossiê.
        </p>
      ) : null}
    </section>
  );
}
