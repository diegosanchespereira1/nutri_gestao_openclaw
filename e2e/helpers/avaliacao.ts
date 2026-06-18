import type { Page } from "@playwright/test";

import { gotoNovaAvaliacao, login } from "./auth";
import { waitForLocator } from "./retry";

export type AvaliacaoTab = "infantil" | "adulto" | "idoso";

/**
 * Faz login, abre nova avaliação do paciente e ativa a aba indicada.
 * Repete a localização da aba até 3 vezes antes de falhar.
 */
export async function abrirFormularioAvaliacao(
  page: Page,
  patientId: string,
  tab: AvaliacaoTab,
): Promise<void> {
  await login(page);
  await gotoNovaAvaliacao(page, patientId);

  await waitForLocator(page.getByRole("tablist"), {
    label: "abas de avaliação",
  });

  const tabLocator = page.getByRole("tab", { name: new RegExp(tab, "i") });
  await waitForLocator(tabLocator, { label: `aba ${tab}` });
  await tabLocator.click();
}
