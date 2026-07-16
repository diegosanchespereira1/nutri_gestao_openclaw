"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Mail, Send } from "lucide-react";

import { createTenantAsAdminAction } from "@/lib/actions/admin-platform";
import { buildCreateTenantSummary } from "@/lib/admin/build-create-tenant-summary";
import type { CreateTenantSummary } from "@/lib/admin/build-create-tenant-summary";
import {
  clearTenantCreateFormDraft,
  loadTenantCreateFormDraft,
  restoreTenantCreateForm,
  saveTenantCreateFormDraft,
} from "@/lib/admin/tenant-create-form-draft";
import { AdminFormSectionCard } from "@/components/admin/admin-form-section-card";
import { CreateTenantConfirmDialog } from "@/components/admin/create-tenant-confirm-dialog";
import {
  CreateTenantModulesSection,
} from "@/components/admin/create-tenant-modules-section";
import {
  CreateTenantSubscriptionSection,
  type CreateTenantPlanOption,
} from "@/components/admin/create-tenant-subscription-section";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Identificação" },
  { n: 2, label: "Módulos" },
  { n: 3, label: "Plano" },
  { n: 4, label: "Acesso" },
] as const;

type Step = 1 | 2 | 3 | 4;

const SERVER_ERR_MESSAGES: Record<string, string> = {
  invalid: "Nome da empresa e email são obrigatórios.",
  modules:
    "Selecione pelo menos um módulo de atividade (Atendimento Nutricional ou Assessoria em Serviços de Alimentação).",
  exists: "Já existe uma conta com este email.",
  create: "Não foi possível criar a conta. Tente novamente.",
  server_config:
    "Configuração do servidor incompleta. Contacte o administrador da plataforma.",
};

type Props = {
  plans: CreateTenantPlanOption[];
  serverError?: string | null;
};

function validateStep1(form: HTMLFormElement): string | null {
  const fullName = (
    form.elements.namedItem("full_name") as HTMLInputElement | null
  )?.value.trim();
  const email = (
    form.elements.namedItem("email") as HTMLInputElement | null
  )?.value.trim();
  const password = (
    form.elements.namedItem("password") as HTMLInputElement | null
  )?.value;

  if (!fullName || !email) {
    return "Nome da empresa e email são obrigatórios.";
  }
  if (password && password.length > 0 && password.length < 12) {
    return "A senha deve ter pelo menos 12 caracteres.";
  }
  return null;
}

function validateStep2(form: HTMLFormElement): string | null {
  const atendimento = form.querySelector<HTMLInputElement>(
    'input[name="module_atendimento_nutricional"][type="checkbox"]',
  )?.checked;
  const assessoria = form.querySelector<HTMLInputElement>(
    'input[name="module_assessoria_alimentacao"][type="checkbox"]',
  )?.checked;

  if (!atendimento && !assessoria) {
    return "Selecione pelo menos um módulo de atividade (Atendimento Nutricional ou Assessoria em Serviços de Alimentação).";
  }
  return null;
}

function stepForValidationError(message: string): Step {
  if (message.includes("módulo de atividade")) return 2;
  if (message.includes("plano")) return 3;
  return 1;
}

export function CreateTenantWizard({ plans, serverError }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<CreateTenantSummary | null>(null);
  const [restoredPlanSlug, setRestoredPlanSlug] = useState("free");
  const [formRestoreVersion, setFormRestoreVersion] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!serverError) {
      clearTenantCreateFormDraft();
      return;
    }

    const raw = loadTenantCreateFormDraft();
    const form = formRef.current;
    if (!raw || !form) return;

    restoreTenantCreateForm(form, raw);

    const planSlug = (
      form.elements.namedItem("plan_slug") as HTMLInputElement | null
    )?.value;
    // Sincroniza estado local com o rascunho salvo após erro do servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (planSlug) setRestoredPlanSlug(planSlug);

    setFormRestoreVersion((version) => version + 1);
    setStep(4);
    setStepError(
      SERVER_ERR_MESSAGES[serverError] ??
        "Não foi possível criar a conta. Os dados foram restaurados.",
    );
  }, [serverError]);

  function showValidationError(message: string) {
    setStepError(message);
    setStep(stepForValidationError(message));
    setConfirmOpen(false);
  }

  function goToStep(target: Step) {
    if (target < step) {
      setStepError(null);
      setStep(target);
    }
  }

  function goNext() {
    const form = formRef.current;
    if (!form) return;

    setStepError(null);

    if (step === 1) {
      const err = validateStep1(form);
      if (err) {
        setStepError(err);
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const err = validateStep2(form);
      if (err) {
        setStepError(err);
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (plans.length === 0) {
        setStepError(
          "Nenhum plano ativo disponível. Configure os planos antes de continuar.",
        );
        return;
      }
      setStep(4);
    }
  }

  function goBack() {
    setStepError(null);
    if (step > 1) setStep((step - 1) as Step);
  }

  function validateAllSteps(form: HTMLFormElement): string | null {
    return validateStep1(form) ?? validateStep2(form);
  }

  function openConfirmDialog() {
    const form = formRef.current;
    if (!form) return;

    setStepError(null);
    const err = validateAllSteps(form);
    if (err) {
      showValidationError(err);
      return;
    }

    if (plans.length === 0) {
      showValidationError(
        "Nenhum plano ativo disponível. Configure os planos antes de continuar.",
      );
      return;
    }

    const built = buildCreateTenantSummary(form, plans);
    if (!built) {
      showValidationError("Nome da empresa e email são obrigatórios.");
      return;
    }

    setSummary(built);
    setConfirmOpen(true);
  }

  function handleConfirmCreate() {
    const form = formRef.current;
    if (!form) return;

    const err = validateAllSteps(form);
    if (err) {
      showValidationError(err);
      return;
    }

    saveTenantCreateFormDraft(form);
    setConfirmOpen(false);
    form.requestSubmit();
  }

  return (
    <>
    <form
      ref={formRef}
      action={createTenantAsAdminAction}
      className="w-full min-w-0 space-y-6"
      noValidate
    >
      <nav aria-label="Etapas de criação do tenant">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((item) => {
            const isActive = step === item.n;
            const isComplete = step > item.n;
            const canNavigate = isComplete;

            return (
              <li key={item.n}>
                <button
                  type="button"
                  onClick={() => canNavigate && goToStep(item.n as Step)}
                  disabled={!canNavigate && !isActive}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    isActive &&
                      "bg-primary/15 text-foreground ring-1 ring-primary/20",
                    isComplete &&
                      "text-foreground hover:bg-muted/60 cursor-pointer",
                    !isActive &&
                      !isComplete &&
                      "text-muted-foreground cursor-default opacity-60",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="text-muted-foreground mr-1">{item.n}.</span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-muted-foreground mt-3 text-sm">
          Etapa {step} de {STEPS.length} —{" "}
          {STEPS.find((s) => s.n === step)?.label}
        </p>
      </nav>

      {stepError ? (
        <p className="text-destructive text-sm" role="alert">
          {stepError}
        </p>
      ) : null}

      <div className={cn(step !== 1 && "hidden")} aria-hidden={step !== 1}>
        <AdminFormSectionCard
          title="Identificação"
          description="Dados principais da empresa e credenciais de acesso inicial."
          icon={Building2}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="full_name">Nome da empresa</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Clínica NutriVida"
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="contato@clinica.com.br"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Senha inicial{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mín. 12 caracteres"
                autoComplete="new-password"
              />
            </div>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Se a senha ficar em branco, uma senha aleatória é gerada. O cliente
            pode usar &ldquo;Esqueci a senha&rdquo; para definir a sua.
          </p>
        </AdminFormSectionCard>
      </div>

      <div className={cn(step !== 2 && "hidden")} aria-hidden={step !== 2}>
        <CreateTenantModulesSection />
      </div>

      <div className={cn(step !== 3 && "hidden")} aria-hidden={step !== 3}>
        <CreateTenantSubscriptionSection
          key={`subscription-${formRestoreVersion}`}
          plans={plans}
          defaultPlanSlug={restoredPlanSlug}
        />
      </div>

      <div className={cn(step !== 4 && "hidden")} aria-hidden={step !== 4}>
        <AdminFormSectionCard
          title="Acesso inicial"
          description="Comunicação com o cliente após a criação da conta."
          icon={Mail}
        >
          <label
            htmlFor="send_invite"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
              "hover:bg-muted/40",
              "has-[:checked]:border-primary has-[:checked]:bg-primary/5",
            )}
          >
            <input
              id="send_invite"
              name="send_invite"
              type="checkbox"
              value="true"
              defaultChecked
              className="mt-1 size-4 rounded border-input"
            />
            <div className="min-w-0 space-y-1">
              <span className="text-foreground flex items-center gap-2 text-sm font-medium">
                <Send className="size-3.5" aria-hidden />
                Enviar email de confirmação
              </span>
              <span className="text-muted-foreground block text-xs leading-relaxed">
                O cliente recebe um link para ativar a conta e definir o acesso.
              </span>
            </div>
          </label>
        </AdminFormSectionCard>
      </div>

      <div className="bg-card sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-xl p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs sm:max-w-md">
          {step < 4
            ? "Avance etapa a etapa. Pode voltar para revisar informações anteriores."
            : "Revise os dados e confirme a criação da conta."}
        </p>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {step === 1 ? (
            <Link
              href="/admin/tenants"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Cancelar
            </Link>
          ) : (
            <Button type="button" variant="outline" onClick={goBack}>
              Voltar
            </Button>
          )}
          {step < 4 ? (
            <Button type="button" onClick={goNext} className="min-w-[120px]">
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              className="min-w-[132px]"
              onClick={openConfirmDialog}
            >
              Criar conta
            </Button>
          )}
        </div>
      </div>
    </form>

    <CreateTenantConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      summary={summary}
      onConfirm={handleConfirmCreate}
    />
    </>
  );
}
