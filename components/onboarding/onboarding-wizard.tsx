"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  skipOnboardingDetailsAction,
  type OnboardingWorkContext,
  type SkipOnboardingDetailsResult,
} from "@/lib/actions/onboarding";
import type { OnboardingInitialValues } from "@/lib/onboarding/initial-values";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TenantDocumentFields } from "@/components/tenant/tenant-document-fields";
import {
  parseTenantDocument,
  type TenantDocumentKind,
} from "@/lib/tenant/tenant-document";
import { cn } from "@/lib/utils";

const sectionLegendClass =
  "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

type Step = 1 | 2;

const STEP_LABELS: Record<Step, string> = {
  1: "Sua empresa",
  2: "Concluir",
};

type Props = {
  initialValues: OnboardingInitialValues;
};

const workOptionCopy: Record<
  OnboardingWorkContext,
  { title: string; description: string }
> = {
  institutional: {
    title: "Assessoria Nutricional",
    description:
      "Escolas, hospitais, empresas — visitas técnicas, checklists e POP's.",
  },
  clinical: {
    title: "Atendimento Nutricional",
    description:
      "Particulares e acompanhamento nutricional; sem foco imediato em inspeções.",
  },
  both: {
    title: "Ambos (Assessoria Nutricional e Atendimento Nutricional)",
    description: "Quero gerenciar os dois contextos na mesma conta.",
  },
};

const institutionalNextSteps = [
  "Explorar o painel inicial",
  "Cadastrar seu primeiro cliente",
  "Agendar a primeira visita técnica",
] as const;

const clinicalNextSteps = [
  "Explorar o painel inicial",
  "Cadastrar seu primeiro cliente",
  "Registrar consultas e acompanhamentos",
] as const;

export function OnboardingWizard({ initialValues }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [tenantCompanyName, setTenantCompanyName] = useState(
    initialValues.tenantCompanyName,
  );
  const [crn, setCrn] = useState(initialValues.crn);
  const [tenantDocumentKind, setTenantDocumentKind] = useState<
    TenantDocumentKind | ""
  >(initialValues.tenantDocumentKind);
  const [tenantDocument, setTenantDocument] = useState(
    initialValues.tenantDocument,
  );
  const [workContext, setWorkContext] = useState<OnboardingWorkContext | null>(
    initialValues.suggestedWorkContext,
  );

  const [skipState, skipFormAction, isSkipPending] = useActionState<
    SkipOnboardingDetailsResult | undefined,
    FormData
  >(skipOnboardingDetailsAction, undefined);

  function tenantDocumentError(): string | null {
    if (!initialValues.askTenantDocument) return null;
    const parsed = parseTenantDocument(tenantDocumentKind, tenantDocument, {
      required: true,
    });
    return parsed.ok ? null : parsed.error;
  }

  function canAdvanceFromStep1(): boolean {
    return (
      tenantCompanyName.trim().length > 0 &&
      workContext !== null &&
      tenantDocumentError() === null
    );
  }

  const nextSteps =
    workContext === "clinical" ? clinicalNextSteps : institutionalNextSteps;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
      <div className="w-full min-w-0 space-y-8">
        <header className="w-full space-y-3 text-left">
          <p className="text-primary text-sm font-medium">
            Configuração inicial
          </p>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Bem-vindo ao NutriGestão
          </h1>
          <p className="text-muted-foreground text-sm">
            Dois passos rápidos para configurar os dados da sua empresa e o
            contexto de trabalho. O cadastro de clientes fica para depois, em{" "}
            <span className="text-foreground font-medium">Clientes</span>.
          </p>
          <ol
            className="text-muted-foreground flex w-full flex-wrap justify-start gap-2 text-xs"
            aria-label="Progresso"
          >
            {([1, 2] as const).map((n) => (
              <li
                key={n}
                className={cn(
                  "rounded-full px-2.5 py-0.5",
                  step === n
                    ? "bg-primary/15 text-foreground font-medium"
                    : "opacity-70",
                )}
              >
                {step === n ? `${n}. ${STEP_LABELS[n]}` : `${n}/2`}
              </li>
            ))}
          </ol>
        </header>

        {skipState?.ok === false ? (
          <p className="text-destructive w-full text-sm" role="alert">
            {skipState.error}
          </p>
        ) : null}

        {step === 1 ? (
          <div className="w-full min-w-0 space-y-6">
            <div className="space-y-1">
              <p className="text-foreground text-sm font-medium">
                Passo 1 — Sua empresa ou consultório
              </p>
              <p className="text-muted-foreground text-sm">
                Estes dados identificam o seu negócio no NutriGestão (PDFs,
                e-mails e comunicações).
              </p>
            </div>

            <fieldset className="min-w-0 space-y-4 border-0 p-0">
              <legend className={sectionLegendClass}>Dados da sua empresa</legend>
              <div className="space-y-2">
                <Label htmlFor="onb-tenant-name">
                  Nome da empresa ou consultório
                </Label>
                <Input
                  id="onb-tenant-name"
                  value={tenantCompanyName}
                  onChange={(e) => setTenantCompanyName(e.target.value)}
                  autoComplete="organization"
                  placeholder="Ex.: Clínica NutriVida"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onb-crn">
                  CRN{" "}
                  <span className="text-muted-foreground font-normal">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="onb-crn"
                  value={crn}
                  onChange={(e) => setCrn(e.target.value)}
                  autoComplete="off"
                  placeholder="Ex.: CRN-3 12345"
                />
              </div>

              {initialValues.askTenantDocument ||
              initialValues.tenantDocumentLocked ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TenantDocumentFields
                    idPrefix="onb-tenant"
                    kind={tenantDocumentKind}
                    document={tenantDocument}
                    onKindChange={setTenantDocumentKind}
                    onDocumentChange={setTenantDocument}
                    disabled={initialValues.tenantDocumentLocked}
                    required={initialValues.askTenantDocument}
                    helpText={
                      initialValues.tenantDocumentLocked
                        ? "Documento já registado na sua conta. Para alterar, fale com o suporte."
                        : "CPF se você atende como autônomo, CNPJ se tem empresa. É o documento da sua conta — não do cliente."
                    }
                  />
                </div>
              ) : null}
            </fieldset>

            <div className="border-border border-t" />

            <div className="space-y-4">
              <p className="text-foreground text-sm font-medium">
                Como você trabalha na maior parte do tempo?
              </p>
              <div className="grid gap-3">
                {(Object.keys(workOptionCopy) as OnboardingWorkContext[]).map(
                  (key) => {
                    const opt = workOptionCopy[key];
                    const selected = workContext === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setWorkContext(key)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-colors",
                          "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40",
                        )}
                      >
                        <span className="text-foreground block font-medium">
                          {opt.title}
                        </span>
                        <span className="text-muted-foreground mt-1 block text-sm">
                          {opt.description}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
            {tenantDocumentError() && tenantDocument.trim().length > 0 ? (
              <p className="text-destructive text-sm" role="alert">
                {tenantDocumentError()}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!canAdvanceFromStep1()}
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 && workContext ? (
          <form
            action={skipFormAction}
            onReset={(e) => e.preventDefault()}
            className="w-full min-w-0 space-y-6"
          >
            <input type="hidden" name="work_context" value={workContext} />
            <input type="hidden" name="tenant_name" value={tenantCompanyName} />
            <input type="hidden" name="crn" value={crn} />
            <input
              type="hidden"
              name="tenant_document_kind"
              value={tenantDocumentKind}
            />
            <input
              type="hidden"
              name="tenant_document_id"
              value={tenantDocument}
            />

            <Card className="w-full">
              <CardHeader className="space-y-4 pb-2">
                <div className="flex items-start gap-3">
                  <div
                    className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full"
                    aria-hidden
                  >
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-lg">
                      Tudo pronto para começar
                    </CardTitle>
                    <p className="text-foreground text-sm leading-relaxed">
                      Ao confirmar, sua conta será ativada com os dados da sua
                      empresa. Você cadastra clientes quando quiser, em{" "}
                      <span className="font-medium">Clientes</span>.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="border-border bg-muted/40 rounded-lg border p-4">
                  <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
                    Será ativado com
                  </p>
                  <dl className="mt-3 space-y-3">
                    <div>
                      <dt className="text-muted-foreground text-xs">Empresa</dt>
                      <dd className="text-foreground mt-0.5 text-sm font-medium">
                        {tenantCompanyName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Contexto de trabalho
                      </dt>
                      <dd className="text-foreground mt-0.5 text-sm font-medium">
                        {workOptionCopy[workContext].title}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="border-border border-t pt-5">
                  <p className="text-foreground text-sm font-semibold">
                    O que vem a seguir
                  </p>
                  <ol className="mt-3 space-y-2.5" aria-label="Próximos passos">
                    {nextSteps.map((item, index) => (
                      <li key={item} className="flex items-start gap-3">
                        <span
                          className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                          aria-hidden
                        >
                          {index + 1}
                        </span>
                        <span className="text-foreground pt-0.5 text-sm leading-snug">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isSkipPending}
                >
                  Voltar
                </Button>
                <Button type="submit" disabled={isSkipPending}>
                  {isSkipPending
                    ? "Ativando sua conta…"
                    : "Começar a usar o NutriGestão"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        ) : null}
      </div>
    </div>
  );
}
