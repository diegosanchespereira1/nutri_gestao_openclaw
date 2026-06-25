import type { EnabledModuleKey, EnabledModules } from "@/lib/types/modules";
import { ENABLED_MODULE_LABELS } from "@/lib/types/modules";

const MODULE_PATH_RULES: Array<{
  prefix: string;
  gate: EnabledModuleKey;
}> = [
  { prefix: "/visitas", gate: "visitas" },
  { prefix: "/financeiro", gate: "financeiro" },
  { prefix: "/pacientes", gate: "atendimento_nutricional" },
  { prefix: "/checklists", gate: "assessoria_alimentacao" },
  { prefix: "/pops", gate: "assessoria_alimentacao" },
  { prefix: "/ficha-tecnica", gate: "assessoria_alimentacao" },
];

export const MODULE_BLOCKED_QUERY_PARAM = "modulo_bloqueado";

/** Bloqueia rotas quando o módulo correspondente está desabilitado no tenant. */
export function isPathAllowedForEnabledModules(
  pathname: string,
  modules: EnabledModules,
): boolean {
  const gate = getModuleGateForPath(pathname);
  if (!gate) return true;
  return modules[gate] === true;
}

/** Retorna a chave do módulo que controla a rota, ou null se não houver gate. */
export function getModuleGateForPath(pathname: string): EnabledModuleKey | null {
  for (const rule of MODULE_PATH_RULES) {
    if (
      pathname === rule.prefix ||
      pathname.startsWith(`${rule.prefix}/`)
    ) {
      return rule.gate;
    }
  }
  return null;
}

export function getModuleLabel(moduleKey: EnabledModuleKey): string {
  return ENABLED_MODULE_LABELS[moduleKey];
}

export function buildModuleBlockedInicioPath(
  moduleKey: EnabledModuleKey,
): string {
  return `/inicio?${MODULE_BLOCKED_QUERY_PARAM}=${moduleKey}`;
}
