import type { Locator } from "@playwright/test";

export type RetryOptions = {
  /** Número de tentativas (padrão: 3). */
  attempts?: number;
  /** Pausa entre tentativas em ms (padrão: 1000). */
  delayMs?: number;
  /** Timeout por tentativa em ms (padrão: 15000). */
  timeoutMs?: number;
  /** Rótulo para mensagens de erro. */
  label?: string;
};

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_DELAY_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 15_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa `fn` até obter um valor truthy ou esgotar as tentativas.
 * Útil para setup (beforeAll) e descoberta de dados na UI.
 */
export async function retryUntil<T>(
  fn: (attempt: number) => Promise<T | null | undefined | false>,
  options: RetryOptions = {},
): Promise<T | null> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const label = options.label ?? "ação";

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await fn(attempt);
      if (result !== null && result !== undefined && result !== false) {
        return result;
      }
      if (attempt === attempts) return null;
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;
    }
    await sleep(options.delayMs ?? DEFAULT_DELAY_MS);
  }

  throw (
    lastError ??
    new Error(`Falha em "${label}" após ${attempts} tentativa(s).`)
  );
}

/**
 * Aguarda um locator ficar visível (ou attached), repetindo até `attempts` vezes.
 */
export async function waitForLocator(
  locator: Locator,
  options: RetryOptions & { state?: "visible" | "attached" } = {},
): Promise<Locator> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const state = options.state ?? "visible";
  const label = options.label ?? "elemento";

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await locator.waitFor({ state, timeout: timeoutMs });
      return locator;
    } catch (err) {
      lastError = err;
      if (attempt < attempts) await sleep(delayMs);
    }
  }

  throw (
    lastError ??
    new Error(
      `Não foi possível localizar "${label}" após ${attempts} tentativa(s).`,
    )
  );
}
