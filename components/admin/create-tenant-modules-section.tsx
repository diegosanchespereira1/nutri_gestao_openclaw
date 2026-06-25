"use client";

import { useCallback, useState } from "react";
import {
  AlertCircle,
  ClipboardList,
  HeartPulse,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { AdminFormSectionCard } from "@/components/admin/admin-form-section-card";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_ENABLED_MODULES,
  ENABLED_MODULE_DESCRIPTIONS,
  ENABLED_MODULE_LABELS,
  TENANT_MODULE_GROUPS,
  enabledModuleFieldName,
  type EnabledModuleKey,
  type ModuleContext,
} from "@/lib/types/modules";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<EnabledModuleKey, LucideIcon> = {
  atendimento_nutricional: HeartPulse,
  assessoria_alimentacao: UtensilsCrossed,
  visitas: ClipboardList,
  financeiro: Wallet,
};

const ACTIVITY_MODULE_KEYS: ModuleContext[] = [
  "atendimento_nutricional",
  "assessoria_alimentacao",
];

function ModuleToggleCard({
  moduleKey,
  defaultChecked = true,
  onCheckedChange,
}: {
  moduleKey: EnabledModuleKey;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const fieldName = enabledModuleFieldName(moduleKey);
  const id = fieldName;
  const Icon = MODULE_ICONS[moduleKey];

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
        "hover:bg-muted/40",
        "has-[:checked]:border-primary has-[:checked]:bg-primary/5",
        "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
      )}
    >
      <input type="hidden" name={fieldName} value="false" />
      <input
        id={id}
        name={fieldName}
        type="checkbox"
        value="true"
        defaultChecked={defaultChecked}
        className="peer sr-only"
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      <div className="bg-muted text-muted-foreground peer-checked:bg-primary/15 peer-checked:text-primary flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 space-y-1">
        <span className="text-foreground block text-sm font-medium">
          {ENABLED_MODULE_LABELS[moduleKey]}
        </span>
        <span className="text-muted-foreground block text-xs leading-relaxed">
          {ENABLED_MODULE_DESCRIPTIONS[moduleKey]}
        </span>
      </div>
    </label>
  );
}

function ActivityModulesGroup({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const [hasActivityModule, setHasActivityModule] = useState(
    ACTIVITY_MODULE_KEYS.some((key) => DEFAULT_ENABLED_MODULES[key]),
  );

  const syncActivitySelection = useCallback(() => {
    const anySelected = ACTIVITY_MODULE_KEYS.some((key) => {
      const input = document.getElementById(
        enabledModuleFieldName(key),
      ) as HTMLInputElement | null;
      return input?.checked === true;
    });
    setHasActivityModule(anySelected);
  }, []);

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl p-3 transition-colors",
        !hasActivityModule && "bg-destructive/5 ring-1 ring-destructive/30",
      )}
      role="group"
      aria-labelledby="activity-modules-heading"
      aria-describedby="activity-modules-requirement"
    >
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p
            id="activity-modules-heading"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {title}
          </p>
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
          >
            Obrigatório: pelo menos 1
          </Badge>
        </div>
        <p id="activity-modules-requirement" className="text-muted-foreground text-sm">
          {description}
        </p>
      </div>

      {!hasActivityModule ? (
        <p
          className="text-destructive flex items-start gap-2 text-sm"
          role="status"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Selecione pelo menos um módulo de atividade para continuar.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs" role="status">
          Pode activar os dois se o cliente usar ambos os contextos.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {ACTIVITY_MODULE_KEYS.map((key) => (
          <ModuleToggleCard
            key={key}
            moduleKey={key}
            defaultChecked={DEFAULT_ENABLED_MODULES[key]}
            onCheckedChange={syncActivitySelection}
          />
        ))}
      </div>
    </div>
  );
}

export function CreateTenantModulesSection() {
  const optionalGroup = TENANT_MODULE_GROUPS.find(
    (group) => group.title === "Funcionalidades opcionais",
  );
  const activityGroup = TENANT_MODULE_GROUPS.find(
    (group) => group.title === "Módulos de atividade",
  );

  return (
    <AdminFormSectionCard
      title="Módulos e funcionalidades"
      description="Defina o perfil de atividade do cliente e quais áreas da plataforma ficam disponíveis."
      icon={HeartPulse}
    >
      <div className="space-y-6">
        {activityGroup ? (
          <ActivityModulesGroup
            title={activityGroup.title}
            description={activityGroup.description}
          />
        ) : null}

        {optionalGroup ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {optionalGroup.title}
              </p>
              <p className="text-muted-foreground text-sm">
                {optionalGroup.description}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {optionalGroup.keys.map((key) => (
                <ModuleToggleCard
                  key={key}
                  moduleKey={key}
                  defaultChecked={DEFAULT_ENABLED_MODULES[key]}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </AdminFormSectionCard>
  );
}
