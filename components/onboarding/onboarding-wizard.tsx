"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  completeOnboardingAction,
  skipOnboardingDetailsAction,
  type CompleteOnboardingResult,
  type OnboardingWorkContext,
  type SkipOnboardingDetailsResult,
} from "@/lib/actions/onboarding";
import { filterTemplatesForEstablishment } from "@/lib/checklists/filter-templates";
import { lookupCepByViaCep } from "@/lib/cep/viacep";
import {
  categoryFromType,
  establishmentTypeLabel,
} from "@/lib/constants/establishment-types";
import { EstablishmentCategorySelect } from "@/components/clientes/establishment-category-select";
import { EstablishmentTypeSelect } from "@/components/clientes/establishment-type-select";
import { BrazilUfSelect } from "@/components/forms/brazil-uf-select";
import { cepDigits, formatCepInput } from "@/lib/format/cep";
import { formatEstablishmentAddressLines } from "@/lib/format/establishment-address";
import { buildOnboardingSummaryItems } from "@/lib/onboarding/summary";
import type { OnboardingInitialValues } from "@/lib/onboarding/initial-values";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import type { EstablishmentCategory, EstablishmentType } from "@/lib/types/establishments";
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

const sectionLegendClass =
  "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
  1: "Sua empresa",
  2: "Primeiro cliente",
  3: "Portarias",
  4: "Revisão",
  5: "Concluir",
};

type Props = {
  templates: ChecklistTemplateWithSections[];
  initialValues: OnboardingInitialValues;
};

const workOptionCopy: Record<
  OnboardingWorkContext,
  { title: string; description: string }
> = {
  institutional: {
    title: "Assessoria Alimentar",
    description:
      "Escolas, hospitais, empresas — visitas técnicas, checklists e POP's.",
  },
  clinical: {
    title: "Atendimento Nutricional",
    description:
      "Particulares e acompanhamento nutricional; sem foco imediato em inspeções.",
  },
  both: {
    title: "Ambos (Assessoria Alimentar e Atendimento Nutricional)",
    description:
      "Quero gerenciar os dois contextos na mesma conta (começamos pelo lado institucional para portarias).",
  },
};

const institutionalNextSteps = [
  "Explorar o painel inicial",
  "Agendar a primeira visita técnica",
  "Consultar checklists e portarias sugeridas",
] as const;

const clinicalNextSteps = [
  "Explorar o painel inicial",
  "Complementar o cadastro do cliente",
  "Registrar consultas e acompanhamentos",
] as const;

function OnboardingSummaryList({
  items,
}: {
  items: ReturnType<typeof buildOnboardingSummaryItems>;
}) {
  return (
    <dl className="text-muted-foreground space-y-3 text-sm">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-foreground font-medium">{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function OnboardingFinishPanel({
  needsEstablishment,
  legalName,
  establishmentName,
  nextSteps,
  isPending,
  onBack,
}: {
  needsEstablishment: boolean;
  legalName: string;
  establishmentName: string;
  nextSteps: readonly string[];
  isPending: boolean;
  onBack: () => void;
}) {
  return (
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
            <CardTitle className="text-lg">Tudo pronto para começar</CardTitle>
            <p className="text-foreground text-sm leading-relaxed">
              Bem-vindo(a) ao NutriGestão! Ao confirmar, sua conta será ativada
              com os dados do seu primeiro cliente.
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
              <dt className="text-muted-foreground text-xs">Cliente</dt>
              <dd className="text-foreground mt-0.5 text-sm font-medium">
                {legalName}
              </dd>
            </div>
            {needsEstablishment ? (
              <div>
                <dt className="text-muted-foreground text-xs">Unidade</dt>
                <dd className="text-foreground mt-0.5 text-sm font-medium">
                  {establishmentName}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Você poderá editar ou complementar esses dados a qualquer momento em{" "}
          <span className="text-foreground font-medium">Clientes</span>.
        </p>
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
          onClick={onBack}
          disabled={isPending}
        >
          Voltar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Ativando sua conta…" : "Começar a usar o NutriGestão"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function OnboardingHiddenFields({
  workContext,
  tenantCompanyName,
  crn,
  legalName,
  documentId,
  needsEstablishment,
  establishmentName,
  establishmentType,
  addressLine1,
  addressLine2,
  city,
  stateUf,
  postalCode,
}: {
  workContext: OnboardingWorkContext;
  tenantCompanyName: string;
  crn: string;
  legalName: string;
  documentId: string;
  needsEstablishment: boolean;
  establishmentName: string;
  establishmentType: EstablishmentType | "";
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateUf: string;
  postalCode: string;
}) {
  return (
    <>
      <input type="hidden" name="work_context" value={workContext} />
      <input type="hidden" name="tenant_name" value={tenantCompanyName} />
      <input type="hidden" name="crn" value={crn} />
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
    </>
  );
}

export function OnboardingWizard({ templates, initialValues }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [tenantCompanyName, setTenantCompanyName] = useState(
    initialValues.tenantCompanyName,
  );
  const [crn, setCrn] = useState(initialValues.crn);
  const [workContext, setWorkContext] = useState<OnboardingWorkContext | null>(
    initialValues.suggestedWorkContext,
  );

  const [legalName, setLegalName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [establishmentName, setEstablishmentName] = useState("");
  const [establishmentCategory, setEstablishmentCategory] =
    useState<EstablishmentCategory | "">(categoryFromType("escola"));
  const [establishmentType, setEstablishmentType] =
    useState<EstablishmentType | "">("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const lastFetchedCep = useRef<string | null>(null);

  const needsEstablishment =
    workContext === "institutional" || workContext === "both";

  useEffect(() => {
    if (!needsEstablishment) return;

    const digits = cepDigits(postalCode);
    if (digits.length !== 8) {
      setCepError(null);
      setCepLoading(false);
      lastFetchedCep.current = null;
      return;
    }

    if (lastFetchedCep.current === digits) return;

    let cancelled = false;
    setCepLoading(true);
    setCepError(null);

    lookupCepByViaCep(digits).then((result) => {
      if (cancelled) return;
      setCepLoading(false);
      lastFetchedCep.current = digits;

      if (!result) {
        setCepError("CEP não encontrado. Verifique e tente novamente.");
        return;
      }

      if (result.logradouro) setAddressStreet(result.logradouro);
      if (result.bairro) setNeighborhood(result.bairro);
      if (result.complemento) setAddressComplement(result.complemento);
      if (result.localidade) setCity(result.localidade);
      if (result.uf) setStateUf(result.uf);
    });

    return () => {
      cancelled = true;
    };
  }, [postalCode, needsEstablishment]);

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

  function canAdvanceFromStep1(): boolean {
    return tenantCompanyName.trim().length > 0 && workContext !== null;
  }

  function canAdvanceFromStep2(): boolean {
    if (!legalName.trim()) return false;
    if (!needsEstablishment) return true;
    return (
      establishmentName.trim().length > 0 &&
      establishmentType !== "" &&
      addressStreet.trim().length > 0 &&
      stateUf.trim().length === 2
    );
  }

  const formattedAddress = useMemo(
    () =>
      formatEstablishmentAddressLines({
        street: addressStreet,
        number: addressNumber,
        complement: addressComplement,
        neighborhood,
      }),
    [addressStreet, addressNumber, addressComplement, neighborhood],
  );

  const summaryItems = useMemo(() => {
    if (!workContext) return [];
    return buildOnboardingSummaryItems({
      tenantCompanyName,
      crn,
      workContext,
      workContextLabel: workOptionCopy[workContext].title,
      legalName,
      documentId,
      needsEstablishment,
      establishmentName,
      establishmentType,
      postalCode,
      addressStreet,
      addressNumber,
      addressComplement,
      neighborhood,
      city,
      stateUf,
    });
  }, [
    workContext,
    tenantCompanyName,
    crn,
    legalName,
    documentId,
    needsEstablishment,
    establishmentName,
    establishmentType,
    postalCode,
    addressStreet,
    addressNumber,
    addressComplement,
    neighborhood,
    city,
    stateUf,
  ]);

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
          Cinco passos rápidos: primeiro os dados da sua empresa, depois o
          cadastro do seu primeiro cliente na carteira.
        </p>
        <ol
          className="text-muted-foreground flex w-full flex-wrap justify-start gap-2 text-xs"
          aria-label="Progresso"
        >
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <li
              key={n}
              className={cn(
                "rounded-full px-2.5 py-0.5",
                step === n
                  ? "bg-primary/15 text-foreground font-medium"
                  : "opacity-70",
              )}
            >
              {step === n ? `${n}. ${STEP_LABELS[n]}` : `${n}/5`}
            </li>
          ))}
        </ol>
      </header>

      {actionState?.ok === false ? (
        <p className="text-destructive w-full text-sm" role="alert">
          {actionState.error}
        </p>
      ) : null}
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
              Estes dados identificam o seu negócio no NutriGestão (PDFs, e-mails
              e comunicações). Não confundir com o cadastro de clientes, que vem
              no próximo passo.
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
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!canAdvanceFromStep1()}
              onClick={() => setStep(2)}
            >
              Continuar para o cliente
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="w-full min-w-0 space-y-6">
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              Passo 2 — Cadastro do seu primeiro cliente
            </p>
            <p className="text-muted-foreground text-sm">
              Aqui você inclui o primeiro cliente da sua carteira — escola,
              hospital, empresa ou particular. Ao concluir o onboarding, este
              cadastro será salvo em{" "}
              <span className="text-foreground font-medium">Clientes</span>.
            </p>
          </div>

          <fieldset className="min-w-0 space-y-4 border-0 p-0">
            <legend className={sectionLegendClass}>
              Dados do cliente na carteira
            </legend>
            <div className="space-y-2">
              <Label htmlFor="onb-legal-name">
                {needsEstablishment
                  ? "Razão social (empresa)"
                  : "Nome do cliente (particular)"}
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
          </fieldset>

          {needsEstablishment ? (
            <>
              <div className="border-border border-t" />

              <fieldset className="min-w-0 space-y-4 border-0 p-0">
                <legend className={sectionLegendClass}>Estabelecimento</legend>
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
                  <Label htmlFor="onb-est-category">Categoria</Label>
                  <EstablishmentCategorySelect
                    id="onb-est-category"
                    value={establishmentCategory}
                    onChange={(cat) => {
                      if (!cat) {
                        setEstablishmentCategory("");
                        setEstablishmentType("");
                        return;
                      }
                      setEstablishmentCategory(cat);
                      setEstablishmentType("");
                    }}
                  />
                </div>
                {establishmentCategory !== "" ? (
                  <div className="space-y-2">
                    <Label htmlFor="onb-est-type">Tipo Cliente</Label>
                    <EstablishmentTypeSelect
                      id="onb-est-type"
                      category={establishmentCategory}
                      value={establishmentType}
                      onChange={setEstablishmentType}
                    />
                  </div>
                ) : null}
              </fieldset>

              <div className="border-border border-t" />

              <fieldset className="min-w-0 space-y-4 border-0 p-0">
                <legend className={sectionLegendClass}>Endereço</legend>
                <div className="space-y-2">
                  <Label htmlFor="onb-postal">CEP</Label>
                  <Input
                    id="onb-postal"
                    value={postalCode}
                    onChange={(e) => {
                      setPostalCode(formatCepInput(e.target.value));
                      if (cepDigits(e.target.value).length !== 8) {
                        lastFetchedCep.current = null;
                      }
                    }}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    maxLength={9}
                    aria-describedby={
                      cepError ? "onb-cep-error" : "onb-cep-hint"
                    }
                  />
                  <p
                    id="onb-cep-hint"
                    className="text-muted-foreground text-xs"
                  >
                    {cepLoading
                      ? "Buscando endereço…"
                      : "Digite o CEP para preencher o endereço automaticamente."}
                  </p>
                  {cepError ? (
                    <p
                      id="onb-cep-error"
                      className="text-destructive text-xs"
                      role="alert"
                    >
                      {cepError}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onb-addr-street">Endereço</Label>
                  <Input
                    id="onb-addr-street"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    autoComplete="street-address"
                    placeholder="Rua, avenida, logradouro"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="onb-addr-number">Número</Label>
                    <Input
                      id="onb-addr-number"
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Ex.: 123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onb-addr-complement">
                      Complemento (opcional)
                    </Label>
                    <Input
                      id="onb-addr-complement"
                      value={addressComplement}
                      onChange={(e) => setAddressComplement(e.target.value)}
                      autoComplete="off"
                      placeholder="Apto, bloco, sala"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onb-neighborhood">Bairro</Label>
                  <Input
                    id="onb-neighborhood"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="onb-city">Cidade</Label>
                    <Input
                      id="onb-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      autoComplete="address-level2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onb-uf">UF</Label>
                    <BrazilUfSelect
                      id="onb-uf"
                      value={stateUf}
                      onChange={setStateUf}
                    />
                  </div>
                </div>
              </fieldset>
            </>
          ) : null}

          <form action={skipFormAction} onReset={(e) => e.preventDefault()} className="flex flex-col gap-2">
            <input type="hidden" name="work_context" value={workContext ?? ""} />
            <input type="hidden" name="tenant_name" value={tenantCompanyName} />
            <input type="hidden" name="crn" value={crn} />
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="border-primary/70 bg-primary/8 hover:bg-primary/12 text-foreground w-full font-semibold shadow-sm"
              disabled={!workContext || isSkipPending || isPending}
            >
              {isSkipPending ? "Concluindo…" : "Preencher depois — ir ao início"}
            </Button>
            <p className="text-muted-foreground w-full text-xs leading-relaxed">
              Sem obrigatoriedade neste passo — cadastre o primeiro cliente em{" "}
              <span className="text-foreground font-medium">Clientes</span> quando
              quiser. Os dados da sua empresa do passo 1 serão salvos.
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
        <div className="w-full min-w-0 space-y-4">
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              Passo 3 — Portarias sugeridas
            </p>
            <p className="text-muted-foreground text-sm">
              Com base no cliente cadastrado no passo anterior, estas são as
              portarias do catálogo mais relevantes para você.
            </p>
          </div>
          {needsEstablishment ? (
            <>
              <p className="text-foreground text-sm font-medium">
                Portarias sugeridas para {stateUf.toUpperCase()}
                {establishmentType
                  ? ` · ${establishmentTypeLabel[establishmentType]}`
                  : null}
              </p>
              {suggestedTemplates.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Ainda não há template no catálogo para esta combinação. Você pode
                  concluir a configuração e revisar os checklists depois em{" "}
                  <span className="text-foreground font-medium">Checklists</span>.
                </p>
              ) : (
                <ul className="space-y-3" aria-label="Templates sugeridos">
                  {suggestedTemplates.map((t) => (
                    <li key={t.id}>
                      <Card className="w-full">
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
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base">Atendimento Nutricional</CardTitle>
                <CardDescription>
                  As portarias do catálogo são filtradas por estabelecimento (cliente
                  PJ). Quando você adicionar uma empresa com unidade e UF, verá as
                  sugestões em Checklists.
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-muted-foreground text-xs">
                Nos próximos passos, você revisará os dados e concluirá a
                configuração da conta.
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
        <div className="w-full min-w-0 space-y-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-base">Revise empresa e cliente</CardTitle>
              <CardDescription>
                Confira os dados da sua empresa (passo 1) e do primeiro cliente
                (passo 2). Se precisar ajustar algo, volte aos passos anteriores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OnboardingSummaryList items={summaryItems} />
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>
                Voltar
              </Button>
              <Button type="button" onClick={() => setStep(5)}>
                Tudo certo, continuar
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : null}

      {step === 5 && workContext ? (
        <form action={formAction} onReset={(e) => e.preventDefault()} className="w-full min-w-0 space-y-6">
          <OnboardingHiddenFields
            workContext={workContext}
            tenantCompanyName={tenantCompanyName}
            crn={crn}
            legalName={legalName}
            documentId={documentId}
            needsEstablishment={needsEstablishment}
            establishmentName={establishmentName}
            establishmentType={establishmentType}
            addressLine1={formattedAddress.address_line1}
            addressLine2={formattedAddress.address_line2 ?? ""}
            city={city}
            stateUf={stateUf}
            postalCode={postalCode}
          />

          <OnboardingFinishPanel
            needsEstablishment={needsEstablishment}
            legalName={legalName}
            establishmentName={establishmentName}
            nextSteps={nextSteps}
            isPending={isPending}
            onBack={() => setStep(4)}
          />
        </form>
      ) : null}
      </div>
    </div>
  );
}
