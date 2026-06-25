/**
 * Módulos funcionais da plataforma NutriGestão.
 *
 * Cada módulo é uma funcionalidade paga que o super_admin habilita
 * por tenant via `profiles.enabled_modules`.
 */

export type ModuleContext =
  | "atendimento_nutricional"
  | "assessoria_alimentacao";

export type OptionalModuleKey = "visitas" | "financeiro";

export type EnabledModuleKey = ModuleContext | OptionalModuleKey;

export type EnabledModules = Record<EnabledModuleKey, boolean>;

/** Todos os módulos habilitados — fallback quando a coluna ainda não existe. */
export const DEFAULT_ENABLED_MODULES: EnabledModules = {
  atendimento_nutricional: true,
  assessoria_alimentacao: true,
  visitas: true,
  financeiro: true,
};

export const ENABLED_MODULE_KEYS: EnabledModuleKey[] = [
  "atendimento_nutricional",
  "assessoria_alimentacao",
  "visitas",
  "financeiro",
];

export const ENABLED_MODULE_LABELS: Record<EnabledModuleKey, string> = {
  atendimento_nutricional: "Atendimento Nutricional",
  assessoria_alimentacao: "Assessoria em Serviços de Alimentação",
  visitas: "Visitas",
  financeiro: "Financeiro",
};

export const ENABLED_MODULE_DESCRIPTIONS: Record<EnabledModuleKey, string> = {
  atendimento_nutricional:
    "Pacientes, prontuários e fluxos de atendimento clínico.",
  assessoria_alimentacao:
    "Checklists, POPs e ficha técnica em estabelecimentos.",
  visitas: "Agenda, registo e acompanhamento de visitas técnicas.",
  financeiro: "Cobranças, contratos e painel financeiro.",
};

export const TENANT_MODULE_GROUPS: Array<{
  title: string;
  description: string;
  keys: EnabledModuleKey[];
}> = [
  {
    title: "Módulos de atividade",
    description:
      "Defina o foco principal do cliente. Pelo menos um módulo de atividade deve ficar ativo.",
    keys: ["atendimento_nutricional", "assessoria_alimentacao"],
  },
  {
    title: "Funcionalidades opcionais",
    description:
      "Podem ser ligadas ou desligadas independentemente dos módulos de atividade.",
    keys: ["visitas", "financeiro"],
  },
];

export const MODULE_LABELS: Record<ModuleContext, string> = {
  atendimento_nutricional: "Atendimento Nutricional",
  assessoria_alimentacao: "Assessoria em Serviços de Alimentação",
};

export const MODULE_SHORT_LABELS: Record<ModuleContext, string> = {
  atendimento_nutricional: "Atendimento Nutricional",
  assessoria_alimentacao: "Assessoria Alimentar",
};

/** Retorna true se o ModuleContext fornecido é válido (whitelist). */
export function isModuleContext(value: unknown): value is ModuleContext {
  return (
    value === "atendimento_nutricional" || value === "assessoria_alimentacao"
  );
}

/**
 * Converte o JSONB `enabled_modules` da tabela `profiles` em EnabledModules.
 *
 * Seguro contra qualquer input: null, undefined, objeto malformado ou JSONB
 * arbitrário resultam em DEFAULT_ENABLED_MODULES (ambos habilitados).
 * Isso garante retrocompatibilidade enquanto a coluna não existir no banco.
 */
export function parseEnabledModules(raw: unknown): EnabledModules {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_ENABLED_MODULES };
  }
  const obj = raw as Record<string, unknown>;
  return {
    // Desabilita apenas se explicitamente `false`; qualquer outro valor = habilitado
    atendimento_nutricional: obj["atendimento_nutricional"] !== false,
    assessoria_alimentacao: obj["assessoria_alimentacao"] !== false,
    visitas: obj["visitas"] !== false,
    financeiro: obj["financeiro"] !== false,
  };
}

export function enabledModuleFieldName(key: EnabledModuleKey): string {
  return `module_${key}`;
}

/** Lê checkboxes do formulário de criação/edição de tenant (hidden=false + checkbox=true). */
export function parseEnabledModulesFromForm(formData: FormData): EnabledModules {
  const modules = {} as EnabledModules;
  for (const key of ENABLED_MODULE_KEYS) {
    const fieldName = enabledModuleFieldName(key);
    const values = formData
      .getAll(fieldName)
      .map((value) => String(value));
    // hidden=false vem antes do checkbox; get() só leria o primeiro.
    modules[key] = values.includes("true");
  }
  return modules;
}

/** Retorna true se pelo menos um módulo está habilitado. */
export function hasAnyModuleEnabled(modules: EnabledModules): boolean {
  return modules.atendimento_nutricional || modules.assessoria_alimentacao;
}

/** Retorna a lista de ModuleContext habilitados. */
export function enabledModulesList(modules: EnabledModules): ModuleContext[] {
  const result: ModuleContext[] = [];
  if (modules.atendimento_nutricional) result.push("atendimento_nutricional");
  if (modules.assessoria_alimentacao) result.push("assessoria_alimentacao");
  return result;
}
