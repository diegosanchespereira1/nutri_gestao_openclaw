import { expect, type Page } from "@playwright/test";

import { gotoNovaAvaliacao, login } from "./auth";
import { waitForLocator } from "./retry";

export type AvaliacaoTab = "infantil" | "adulto" | "idoso";

/**
 * Âncora (campo estável) de cada formulário de avaliação, usada para confirmar
 * que o formulário está pronto — quer seja renderizado direto (categoria única)
 * quer via aba (paciente sem data de nascimento, todas as categorias visíveis).
 */
const FORM_ANCHORS: Record<AvaliacaoTab, string> = {
  infantil: "#ca-sex",
  adulto: "#adult-group",
  idoso: "#ga-group",
};

/** Aceita "Registrar" (pt-BR) e "Registar" (pt-PT). */
export const REGISTRAR_AVALIACAO_RE = /regist(?:r)?ar avaliação/i;
export const REGISTRAR_AVALIACAO_ADULTOS_RE =
  /regist(?:r)?ar avaliação \(adultos\)/i;

/**
 * Extrai o valor numérico de um CalcBox (ex.: "55,99 kg" → 55.99).
 * Retorna NaN se o valor estiver vazio ("–").
 */
export function parseCalcBoxNumber(text: string): number {
  const match = text.replace(/\s/g, "").match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return Number.NaN;
  return Number(match[0].replace(",", "."));
}

/**
 * Lê o texto principal de um CalcBox (p.font-mono) pelo rótulo.
 * Usa o parágrafo do rótulo (não a fórmula, que também pode citar "Peso Estimado").
 */
export async function getCalcBoxValue(
  page: Page,
  label: string,
): Promise<string> {
  const box = page
    .locator(".rounded-lg")
    .filter({
      has: page.locator("p").filter({ hasText: new RegExp(`^\\s*${label}\\s*$`, "i") }),
    })
    .first();
  return (await box.locator("p.font-mono").first().textContent()) ?? "";
}

/**
 * Alerta de erro do formulário (exclui o route announcer do Next.js,
 * que também usa role="alert").
 */
export function formErrorAlert(page: Page) {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}

/**
 * Confirma redirecionamento após gravar avaliação (query `avaliacao=ok`
 * e/ou banner de sucesso). Evita depender só de `role=status`, que pode
 * demorar a hidratar.
 */
export async function expectAvaliacaoSalva(
  page: Page,
  patientId: string,
): Promise<void> {
  await page.waitForURL(
    new RegExp(`/pacientes/${patientId}.*avaliacao=ok`),
    { timeout: 30_000 },
  );
  await expect(formErrorAlert(page)).toHaveCount(0);
  const status = page.getByRole("status").filter({ hasText: /registrad/i });
  if ((await status.count()) > 0) {
    await expect(status.first()).toBeVisible();
  }
}

/**
 * Preenche um input controlado React e confirma o valor.
 * Usa o setter nativo + eventos input/change — Playwright `fill`/`pressSequentially`
 * às vezes não atualiza o state de `type="number"` controlado.
 */
export async function fillAndAssert(
  page: Page,
  selector: string,
  value: string,
): Promise<void> {
  const loc = page.locator(selector);
  await loc.waitFor({ state: "visible" });
  await loc.evaluate((el, v) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await expect(loc).toHaveValue(value);
}

/**
 * Faz login, abre nova avaliação do paciente e garante que o formulário da
 * categoria indicada está visível.
 *
 * Layout atual: quando o paciente pertence a uma única categoria etária, o
 * formulário é renderizado direto (sem tablist). Só existe tablist quando o
 * paciente não tem data de nascimento e todas as categorias ficam visíveis —
 * nesse caso, ativamos a aba correspondente.
 */
export async function abrirFormularioAvaliacao(
  page: Page,
  patientId: string,
  tab: AvaliacaoTab,
): Promise<void> {
  await login(page);
  await gotoNovaAvaliacao(page, patientId);

  // Se houver abas (paciente multi-categoria), ativa a aba correspondente.
  const tabLocator = page.getByRole("tab", { name: new RegExp(tab, "i") });
  if ((await tabLocator.count()) > 0) {
    await tabLocator.first().click().catch(() => {});
  }

  // Aguarda o formulário da categoria estar pronto (direto ou via aba).
  await waitForLocator(page.locator(FORM_ANCHORS[tab]), {
    label: `formulário ${tab}`,
  });
}
