"use client";

import { useActionState, useMemo, useState } from "react";

import {
  completeOnboardingAction,
  skipOnboardingDetailsAction,
  type CompleteOnboardingResult,
  type OnboardingWorkContext,
  type SkipOnboardingDetailsResult,
} from "@/lib/actions/onboarding";
import { filterTemplatesForEstablishment } from "@/lib/checklists/filter-templates";
import { ESTABLISHMENT_TYPES, establishmentTypeLabel } from "@/lib/constants/establishment-types";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { EstablishmentType } from "@/lib/types/establishments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const selectClassName =
  "border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

type Step = 1 | 2 | 3 | 4;

type Props = {
  templates: ChecklistTemplateWithSections[];
};

const workOptionCopy: Record<
  OnboardingWorkContext,
  { title: string; description: string }
> = {
  institutional: {
    title: "Contexto institucional",
    description:
      "Escolas, hospitais, empresas — visitas técnicas e portarias por UF.",
  },
  clinical: {
    title: "Contexto clínico",
    description:
      "Particulares e acompanhamento nutricional; sem foco imediato em inspeções.",
  },
  both: {
    title: "Institucional e clínico",
    description:
      "Quero gerir os dois contextos na mesma conta (começamos pelo lado institucional para portarias).",
  },
};

export function OnboardingWizard({ templates }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [workContext, setWorkContext] = useState<OnboardingWorkContext | null>(
    null,
  );

  const [legalName, setLegalName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [establishmentName, setEstablishmentName] = useState("");
  const [establishmentType, setEstablishmentType] =
    useState<EstablishmentType>("escola");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const needsEstablishment =
    workContext === "institutional" || workContext === "both";

  const suggestedTemplates = useMemo(() => {
    if (!needsEstablishment) return [];
    const uf = stateUf.trim().toUpperCase();
    if (uf.length !== 2) return [];
    return filterTemplatesForEstablishment(templates, {
      state: uf,
      establishment_type: establishmentType,
    });
  }, [templates, needsEstablishment, stateUf, establishmentType]);

  const [actionState, formAction, isPending] = useActionState<
    CompleteOnboardingResult | undefined,
    FormData
  >(completeOnboardingAction, undefined);

  const [skipState, skipFormAction, isSkipPending] = useActionState<
    SkipOnboardingDetailsResult | undefined,
    FormData
  >(skipOnboardingDetailsAction, undefined);

  function canAdvanceFromStep2(): boolean {
    if (!legalName.trim()) return false;
    if (!needsEstablishment) return true;
    return (
      establishmentName.trim().length > 0 &&
      addressLine1.trim().length > 0 &&
      stateUf.trim().length === 2
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-10 sm:max-w-xl sm:px-6">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-primary text-sm font-medium">
          Configuração inicial
        </p>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Bem-vindo ao NutriGestão
        </h1>
        <p className="text-muted-foreground text-sm">
          Quatro passos rápidos para alinharmos o contexto e o primeiro cliente.
        </p>
        <ol
          className="text-muted-foreground flex flex-wrap justify-center gap-3 text-xs sm:justify-start"
          aria-label="Progresso"
        >
          {([1, 2, 3, 4] as const).map((n) => (
            <li
              key={n}
              className={cn(
                "rounded-full px-2 py-0.5",
                step === n
                  ? "bg-primary/15 text-foreground font-medium"
                  : "opacity-70",
              )}
            >
              {n}/4
            </li>
          ))}
        </ol>
      </header>

      {actionState?.ok === false ? (
        <p className="text-destructive text-center text-sm sm:text-left" role="alert">
          {actionState.error}
        </p>
      ) : null}
      {skipState?.ok === false ? (
        <p className="text-destructive text-center text-sm sm:text-left" role="alert">
          {skipState.error}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-foreground text-sm font-medium">
            Como trabalhas na maior parte do tempo?
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
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!workContext}
              onClick={() => setStep(2)}
            >
              Continuar
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onb-legal-name">
                {needsEstablishment ? "Razão social (empresa)" : "Nome do cliente (particular)"}
              </Label>
              <Input
                id="onb-legal-name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                autoComplete="organization"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onb-doc">
                {needsEstablishment ? "CNPJ (opcional)" : "CPF (opcional)"}
              </Label>
              <Input
                id="onb-doc"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
          </div>

          {needsEstablishment ? (
            <div className="space-y-4 border-t pt-4">
              <p className="text-foreground text-sm font-medium">
                Primeiro estabelecimento
              </p>
              <div className="space-y-2">
                <Label htmlFor="onb-est-name">Nome da unidade</Label>
                <Input
                  id="onb-est-name"
                  value={establishmentName}
                  onChange={(e) => setEstablishmentName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onb-est-type">Tipo</Label>
                <select
                  id="onb-est-type"
                  className={selectClassName}
                  value={establishmentType}
                  onChange={(e) =>
                    setEstablishmentType(e.target.value as EstablishmentType)
                  }
                >
                  {ESTABLISHMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {establishmentTypeLabel[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onb-uf">UF (2 letras)</Label>
                <Input
                  id="onb-uf"
                  value={stateUf}
                  onChange={(e) =>
                    setStateUf(e.target.value.toUpperCase().slice(0, 2))
                  }
                  maxLength={2}
                  autoComplete="address-level1"
                  required
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onb-addr1">Morada — linha 1</Label>
                <Input
                  id="onb-addr1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onb-addr2">Morada — linha 2 (opcional)</Label>
                <Input
                  id="onb-addr2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onb-city">Cidade (opcional)</Label>
                <Input
                  id="onb-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onb-postal">Código postal (opcional)</Label>
                <Input
                  id="onb-postal"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <form action={skipFormAction} className="flex flex-col gap-2">
            <input type="hidden" name="work_context" value={workContext ?? ""} />
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="border-primary/70 bg-primary/8 hover:bg-primary/12 text-foreground w-full font-semibold shadow-sm"
              disabled={!workContext || isSkipPending || isPending}
            >
              {isSkipPending ? "A concluir…" : "Preencher depois — ir ao início"}
            </Button>
            <p className="text-muted-foreground text-center text-xs leading-relaxed sm:text-left">
              Sem obrigatoriedade neste passo — completa os dados do cliente em{" "}
              <span className="text-foreground font-medium">Clientes</span> quando
              quiseres.
            </p>
          </form>

          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button
              type="button"
              disabled={!canAdvanceFromStep2()}
              onClick={() => setStep(3)}
            >
              Continuar
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          {needsEstablishment ? (
            <>
              <p className="text-foreground text-sm font-medium">
                Portarias sugeridas para {stateUf.toUpperCase()} ·{" "}
                {establishmentTypeLabel[establishmentType]}
              </p>
              {suggestedTemplates.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Ainda não há template no catálogo para esta combinação. Podes
                  completar o setup e rever os checklists depois em{" "}
                  <span className="text-foreground font-medium">Checklists</span>.
                </p>
              ) : (
                <ul className="space-y-3" aria-label="Templates sugeridos">
                  {suggestedTemplates.map((t) => (
                    <li key={t.id}>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{t.name}</CardTitle>
                          <CardDescription>
                            {t.portaria_ref} · UF {t.uf}
                          </CardDescription>
                        </CardHeader>
                        {t.description ? (
                          <CardContent>
                            <p className="text-muted-foreground text-sm">
                              {t.description}
                            </p>
                          </CardContent>
                        ) : null}
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contexto clínico</CardTitle>
                <CardDescription>
                  As portarias do catálogo filtram-se por estabelecimento (cliente
                  PJ). Quando adicionares uma empresa com unidade e UF, verás as
                  sugestões em Checklists.
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-muted-foreground text-xs">
                No último passo, ao concluir, criamos o teu primeiro cliente PF.
              </CardFooter>
            </Card>
          )}
          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button type="button" onClick={() => setStep(4)}>
              Continuar
            </Button>
          </div>
        </div>
      ) : null}

      {step === 4 && workContext ? (
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="work_context" value={workContext} />
          <input type="hidden" name="legal_name" value={legalName} />
          <input type="hidden" name="document_id" value={documentId} />
          {needsEstablishment ? (
            <>
              <input type="hidden" name="establishment_name" value={establishmentName} />
              <input
                type="hidden"
                name="establishment_type"
                value={establishmentType}
              />
              <input type="hidden" name="address_line1" value={addressLine1} />
              <input type="hidden" name="address_line2" value={addressLine2} />
              <input type="hidden" name="city" value={city} />
              <input type="hidden" name="state" value={stateUf} />
              <input type="hidden" name="postal_code" value={postalCode} />
            </>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Concluir</CardTitle>
              <CardDescription>
                Gravamos o primeiro cliente e deixamos a conta pronta para
                agendar a primeira visita.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <p>
                <span className="text-foreground font-medium">Contexto: </span>
                {workOptionCopy[workContext].title}
              </p>
              <p>
                <span className="text-foreground font-medium">Cliente: </span>
                {legalName}
              </p>
              {needsEstablishment ? (
                <p>
                  <span className="text-foreground font-medium">
                    Estabelecimento:{" "}
                  </span>
                  {establishmentName} ({stateUf.toUpperCase()})
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(3)}
                disabled={isPending}
              >
                Voltar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando…" : "Concluir e ir ao início"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      ) : null}
    </div>
  );
}
