/**
 * Módulos funcionais da plataforma NutriGestão.
 *
 * Cada módulo é uma funcionalidade paga que o super_admin habilita
 * por tenant via `profiles.enabled_modules`.
 */

export type ModuleContext =
  | "atendimento_nutricional"
  | "assessoria_alimentacao";

export type EnabledModules = {
  atendimento_nutricional: boolean;
  assessoria_alimentacao: boolean;
};

/** Ambos os módulos habilitados — usado como fallback quando a coluna ainda não existe. */
export const DEFAULT_ENABLED_MODULES: EnabledModules = {
  atendimento_nutricional: true,
  assessoria_alimentacao: true,
};

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
  };
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
