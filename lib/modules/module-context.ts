/**
 * Parser seguro de contexto de módulo para parâmetros de URL.
 *
 * SEGURANÇA: esta função é a única entrada de dados de módulo vindos
 * do browser. Usa whitelist estrita — qualquer valor não reconhecido
 * retorna null. O valor resultante (ModuleContext | null) é o único
 * tipo permitido em queries ao Supabase; o raw string NUNCA é
 * interpolado em SQL ou passado diretamente ao banco.
 */

import type { ModuleContext } from "@/lib/types/modules";

/**
 * Aliases aceitos no parâmetro `?modulo=` da URL.
 * Chaves em minúsculas, sem espaços — nunca expostas ao banco.
 */
const PARAM_ALIAS: Readonly<Record<string, ModuleContext>> = {
  an: "atendimento_nutricional",
  aa: "assessoria_alimentacao",
  atendimento_nutricional: "atendimento_nutricional",
  assessoria_alimentacao: "assessoria_alimentacao",
};

/**
 * Converte o parâmetro `?modulo=` de uma URL em ModuleContext.
 *
 * Retorna null para qualquer valor não reconhecido — incluindo strings
 * vazias, injeções SQL, e valores arbitrários — garantindo que nunca
 * chegue um valor não-validado ao banco de dados.
 *
 * @example
 *   parseModuleContextParam("an")   // → "atendimento_nutricional"
 *   parseModuleContextParam("aa")   // → "assessoria_alimentacao"
 *   parseModuleContextParam("'; DROP TABLE profiles; --") // → null
 *   parseModuleContextParam(undefined) // → null
 */
export function parseModuleContextParam(
  raw: string | string[] | undefined,
): ModuleContext | null {
  if (!raw || Array.isArray(raw)) return null;
  const normalized = raw.trim().toLowerCase();
  return PARAM_ALIAS[normalized] ?? null;
}

/**
 * Converte um ModuleContext em alias curto para usar em URLs.
 * Útil para construir links: moduleContextToParam("atendimento_nutricional") → "an"
 */
export function moduleContextToParam(ctx: ModuleContext): string {
  return ctx === "atendimento_nutricional" ? "an" : "aa";
}

/**
 * Retorna true se o raw param representa um ModuleContext válido.
 * Usar para guards sem precisar checar null.
 */
export function isValidModuleContextParam(
  raw: string | string[] | undefined,
): boolean {
  return parseModuleContextParam(raw) !== null;
}
